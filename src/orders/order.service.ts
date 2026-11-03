import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../admin/audit.service';
import { RazorpayService } from '../payments/razorpay.service';
import {
  CreateOrderDto,
  OrderLookupDto,
  CancelRequestDto,
  ReportIssueDto,
  VerifyPaymentDto,
  UpdateOrderStatusDto,
  ListOrdersQueryDto,
} from './dto/order.dto';
import {
  ListAdminOrdersQueryDto,
  CreateRefundDto,
} from './dto/admin-order.dto';
import { toNumber } from '../catalog/catalog.helpers';

export interface Actor {
  id: string;
  ip?: string;
}

/** Generic error used for every lookup failure — prevents order enumeration. */
const ORDER_NOT_FOUND = 'Order not found';

/** Allowed status transitions (validated on every admin status change). */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['received', 'cancelled'],
  received: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['issue_reported'],
  issue_reported: ['cancelled'],
  cancelled: [],
};

/** Customer cancellation is allowed only before the parcel is shipped. */
const CANCELLABLE_STATUSES = ['pending', 'received', 'packed'];

/** Issues must be reported within 48 hours of delivery. */
const ISSUE_WINDOW_MS = 48 * 60 * 60 * 1000;

const FREE_SHIPPING_FEE = 0; // free shipping on every AQ order

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly razorpay: RazorpayService,
  ) {}

  // ------------------------------- checkout --------------------------------

  /**
   * Guest/prepaid checkout.
   *
   * Accepts ONLY variant ids, quantities, coupon code and delivery details.
   * All money is recomputed from the database in integer paise — client
   * prices/totals are ignored. Stock is decremented atomically inside the
   * transaction (conditional update = row lock), and the Idempotency-Key
   * header makes double-clicks replay the same order.
   *
   * The order stays `pending` until the Razorpay payment is verified — it is
   * never confirmed before money is captured.
   */
  async createOrder(
    dto: CreateOrderDto,
    idempotencyKey: string,
    actor: Actor,
    userId?: string,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException('Order must contain at least one line item');
    }

    // Idempotent replay: same key → same order, no second stock hit.
    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey },
      include: { items: true, payment: true },
    });
    if (existing) {
      return {
        data: await this.toCheckoutResponse(existing),
        message: 'Order fetched (idempotent replay)',
      };
    }

    // Coupon (case-insensitive) — resolved before the transaction so a bad
    // code fails fast without touching stock.
    const coupon = dto.couponCode
      ? await this.findValidCoupon(dto.couponCode.trim())
      : null;

    // Load every variant with its product + stock (read phase).
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: [...new Set(dto.items.map((i) => i.variantId))] } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            status: true,
            isDeleted: true,
            taxPercent: true,
            hsnCode: true,
          },
        },
        inventory: { select: { quantity: true } },
      },
    });
    const byId = new Map(variants.map((v) => [v.id, v]));

    for (const item of dto.items) {
      const variant = byId.get(item.variantId);
      if (!variant) {
        throw new NotFoundException(`Variant "${item.variantId}" not found`);
      }
      if (variant.product.status !== 'active' || variant.product.isDeleted) {
        throw new BadRequestException(
          `\"${variant.product.name}\" is not available right now`,
        );
      }
    }

    // ---- money math (integer paise, server-side only) ----
    const lines = dto.items.map((item) => {
      const variant = byId.get(item.variantId)!;
      const unitPaise = variant.price; // Int paise
      const taxPercent = toNumber(variant.product.taxPercent);
      const lineSubtotal = unitPaise * item.quantity;
      const lineTax = Math.round((lineSubtotal * taxPercent) / 100);
      return {
        variant,
        quantity: item.quantity,
        unitPaise,
        taxPercent,
        lineSubtotal,
        lineTax,
      };
    });

    const subtotal = lines.reduce((s, l) => s + l.lineSubtotal, 0);
    const rawTax = lines.reduce((s, l) => s + l.lineTax, 0);

    let discount = 0;
    if (coupon) {
      discount =
        coupon.discountType === 'percentage'
          ? Math.round((subtotal * coupon.value) / 100)
          : Math.min(coupon.value, subtotal);
      if (discount > subtotal) discount = subtotal;
    }
    // Tax is reduced proportionally by the discount.
    const tax =
      subtotal > 0 ? Math.round((rawTax * (subtotal - discount)) / subtotal) : 0;
    const shippingFee = FREE_SHIPPING_FEE;
    const total = subtotal - discount + tax + shippingFee;
    if (total <= 0) {
      throw new BadRequestException('Order total must be greater than zero');
    }

    // ---- create order + hold stock, retrying only on order-number clash ----
    let order;
    for (let attempt = 0; attempt < 5; attempt++) {
      const orderNumber = this.generateOrderNumber();
      try {
        order = await this.prisma.$transaction(async (tx) => {
          const newOrder = await tx.order.create({
            data: {
              orderNumber,
              idempotencyKey,
              userId: userId ?? null,
              customerName: dto.customer.name.trim(),
              customerPhone: this.normalizePhone(dto.customer.phone),
              customerEmail: dto.customer.email?.trim().toLowerCase() ?? null,
              addressLine1: dto.address.line1.trim(),
              addressLine2: dto.address.line2?.trim() || null,
              city: dto.address.city.trim(),
              state: dto.address.state.trim(),
              pincode: dto.address.pincode,
              subtotal,
              discount,
              shippingFee,
              tax,
              total,
              couponCode: coupon?.code ?? null,
              status: 'pending',
              paymentStatus: 'pending',
              items: {
                create: lines.map((l) => ({
                  variantId: l.variant.id,
                  productName: l.variant.product.name,
                  variantName: l.variant.name,
                  sku: l.variant.sku,
                  quantity: l.quantity,
                  priceAtPurchase: l.unitPaise,
                  taxPercentAtPurchase: l.taxPercent,
                  hsnCodeAtPurchase: l.variant.product.hsnCode ?? null,
                })),
              },
              statusHistory: {
                create: {
                  status: 'pending',
                  notes: 'Order created — awaiting payment',
                },
              },
              payment: {
                create: { amount: total, status: 'pending' },
              },
            },
            include: { items: true, payment: true },
          });

          // Atomic stock hold: the conditional updateMany only decrements when
          // enough stock remains (row-level lock inside the transaction).
          for (const l of lines) {
            const updated = await tx.inventory.updateMany({
              where: {
                variantId: l.variant.id,
                quantity: { gte: l.quantity },
              },
              data: { quantity: { decrement: l.quantity } },
            });
            if (updated.count === 0) {
              throw new ConflictException(
                `\"${l.variant.product.name}\" (${l.variant.name}) does not have enough stock`,
              );
            }
          }

          return newOrder;
        });
        break;
      } catch (err) {
        if (this.isUniqueViolation(err, 'orderNumber') && attempt < 4) {
          continue; // collision on AQ-YYMMDD-#### → regenerate
        }
        if (this.isUniqueViolation(err, 'idempotencyKey')) {
          // Concurrent double-click: the other request won — return its order.
          const winner = await this.prisma.order.findUnique({
            where: { idempotencyKey },
            include: { items: true, payment: true },
          });
          if (winner) {
            return {
              data: await this.toCheckoutResponse(winner),
              message: 'Order fetched (idempotent replay)',
            };
          }
        }
        throw err;
      }
    }
    if (!order) {
      throw new ConflictException('Could not allocate an order number, please retry');
    }

    // Start the Razorpay payment session (outside the DB transaction).
    let razorpayOrderId: string | null = null;
    try {
      const rp = await this.razorpay.createOrder(total, order.orderNumber, {
        orderNumber: order.orderNumber,
        phone: order.customerPhone,
      });
      razorpayOrderId = rp.razorpayOrderId;
      await this.prisma.payment.update({
        where: { orderId: order.id },
        data: { razorpayOrderId },
      });
      order.payment = { ...order.payment!, razorpayOrderId };
    } catch (err) {
      // Gateway unavailable → release the stock hold so it is not stranded.
      await this.releaseStock(order.id);
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'cancelled', cancelReason: 'Payment gateway unavailable' },
      });
      throw err;
    }

    await this.audit.log({
      adminId: actor.id,
      action: 'order.create',
      entity: 'Order',
      entityId: order.id,
      metadata: { orderNumber: order.orderNumber, total, itemCount: lines.length },
      ipAddress: actor.ip,
    });

    return {
      data: await this.toCheckoutResponse(order),
      message: 'Order created — awaiting payment',
    };
  }

  /**
   * Verifies the Razorpay Checkout callback and confirms the order.
   * Only a valid HMAC signature moves the order to `received`.
   */
  async verifyPayment(dto: VerifyPaymentDto, actor: Actor) {
    const payment = await this.prisma.payment.findFirst({
      where: { razorpayOrderId: dto.razorpayOrderId },
      include: { order: { include: { items: true } } },
    });
    if (!payment) throw new NotFoundException(ORDER_NOT_FOUND);

    const valid = this.razorpay.verifyPaymentSignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
    if (!valid) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed', failureReason: 'Invalid signature' },
      });
      throw new UnauthorizedException('Payment verification failed');
    }

    const order = await this.confirmPaidOrder(
      payment.orderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
      payment.method ?? 'card',
    );

    await this.audit.log({
      adminId: actor.id,
      action: 'payment.verify',
      entity: 'Order',
      entityId: payment.orderId,
      metadata: { razorpayPaymentId: dto.razorpayPaymentId },
      ipAddress: actor.ip,
    });

    return {
      data: this.toOrderPublic(order),
      message: 'Payment verified — order confirmed',
    };
  }

  /**
   * Razorpay webhook (source of truth for payment state).
   * `payment.captured` confirms the order; `payment.failed` marks failure.
   * Signature is verified against the raw body.
   */
  async handleWebhook(
    rawBody: Buffer,
    signature: string | undefined,
    actor: Actor,
  ) {
    if (!signature || !this.razorpay.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    let event: {
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
            method?: string;
            error_description?: string;
          };
        };
      };
    };
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const entity = event.payload?.payment?.entity;
    if (!entity?.order_id) return { data: null, message: 'Ignored' };

    const payment = await this.prisma.payment.findFirst({
      where: { orderId: entity.order_id },
    });
    if (!payment) return { data: null, message: 'Ignored' };

    if (event.event === 'payment.captured') {
      await this.confirmPaidOrder(
        payment.orderId,
        entity.id ?? 'unknown',
        'webhook',
        (entity.method as 'card' | 'upi' | 'netbanking' | 'wallet') ?? 'card',
      );
      return { data: null, message: 'Order confirmed' };
    }

    if (event.event === 'payment.failed') {
      if (payment.status !== 'captured') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'failed',
            failureReason: entity.error_description ?? 'Payment failed',
          },
        });
        await this.prisma.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: 'failed' },
        });
      }
      return { data: null, message: 'Payment failure recorded' };
    }

    return { data: null, message: 'Ignored' };
  }

  // ---------------------------- customer lookup ----------------------------

  /**
   * Order lookup by order number + phone. Any mismatch (unknown number or
   * wrong phone) returns the identical generic error — no enumeration.
   */
  async lookup(dto: OrderLookupDto) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber: dto.orderIdOrTracking.trim().toUpperCase() },
      include: {
        items: true,
        payment: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });
    const phoneMatches = this.normalizePhone(dto.phone) === order?.customerPhone;
    if (!order || !phoneMatches) {
      // Identical error for "no such order" and "wrong phone".
      throw new NotFoundException(ORDER_NOT_FOUND);
    }
    return {
      data: {
        ...this.toOrderPublic(order),
        timeline: order.statusHistory.map((h) => ({
          status: h.status,
          at: h.changedAt,
          note: h.notes,
        })),
      },
      message: 'Order fetched',
    };
  }

  /**
   * Customer cancellation request (order number + phone verified).
   * Allowed only before shipped; stock is restored and a captured payment
   * is refunded through Razorpay.
   */
  async cancelRequest(orderNumber: string, dto: CancelRequestDto, actor: Actor) {
    const order = await this.findVerifiedOrder(orderNumber, dto.phone);
    if (order.status === 'cancelled') {
      throw new ConflictException('Order is already cancelled');
    }
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new ConflictException(
        'Cancellation is only possible before the order is shipped',
      );
    }

    const cancelled = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'cancelled',
          cancelReason: dto.reason ?? 'Customer cancellation request',
        },
        include: { items: true, payment: true },
      });
      await tx.orderStatusHistoryEntry.create({
        data: {
          orderId: order.id,
          status: 'cancelled',
          notes: dto.reason ?? 'Customer cancellation request',
        },
      });
      // Restore stock.
      for (const item of order.items) {
        await tx.inventory.update({
          where: { variantId: item.variantId },
          data: { quantity: { increment: item.quantity } },
        });
      }
      return updated;
    });

    // Refund a captured payment (best-effort; logged, never blocks cancel).
    if (order.payment?.status === 'captured' && order.payment.razorpayPaymentId) {
      const refund = await this.razorpay.refund(
        order.payment.razorpayPaymentId,
        order.total,
        'Customer cancellation',
      );
      await this.prisma.payment.update({
        where: { id: order.payment.id },
        data: refund.ok
          ? { status: 'refunded' }
          : { failureReason: refund.error ?? 'Refund failed' },
      });
      if (refund.ok) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'refunded' },
        });
      }
    }

    await this.audit.log({
      adminId: actor.id,
      action: 'order.cancel.request',
      entity: 'Order',
      entityId: order.id,
      metadata: { reason: dto.reason },
      ipAddress: actor.ip,
    });

    return { data: this.toOrderPublic(cancelled), message: 'Order cancelled' };
  }

  /**
   * Report a damaged/incorrect parcel — only within 48 hours of delivery
   * (order number + phone verified).
   */
  async reportIssue(orderNumber: string, dto: ReportIssueDto, actor: Actor) {
    const order = await this.findVerifiedOrder(orderNumber, dto.phone);
    if (order.status !== 'delivered' && order.status !== 'issue_reported') {
      throw new ConflictException(
        'Issues can only be reported after the order is delivered',
      );
    }
    if (order.status === 'issue_reported') {
      throw new ConflictException('An issue has already been reported for this order');
    }
    if (!order.deliveredAt) {
      throw new ConflictException('Order not delivered yet');
    }
    if (Date.now() - order.deliveredAt.getTime() > ISSUE_WINDOW_MS) {
      throw new ConflictException(
        'Issues must be reported within 48 hours of delivery',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.order.update({
        where: { id: order.id },
        data: { status: 'issue_reported', issueReportedAt: new Date() },
        include: { items: true, payment: true },
      });
      await tx.orderStatusHistoryEntry.create({
        data: {
          orderId: order.id,
          status: 'issue_reported',
          notes: `${dto.issueType}: ${dto.description ?? ''}`.trim(),
        },
      });
      return u;
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'order.issue.report',
      entity: 'Order',
      entityId: order.id,
      metadata: { issueType: dto.issueType },
      ipAddress: actor.ip,
    });

    return { data: this.toOrderPublic(updated), message: 'Issue reported' };
  }

  // ------------------------------ user orders ------------------------------

  async listOrders(userId: string, query: ListOrdersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: any = { userId };

    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.fromDate || query.toDate) {
      where.placedAt = {};
      if (query.fromDate) where.placedAt.gte = new Date(query.fromDate);
      if (query.toDate) where.placedAt.lte = new Date(query.toDate);
    }

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { placedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { items: true, payment: true },
      }),
    ]);

    return {
      data: orders.map((o) => this.toOrderPublic(o)),
      message: 'Orders fetched',
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, isDeleted: false },
      include: {
        items: true,
        payment: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException(ORDER_NOT_FOUND);
    return { data: this.toOrderPublic(order), message: 'Order fetched' };
  }

  // --------------------------------- admin ---------------------------------

  async adminList(query: ListAdminOrdersQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: any = { isDeleted: false };

    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.userId) where.userId = query.userId;
    if (query.orderNumber) {
      where.orderNumber = {
        contains: query.orderNumber.trim().toUpperCase(),
        mode: 'insensitive' as const,
      };
    }
    // Free-text search across customer name/phone.
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { customerName: { contains: s, mode: 'insensitive' as const } },
        { customerPhone: { contains: s.replace(/\D/g, '') } },
        { orderNumber: { contains: s.toUpperCase() } },
      ];
    }
    if (query.fromDate || query.toDate) {
      where.placedAt = {};
      if (query.fromDate) where.placedAt.gte = new Date(query.fromDate);
      if (query.toDate) where.placedAt.lte = new Date(query.toDate);
    }

    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { placedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { items: true, payment: true },
      }),
    ]);

    return {
      data: orders.map((o) => this.toOrderAdmin(o)),
      message: 'Orders fetched',
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async adminGet(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payment: { include: { refunds: true } },
        shipment: true,
        statusHistory: { orderBy: { changedAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException(ORDER_NOT_FOUND);
    return {
      data: {
        ...this.toOrderAdmin(order),
        timeline: order.statusHistory.map((h) => ({
          status: h.status,
          at: h.changedAt,
          note: h.notes,
        })),
      },
      message: 'Order fetched',
    };
  }

  /**
   * Admin status change — validates the transition, writes an audit row and
   * an order_status_events (OrderStatusHistoryEntry) row. Cancellation
   * restores stock; delivery stamps deliveredAt.
   */
  async adminUpdateStatus(orderId: string, dto: UpdateOrderStatusDto, actor: Actor) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException(ORDER_NOT_FOUND);

    const allowed = STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(dto.toStatus)) {
      throw new ConflictException(
        `Cannot move order from "${order.status}" to "${dto.toStatus}"`,
      );
    }
    if (dto.toStatus === 'received' && order.paymentStatus !== 'captured') {
      throw new ConflictException('Payment has not been captured for this order');
    }
    if (dto.toStatus === 'cancelled' && !dto.cancelReason) {
      throw new BadRequestException('cancelReason is required when cancelling');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.order.update({
        where: { id: orderId },
        data: {
          status: dto.toStatus,
          cancelReason:
            dto.toStatus === 'cancelled'
              ? dto.cancelReason
              : order.cancelReason,
          deliveredAt: dto.toStatus === 'delivered' ? new Date() : order.deliveredAt,
        },
        include: { items: true, payment: true },
      });
      await tx.orderStatusHistoryEntry.create({
        data: {
          orderId,
          status: dto.toStatus,
          notes: dto.toStatus === 'cancelled' ? dto.cancelReason : null,
        },
      });
      if (dto.toStatus === 'cancelled') {
        for (const item of order.items) {
          await tx.inventory.update({
            where: { variantId: item.variantId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      }
      return u;
    });

    await this.audit.log({
      adminId: actor.id,
      action: 'order.status.update',
      entity: 'Order',
      entityId: orderId,
      metadata: { from: order.status, to: dto.toStatus },
      ipAddress: actor.ip,
    });

    return { data: this.toOrderAdmin(updated), message: 'Order status updated' };
  }

  async adminRefund(orderId: string, dto: CreateRefundDto, actor: Actor) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException(ORDER_NOT_FOUND);
    if (!order.payment || order.payment.status !== 'captured') {
      throw new ConflictException('Cannot refund a payment that is not captured');
    }

    const refund = await this.razorpay.refund(
      order.payment.razorpayPaymentId ?? '',
      dto.amount,
      dto.reason ?? 'Admin refund',
    );
    if (!refund.ok) {
      throw new ConflictException(refund.error ?? 'Refund failed');
    }

    await this.prisma.$transaction([
      this.prisma.refund.create({
        data: {
          paymentId: order.payment.id,
          razorpayRefundId: refund.razorpayRefundId,
          amount: dto.amount,
          status: 'refunded',
          reason: dto.reason,
        },
      }),
      this.prisma.payment.update({
        where: { id: order.payment.id },
        data: { status: 'refunded' },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'refunded' },
      }),
    ]);

    await this.audit.log({
      adminId: actor.id,
      action: 'order.refund',
      entity: 'Order',
      entityId: orderId,
      metadata: { amount: dto.amount, reason: dto.reason },
      ipAddress: actor.ip,
    });

    return { data: this.toOrderAdmin(order), message: 'Refund processed' };
  }

  async adminListPayments(query: {
    page?: number;
    limit?: number;
    status?: string;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: any = {};
    if (query.status) where.status = query.status;

    const [total, payments] = await this.prisma.$transaction([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
              total: true,
            },
          },
        },
      }),
    ]);

    return {
      data: payments.map((p) => this.toPaymentAdmin(p)),
      message: 'Payments fetched',
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** CSV export of orders (admin). */
  async adminExportCsv(query: ListAdminOrdersQueryDto) {
    const { data } = await this.adminList({ ...query, page: 1, limit: 1000 });
    const header = [
      'orderNumber',
      'placedAt',
      'customerName',
      'phone',
      'city',
      'state',
      'pincode',
      'status',
      'paymentStatus',
      'subtotal',
      'discount',
      'tax',
      'shippingFee',
      'total',
      'couponCode',
    ];
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[\",\n]/.test(s) ? `"${s.replace(/\"/g, '""')}"` : s;
    };
    const rows = (data as any[]).map((o) =>
      [
        o.orderNumber,
        new Date(o.placedAt).toISOString(),
        o.customer?.name ?? o.customerName,
        o.phone ?? o.customer?.phone,
        o.address?.city,
        o.address?.state,
        o.address?.pincode,
        o.status,
        o.paymentStatus,
        o.subtotal,
        o.discount,
        o.tax,
        o.shippingFee,
        o.total,
        o.couponCode ?? '',
      ]
        .map(escape)
        .join(','),
    );
    return {
      csv: [header.join(','), ...rows].join('\n'),
      filename: `aq-orders-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }

  // -------------------------------- helpers --------------------------------

  private async findVerifiedOrder(orderNumber: string, phone: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber: orderNumber.trim().toUpperCase() },
      include: { items: true, payment: true },
    });
    if (!order || this.normalizePhone(phone) !== order.customerPhone) {
      throw new NotFoundException(ORDER_NOT_FOUND); // identical generic error
    }
    return order;
  }

  private async findValidCoupon(code: string) {
    const normalized = code.toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: normalized },
    });
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('That coupon code is not valid');
    }
    if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('That coupon code has expired');
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('That coupon code has reached its usage limit');
    }
    return coupon;
  }

  /** AQ-YYMMDD-#### — unique via retry on the unique index. */
  private generateOrderNumber(): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    return `AQ-${yy}${mm}${dd}-${suffix}`;
  }

  /** 10-digit Indian mobile from any human format ("+91 98765-43210" → "9876543210"). */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    return digits.slice(-10);
  }

  private isUniqueViolation(err: unknown, field?: string): boolean {
    const e = err as { code?: string; meta?: { target?: unknown } };
    if (e?.code !== 'P2002') return false;
    if (!field) return true;
    const target = e.meta?.target;
    if (Array.isArray(target)) return target.includes(field);
    return target === field;
  }

  /** Restores stock for an order's items (used when payment cannot start). */
  private async releaseStock(orderId: string) {
    const items = await this.prisma.orderItem.findMany({ where: { orderId } });
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.inventory.update({
          where: { variantId: item.variantId },
          data: { quantity: { increment: item.quantity } },
        }),
      ),
    );
  }

  /** Idempotent: pending → received once the money is captured. */
  private async confirmPaidOrder(
    orderId: string,
    razorpayPaymentId: string,
    signature: string,
    method: 'card' | 'upi' | 'netbanking' | 'wallet',
  ) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, payment: true },
      });
      if (!current) throw new NotFoundException(ORDER_NOT_FOUND);

      await tx.payment.update({
        where: { orderId },
        data: {
          status: 'captured',
          method,
          razorpayPaymentId,
          razorpaySignature: signature,
        },
      });

      if (current.status === 'pending') {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'received',
            paymentStatus: 'captured',
            paidAt: new Date(),
          },
        });
        await tx.orderStatusHistoryEntry.create({
          data: {
            orderId,
            status: 'received',
            notes: 'Payment captured',
          },
        });
        // Count coupon usage once payment is in.
        if (current.couponCode) {
          await tx.coupon.update({
            where: { code: current.couponCode },
            data: { usedCount: { increment: 1 } },
          });
        }
      } else {
        // Already confirmed (webhook + callback raced) — keep state consistent.
        await tx.order.update({
          where: { id: orderId },
          data: { paymentStatus: 'captured' },
        });
      }

      return tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true, payment: true },
      });
    });
  }

  // ------------------------------ serialisers ------------------------------

  private async toCheckoutResponse(order: any) {
    const payment = order.payment ?? null;
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      tax: order.tax,
      total: order.total,
      couponCode: order.couponCode,
      items: (order.items ?? []).map((i: any) => ({
        variantId: i.variantId,
        productName: i.productName,
        variantName: i.variantName,
        sku: i.sku,
        quantity: i.quantity,
        priceAtPurchase: i.priceAtPurchase,
        taxPercentAtPurchase: toNumber(i.taxPercentAtPurchase),
      })),
      // Everything Razorpay Checkout needs to open the payment sheet:
      payment: payment
        ? {
            razorpayOrderId: payment.razorpayOrderId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            keyId: this.razorpay.isMock() ? 'mock' : undefined,
            mock: this.razorpay.isMock() || undefined,
          }
        : null,
      customer: {
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail,
      },
      address: {
        line1: order.addressLine1,
        line2: order.addressLine2,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
      },
      placedAt: order.placedAt,
    };
  }

  private toOrderPublic(order: any) {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      subtotal: order.subtotal,
      discount: order.discount,
      shippingFee: order.shippingFee,
      tax: order.tax,
      total: order.total,
      couponCode: order.couponCode,
      customer: {
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail,
      },
      address: {
        line1: order.addressLine1,
        line2: order.addressLine2,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
      },
      items: (order.items ?? []).map((i: any) => ({
        id: i.id,
        variantId: i.variantId,
        productName: i.productName,
        variantName: i.variantName,
        sku: i.sku,
        quantity: i.quantity,
        priceAtPurchase: i.priceAtPurchase,
        taxPercentAtPurchase: toNumber(i.taxPercentAtPurchase),
      })),
      payment: order.payment
        ? {
            id: order.payment.id,
            status: order.payment.status,
            method: order.payment.method,
            razorpayOrderId: order.payment.razorpayOrderId,
            razorpayPaymentId: order.payment.razorpayPaymentId,
            amount: order.payment.amount,
            failureReason: order.payment.failureReason,
          }
        : null,
      cancelReason: order.cancelReason,
      placedAt: order.placedAt,
      paidAt: order.paidAt,
      deliveredAt: order.deliveredAt,
      issueReportedAt: order.issueReportedAt,
    };
  }

  private toOrderAdmin(order: any) {
    return {
      ...this.toOrderPublic(order),
      customer: {
        name: order.customerName,
        phone: order.customerPhone,
        email: order.customerEmail,
      },
      address: {
        line1: order.addressLine1,
        line2: order.addressLine2,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
      },
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private toPaymentAdmin(p: any) {
    return {
      id: p.id,
      orderId: p.orderId,
      order: p.order,
      razorpayOrderId: p.razorpayOrderId,
      razorpayPaymentId: p.razorpayPaymentId,
      status: p.status,
      method: p.method,
      amount: p.amount,
      currency: p.currency,
      failureReason: p.failureReason,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
