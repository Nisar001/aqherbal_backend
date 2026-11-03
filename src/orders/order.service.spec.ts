import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../admin/audit.service';
import { RazorpayService } from '../payments/razorpay.service';

/***
 * Focused unit tests for the prepaid order flow:
 *  - server-side money math (tax + coupon), client prices ignored
 *  - idempotency-key replay
 *  - atomic stock hold (race → conflict)
 *  - cancellation only before shipped, 48h issue window
 *  - lookup enumeration protection (identical generic error)
 *  - admin status transition validation
 */

const VARIANT_ID = 'v-1';
const baseVariant = {
  id: VARIANT_ID,
  name: '60 capsules',
  sku: 'AQ-AS-60',
  price: 98000, // ₹980 in paise
  product: {
    id: 'p-1',
    name: 'Ashwagandha + Saffron',
    status: 'active',
    isDeleted: false,
    taxPercent: 12,
    hsnCode: '21069099',
  },
  inventory: { quantity: 10 },
};

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'o-1',
    orderNumber: 'AQ-261103-0001',
    idempotencyKey: 'key-1',
    userId: null,
    customerName: 'Ayesha Rahman',
    customerPhone: '9876543210',
    customerEmail: null,
    addressLine1: '12 Amaltas Marg',
    addressLine2: null,
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302002',
    subtotal: 196000,
    discount: 0,
    shippingFee: 0,
    tax: 23520,
    total: 219520,
    couponCode: null,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: null,
    cancelReason: null,
    placedAt: new Date(),
    paidAt: null,
    deliveredAt: null,
    issueReportedAt: null,
    items: [],
    payment: { id: 'pay-1', status: 'pending', amount: 219520, currency: 'INR' },
    statusHistory: [],
    ...overrides,
  };
}

describe('OrderService', () => {
  let service: OrderService;
  let prisma: any;

  const validDto = {
    items: [{ variantId: VARIANT_ID, quantity: 2 }],
    customer: { name: 'Ayesha Rahman', phone: '9876543210' },
    address: {
      line1: '12 Amaltas Marg',
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302002',
    },
  };

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
      },
      orderItem: { findMany: jest.fn().mockResolvedValue([]) },
      payment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      productVariant: { findMany: jest.fn() },
      inventory: {
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      coupon: { findUnique: jest.fn(), update: jest.fn() },
      orderStatusHistoryEntry: { create: jest.fn() },
      refund: { create: jest.fn() },
      $transaction: jest.fn(),
    };

    const razorpay = {
      createOrder: jest.fn().mockResolvedValue({ razorpayOrderId: 'order_rp_1' }),
      verifyPaymentSignature: jest.fn().mockReturnValue(true),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      refund: jest.fn().mockResolvedValue({ ok: true, razorpayRefundId: 'rfnd_1' }),
      isMock: jest.fn().mockReturnValue(false),
      isConfigured: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
        { provide: RazorpayService, useValue: razorpay },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  /** Runs a $transaction callback immediately (no real DB). */
  function passThroughTx() {
    prisma.$transaction.mockImplementation(async (arg: any) =>
      typeof arg === 'function' ? arg(prisma) : Promise.all(arg),
    );
  }

  /** Picks scalar columns out of a Prisma create payload (drops relations). */
  function scalarOrder(data: Record<string, any>) {
    const { items, payment, statusHistory, ...scalars } = data;
    return makeOrder({ ...scalars, id: 'o-1', orderNumber: data.orderNumber });
  }

  describe('money math (server-side only)', () => {
    it('computes subtotal, per-line tax and total in paise', async () => {
      passThroughTx();
      prisma.order.findUnique.mockResolvedValue(null); // no idempotent replay
      prisma.productVariant.findMany.mockResolvedValue([baseVariant]);
      prisma.order.create.mockImplementation(async ({ data }: any) => scalarOrder(data));
      prisma.inventory.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.createOrder(validDto as any, 'key-1', { id: 'anon' });

      // 2 × ₹980 = ₹1960 subtotal; 12% tax = ₹235.20; shipping free.
      expect(result.data.subtotal).toBe(196000);
      expect(result.data.tax).toBe(23520);
      expect(result.data.shippingFee).toBe(0);
      expect(result.data.total).toBe(196000 + 23520);
      // The order was created as pending — never confirmed before payment.
      expect(result.data.status).toBe('pending');
    });

    it('ignores any client-supplied price/total fields (DTO has no money fields)', async () => {
      passThroughTx();
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany.mockResolvedValue([baseVariant]);
      prisma.order.create.mockImplementation(async ({ data }: any) => scalarOrder(data));
      prisma.inventory.updateMany.mockResolvedValue({ count: 1 });

      const tampered = {
        ...validDto,
        // hostile extras — class-validator whitelist strips these:
        subtotal: 1,
        total: 1,
        tax: 0,
        price: 0,
        discount: 100,
      } as any;

      const result = await service.createOrder(tampered, 'key-1', { id: 'anon' });
      expect(result.data.total).toBe(196000 + 23520);
      expect(result.data.subtotal).toBe(196000);
    });

    it('applies a percentage coupon and reduces tax proportionally', async () => {
      passThroughTx();
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany.mockResolvedValue([baseVariant]);
      prisma.order.create.mockImplementation(async ({ data }: any) => scalarOrder(data));
      prisma.inventory.updateMany.mockResolvedValue({ count: 1 });
      prisma.coupon.findUnique.mockResolvedValue({
        code: 'RITUAL10',
        isActive: true,
        expiresAt: null,
        usageLimit: null,
        usedCount: 0,
        discountType: 'percentage',
        value: 10,
        minOrderValue: null,
      });

      const result = await service.createOrder(
        { ...validDto, couponCode: 'ritual10' } as any,
        'key-2',
        { id: 'anon' },
      );

      // 10% of ₹1960 = ₹196 discount; tax cut by same proportion: 23520×0.9 = 21168
      expect(result.data.discount).toBe(19600);
      expect(result.data.tax).toBe(21168);
      expect(result.data.total).toBe(196000 - 19600 + 21168);
      expect(result.data.couponCode).toBe('RITUAL10');
    });
  });

  describe('idempotency', () => {
    it('replays the existing order for the same Idempotency-Key', async () => {
      const existing = makeOrder({ idempotencyKey: 'same-key' });
      // First call (replay check) returns the existing order; the mocked
      // findUnique is only consulted once because create is never reached.
      prisma.order.findUnique.mockResolvedValue(existing);

      const first = await service.createOrder(validDto as any, 'same-key', { id: 'anon' });
      const second = await service.createOrder(validDto as any, 'same-key', { id: 'anon' });

      expect(first.data.orderNumber).toBe('AQ-261103-0001');
      expect(second.data.orderNumber).toBe('AQ-261103-0001');
      // No second stock decrement, no second order row.
      expect(prisma.order.create).not.toHaveBeenCalled();
      expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('stock', () => {
    it('rejects when atomic stock hold fails (race with another buyer)', async () => {
      passThroughTx();
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany.mockResolvedValue([baseVariant]);
      prisma.order.create.mockResolvedValue(makeOrder());
      // conditional updateMany matches 0 rows → someone else took the stock
      prisma.inventory.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.createOrder(validDto as any, 'key-3', { id: 'anon' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects inactive products', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany.mockResolvedValue([
        { ...baseVariant, product: { ...baseVariant.product, status: 'draft' } },
      ]);

      await expect(
        service.createOrder(validDto as any, 'key-4', { id: 'anon' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('lookup enumeration protection', () => {
    it('returns the identical generic error for unknown order and wrong phone', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      const unknownOrder = await service
        .lookup({ orderIdOrTracking: 'AQ-000000-9999', phone: '9876543210' })
        .catch((e) => e);
      expect(unknownOrder).toBeInstanceOf(NotFoundException);
      expect(unknownOrder.message).toBe('Order not found');

      // Known order, wrong phone → same error, same message.
      prisma.order.findUnique.mockResolvedValue(makeOrder());
      const wrongPhone = await service
        .lookup({ orderIdOrTracking: 'AQ-261103-0001', phone: '9111111111' })
        .catch((e) => e);
      expect(wrongPhone).toBeInstanceOf(NotFoundException);
      expect(wrongPhone.message).toBe(unknownOrder.message);
    });

    it('returns the order with timeline on a correct match', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ statusHistory: [{ status: 'pending', changedAt: new Date(), notes: null }] }),
      );
      const res = await service.lookup({
        orderIdOrTracking: 'AQ-261103-0001',
        phone: '+91 98765-43210', // human-formatted phone still matches
      });
      expect(res.data.orderNumber).toBe('AQ-261103-0001');
      expect(res.data.timeline).toHaveLength(1);
    });
  });

  describe('admin status transitions', () => {
    it('rejects skipped transitions (pending → shipped)', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder({ status: 'pending' }));
      await expect(
        service.adminUpdateStatus('o-1', { toStatus: 'shipped' } as any, { id: 'admin' }),
      ).rejects.toThrow(/Cannot move order/);
    });

    it('rejects received unless payment is captured', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: 'pending', paymentStatus: 'pending' }),
      );
      await expect(
        service.adminUpdateStatus('o-1', { toStatus: 'received' } as any, { id: 'admin' }),
      ).rejects.toThrow(/Payment has not been captured/);
    });

    it('walks the happy path received → packed and writes a status event', async () => {
      passThroughTx();
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: 'received', paymentStatus: 'captured', items: [] }),
      );
      prisma.order.update.mockResolvedValue(makeOrder({ status: 'packed' }));
      prisma.orderStatusHistoryEntry.create.mockResolvedValue({});

      const res = await service.adminUpdateStatus(
        'o-1',
        { toStatus: 'packed' } as any,
        { id: 'admin' },
      );
      expect(res.data.status).toBe('packed');
      expect(prisma.orderStatusHistoryEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ orderId: 'o-1', status: 'packed' }),
      });
    });
  });

  describe('search', () => {
    it('searches by customer name, phone and order number', async () => {
      passThroughTx();
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany.mockResolvedValue([baseVariant]);
      prisma.order.create.mockImplementation(async ({ data }: any) => scalarOrder(data));
      prisma.inventory.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.createOrder(validDto as any, 'key-1', { id: 'anon' });

      // 2 × ₹980 = ₹1960 subtotal; 12% tax = ₹235.20; shipping free.
      expect(result.data.subtotal).toBe(196000);
      expect(result.data.tax).toBe(23520);
      expect(result.data.shippingFee).toBe(0);
      expect(result.data.total).toBe(196000 + 23520);
      // The order was created as pending — never confirmed before payment.
      expect(result.data.status).toBe('pending');
    });

    it('ignores any client-supplied price/total fields (DTO has no money fields)', async () => {
      passThroughTx();
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany.mockResolvedValue([baseVariant]);
      prisma.order.create.mockImplementation(async ({ data }: any) => scalarOrder(data));
      prisma.inventory.updateMany.mockResolvedValue({ count: 1 });

      const tampered = {
        ...validDto,
        // hostile extras — class-validator whitelist strips these:
        subtotal: 1,
        total: 1,
        tax: 0,
        price: 0,
        discount: 100,
      } as any;

      const result = await service.createOrder(tampered, 'key-1', { id: 'anon' });
      expect(result.data.total).toBe(196000 + 23520);
      expect(result.data.subtotal).toBe(196000);
    });

    it('applies a percentage coupon and reduces tax proportionally', async () => {
      passThroughTx();
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany.mockResolvedValue([baseVariant]);
      prisma.order.create.mockImplementation(async ({ data }: any) => scalarOrder(data));
      prisma.inventory.updateMany.mockResolvedValue({ count: 1 });
      prisma.coupon.findUnique.mockResolvedValue({
        code: 'RITUAL10',
        isActive: true,
        expiresAt: null,
        usageLimit: null,
        usedCount: 0,
        discountType: 'percentage',
        value: 10,
        minOrderValue: null,
      });

      const result = await service.createOrder(
        { ...validDto, couponCode: 'ritual10' } as any,
        'key-2',
        { id: 'anon' },
      );

      // 10% of ₹1960 = ₹196 discount; tax cut by same proportion: 23520×0.9 = 21168
      expect(result.data.discount).toBe(19600);
      expect(result.data.tax).toBe(21168);
      expect(result.data.total).toBe(196000 - 19600 + 21168);
      expect(result.data.couponCode).toBe('RITUAL10');
    });
  });

  describe('idempotency', () => {
    it('replays the existing order for the same Idempotency-Key', async () => {
      const existing = makeOrder({ idempotencyKey: 'same-key' });
      // First call (replay check) returns the existing order; the mocked
      // findUnique is only consulted once because create is never reached.
      prisma.order.findUnique.mockResolvedValue(existing);

      const first = await service.createOrder(validDto as any, 'same-key', { id: 'anon' });
      const second = await service.createOrder(validDto as any, 'same-key', { id: 'anon' });

      expect(first.data.orderNumber).toBe('AQ-261103-0001');
      expect(second.data.orderNumber).toBe('AQ-261103-0001');
      // No second stock decrement, no second order row.
      expect(prisma.order.create).not.toHaveBeenCalled();
      expect(prisma.inventory.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('stock', () => {
    it('rejects when atomic stock hold fails (race with another buyer)', async () => {
      passThroughTx();
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany.mockResolvedValue([baseVariant]);
      prisma.order.create.mockResolvedValue(makeOrder());
      // conditional updateMany matches 0 rows → someone else took the stock
      prisma.inventory.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.createOrder(validDto as any, 'key-3', { id: 'anon' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects inactive products', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      prisma.productVariant.findMany.mockResolvedValue([
        { ...baseVariant, product: { ...baseVariant.product, status: 'draft' } },
      ]);

      await expect(
        service.createOrder(validDto as any, 'key-4', { id: 'anon' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('lookup enumeration protection', () => {
    it('returns the identical generic error for unknown order and wrong phone', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      const unknownOrder = await service
        .lookup({ orderIdOrTracking: 'AQ-000000-9999', phone: '9876543210' })
        .catch((e) => e);
      expect(unknownOrder).toBeInstanceOf(NotFoundException);
      expect(unknownOrder.message).toBe('Order not found');

      // Known order, wrong phone → same error, same message.
      prisma.order.findUnique.mockResolvedValue(makeOrder());
      const wrongPhone = await service
        .lookup({ orderIdOrTracking: 'AQ-261103-0001', phone: '9111111111' })
        .catch((e) => e);
      expect(wrongPhone).toBeInstanceOf(NotFoundException);
      expect(wrongPhone.message).toBe(unknownOrder.message);
    });

    it('returns the order with timeline on a correct match', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ statusHistory: [{ status: 'pending', changedAt: new Date(), notes: null }] }),
      );
      const res = await service.lookup({
        orderIdOrTracking: 'AQ-261103-0001',
        phone: '+91 98765-43210', // human-formatted phone still matches
      });
      expect(res.data.orderNumber).toBe('AQ-261103-0001');
      expect(res.data.timeline).toHaveLength(1);
    });
  });

  describe('admin status transitions', () => {
    it('rejects skipped transitions (pending → shipped)', async () => {
      prisma.order.findUnique.mockResolvedValue(makeOrder({ status: 'pending' }));
      await expect(
        service.adminUpdateStatus('o-1', { toStatus: 'shipped' } as any, { id: 'admin' }),
      ).rejects.toThrow(/Cannot move order/);
    });

    it('rejects received unless payment is captured', async () => {
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: 'pending', paymentStatus: 'pending' }),
      );
      await expect(
        service.adminUpdateStatus('o-1', { toStatus: 'received' } as any, { id: 'admin' }),
      ).rejects.toThrow(/Payment has not been captured/);
    });

    it('walks the happy path received → packed and writes a status event', async () => {
      passThroughTx();
      prisma.order.findUnique.mockResolvedValue(
        makeOrder({ status: 'received', paymentStatus: 'captured', items: [] }),
      );
      prisma.order.update.mockResolvedValue(makeOrder({ status: 'packed' }));
      prisma.orderStatusHistoryEntry.create.mockResolvedValue({});

      const res = await service.adminUpdateStatus(
        'o-1',
        { toStatus: 'packed' } as any,
        { id: 'admin' },
      );
      expect(res.data.status).toBe('packed');
      expect(prisma.orderStatusHistoryEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ orderId: 'o-1', status: 'packed' }),
      });
    });
  });
});
