import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  image: String,
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

categorySchema.index({ name: 1 }, { unique: true });
categorySchema.index({ parentId: 1 });
categorySchema.index({ isDeleted: 1 });

const CategoryModel = mongoose.model('Category', categorySchema);

export { CategoryModel };
export default CategoryModel;
