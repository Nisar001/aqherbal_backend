import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String,
  sku: String,
  quantity: Number,
  pricePerUnit: Number,
  discountPercent: { type: Number, default: 0 },
  subtotal: Number,
  total: Number
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true, index: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

  // Invoice details
  invoiceDate: { type: Date, default: Date.now },
  dueDate: Date,

  // Customer details
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  customerAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },

  // Line items
  items: [invoiceItemSchema],

  // Amounts
  subtotal: { type: Number, min: 0 },
  discountAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, min: 0 },
  shippingCost: { type: Number, default: 0 },
  totalAmount: { type: Number, min: 0 },
  amountPaid: { type: Number, default: 0 },
  balanceDue: { type: Number, min: 0 },

  // Payment details
  paymentMethod: String,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'partial', 'overdue', 'refunded'], default: 'pending' },

  // GST/Tax details
  gstin: String,
  hsn: String,
  sac: String,

  // Status
  status: { type: String, enum: ['draft', 'issued', 'viewed', 'paid', 'cancelled'], default: 'draft' },
  notes: String,
  terms: String,

  // File storage
  pdfPath: String,
  pdfUrl: String,

  // Audit
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issuedAt: Date,
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: Date
}, { timestamps: true });

invoiceSchema.index({ orderId: 1, userId: 1 });
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ status: 1, isDeleted: 1 });

export const InvoiceModel = mongoose.model('Invoice', invoiceSchema);
