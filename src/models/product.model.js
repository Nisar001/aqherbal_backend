import mongoose from 'mongoose';
import { INVENTORY_STATUS } from '../constants/inventoryStatus.js';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, trim: true, unique: true },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 10, min: 0 },
  inventoryStatus: { type: String, enum: Object.values(INVENTORY_STATUS), default: INVENTORY_STATUS.IN_STOCK },
  stockHistory: [{
    previousStock: Number,
    newStock: Number,
    adjustment: Number,
    type: String, // 'add', 'subtract', 'set', 'order', 'return'
    reason: String,
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adjustedAt: { type: Date, default: Date.now }
  }],
  images: [String],
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  brand: { type: String, trim: true },
  tags: [String],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
  isActive: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

productSchema.index({ categoryId: 1 });
productSchema.index({ name: 'text', tags: 'text', brand: 'text' });
productSchema.index({ isDeleted: 1 });

const ProductModel = mongoose.model('Product', productSchema);

export { ProductModel };
export default ProductModel;
