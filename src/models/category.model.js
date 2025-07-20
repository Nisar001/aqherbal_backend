import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  image: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const CategoryModel = mongoose.model('Category', categorySchema);
