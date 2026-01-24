import { InvoiceModel } from '../models/invoice.model.js';
import { OrderModel } from '../models/order.model.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../utils/logger.js';

export const InvoiceService = {
  async generateInvoice(orderId, adminId, options = {}) {
    try {
      // Fetch order with user and product details
      const order = await OrderModel.findById(orderId)
        .populate('userId', 'name email phone')
        .populate('items.productId', 'name sku');

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      // Check if invoice already exists for this order
      const existingInvoice = await InvoiceModel.findOne({ orderId, isDeleted: false });
      if (existingInvoice) {
        throw new AppError('Invoice already exists for this order', 400);
      }

      // Generate invoice number (YYYY-MM-DDXXXXX format)
      const invoiceNumber = await this.generateInvoiceNumber();

      // Build invoice items
      const invoiceItems = order.items.map((item) => ({
        productId: item.productId._id,
        productName: item.productId.name,
        sku: item.productId.sku || 'N/A',
        quantity: item.quantity,
        pricePerUnit: item.priceAtPurchase,
        discountPercent: item.discountApplied || 0,
        subtotal: item.priceAtPurchase * item.quantity,
        total: (item.priceAtPurchase * (1 - (item.discountApplied || 0) / 100)) * item.quantity
      }));

      // Calculate totals
      const subtotal = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
      const discountAmount = order.discountAmount || 0;
      const taxAmount = order.tax || 0;
      const shippingCost = order.shippingCost || 0;
      const totalAmount = order.totalAmount || 0;

      // Create invoice
      const invoice = await InvoiceModel.create({
        invoiceNumber,
        orderId,
        userId: order.userId._id,
        invoiceDate: options.invoiceDate || new Date(),
        dueDate: options.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days

        customerName: order.userId.name,
        customerEmail: order.userId.email,
        customerPhone: order.userId.phone,
        customerAddress: {
          line1: order.shippingAddress?.line1,
          line2: order.shippingAddress?.line2,
          city: order.shippingAddress?.city,
          state: order.shippingAddress?.state,
          pincode: order.shippingAddress?.pincode,
          country: order.shippingAddress?.country || 'India'
        },

        items: invoiceItems,
        subtotal,
        discountAmount,
        taxAmount,
        shippingCost,
        totalAmount,
        balanceDue: totalAmount,

        paymentMethod: order.paymentMethod || 'Not Specified',
        paymentStatus: order.paymentStatus === 'captured' ? 'paid' : 'pending',

        status: 'issued',
        terms: options.terms || 'Payment terms: Net 30',
        notes: options.notes || '',
        generatedBy: adminId,
        issuedAt: new Date(),

        gstin: options.gstin || process.env.COMPANY_GSTIN,
        hsn: options.hsn,
        sac: options.sac
      });

      logger.info(`Invoice generated: ${invoiceNumber} for order ${orderId}`);
      return invoice;
    } catch (error) {
      logger.error('Error generating invoice:', error);
      throw error;
    }
  },

  async generateInvoiceNumber() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const invoiceCount = await InvoiceModel.countDocuments({
      createdAt: {
        $gte: new Date(year, today.getMonth(), 1),
        $lt: new Date(year, today.getMonth() + 1, 1)
      }
    });

    const sequence = String(invoiceCount + 1).padStart(5, '0');
    return `INV-${year}${month}${day}-${sequence}`;
  },

  async getInvoiceById(invoiceId) {
    const invoice = await InvoiceModel.findById(invoiceId)
      .populate('userId', 'name email phone')
      .populate('orderId')
      .populate('items.productId', 'name sku');

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    return invoice;
  },

  async getOrderInvoice(orderId) {
    const invoice = await InvoiceModel.findOne({ orderId, isDeleted: false })
      .populate('userId', 'name email phone')
      .populate('orderId')
      .populate('items.productId', 'name sku');

    if (!invoice) {
      throw new AppError('Invoice not found for this order', 404);
    }

    return invoice;
  },

  async listInvoices(filters = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const query = { isDeleted: false, ...filters };

    const invoices = await InvoiceModel.find(query)
      .populate('userId', 'name email')
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await InvoiceModel.countDocuments(query);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  },

  async updateInvoiceStatus(invoiceId, status) {
    const invoice = await InvoiceModel.findByIdAndUpdate(
      invoiceId,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    logger.info(`Invoice ${invoiceId} status updated to ${status}`);
    return invoice;
  },

  async recordPayment(invoiceId, amountPaid) {
    const invoice = await InvoiceModel.findById(invoiceId);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    const totalPaid = (invoice.amountPaid || 0) + amountPaid;
    const balanceDue = Math.max(0, invoice.totalAmount - totalPaid);

    let paymentStatus = 'pending';
    if (balanceDue === 0) paymentStatus = 'paid';
    else if (totalPaid > 0) paymentStatus = 'partial';

    const updatedInvoice = await InvoiceModel.findByIdAndUpdate(
      invoiceId,
      {
        amountPaid: totalPaid,
        balanceDue,
        paymentStatus
      },
      { new: true }
    );

    logger.info(`Payment recorded on invoice ${invoiceId}: ₹${amountPaid}`);
    return updatedInvoice;
  },

  async cancelInvoice(invoiceId, reason = '') {
    const invoice = await InvoiceModel.findByIdAndUpdate(
      invoiceId,
      {
        status: 'cancelled',
        notes: `Cancelled: ${reason}`
      },
      { new: true }
    );

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    logger.info(`Invoice ${invoiceId} cancelled`);
    return invoice;
  },

  async deleteInvoice(invoiceId) {
    const invoice = await InvoiceModel.findByIdAndUpdate(
      invoiceId,
      {
        isDeleted: true,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    logger.info(`Invoice ${invoiceId} deleted`);
    return invoice;
  },

  async generateInvoicePDF(invoiceId) {
    // Placeholder for PDF generation
    // In production, use pdfkit, puppeteer, or similar
    const invoice = await this.getInvoiceById(invoiceId);

    logger.info(`PDF generation requested for invoice ${invoiceId}`);

    // This would generate a PDF and save it
    // For now, return the data formatted for PDF
    return {
      html: this.buildInvoiceHTML(invoice),
      filename: `invoice-${invoice.invoiceNumber}.pdf`
    };
  },

  buildInvoiceHTML(invoice) {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .company-info { float: left; width: 50%; }
    .invoice-details { float: right; width: 50%; text-align: right; }
    .clear { clear: both; }
    .section { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f5f5f5; }
    .total { font-weight: bold; text-align: right; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>INVOICE</h1>
  </div>
  
  <div class="company-info">
    <h3>AQ Herbal</h3>
    <p>${process.env.COMPANY_ADDRESS || 'Mumbai, India'}</p>
    <p>${process.env.COMPANY_GSTIN || ''}</p>
  </div>
  
  <div class="invoice-details">
    <p><strong>Invoice No:</strong> ${invoice.invoiceNumber}</p>
    <p><strong>Invoice Date:</strong> ${invoice.invoiceDate.toLocaleDateString()}</p>
    <p><strong>Due Date:</strong> ${invoice.dueDate.toLocaleDateString()}</p>
  </div>
  
  <div class="clear"></div>
  
  <div class="section">
    <h4>Bill To:</h4>
    <p><strong>${invoice.customerName}</strong></p>
    <p>${invoice.customerAddress?.line1}</p>
    <p>${invoice.customerAddress?.city}, ${invoice.customerAddress?.state} ${invoice.customerAddress?.pincode}</p>
    <p>Email: ${invoice.customerEmail}</p>
    <p>Phone: ${invoice.customerPhone}</p>
  </div>
  
  <div class="section">
    <table>
      <tr>
        <th>Item</th>
        <th>SKU</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Discount</th>
        <th>Amount</th>
      </tr>
      ${invoice.items.map(item => `
      <tr>
        <td>${item.productName}</td>
        <td>${item.sku}</td>
        <td>${item.quantity}</td>
        <td>₹${item.pricePerUnit.toFixed(2)}</td>
        <td>${item.discountPercent}%</td>
        <td>₹${item.total.toFixed(2)}</td>
      </tr>
      `).join('')}
    </table>
  </div>
  
  <div class="section">
    <div style="text-align: right;">
      <p class="total">Subtotal: ₹${invoice.subtotal.toFixed(2)}</p>
      <p class="total">Discount: -₹${invoice.discountAmount.toFixed(2)}</p>
      <p class="total">Tax (GST): ₹${invoice.taxAmount.toFixed(2)}</p>
      <p class="total">Shipping: ₹${invoice.shippingCost.toFixed(2)}</p>
      <p class="total" style="font-size: 18px;">Total Amount: ₹${invoice.totalAmount.toFixed(2)}</p>
      <p class="total">Paid: ₹${invoice.amountPaid.toFixed(2)}</p>
      <p class="total" style="color: ${invoice.balanceDue > 0 ? 'red' : 'green'};">Balance Due: ₹${invoice.balanceDue.toFixed(2)}</p>
    </div>
  </div>
  
  <div class="footer">
    <p>${invoice.terms}</p>
    <p>${invoice.notes}</p>
  </div>
</body>
</html>
    `;
  }
};
