import mongoose from 'mongoose';

const normalizeObjectId = (value) => {
  if (!value) return value;
  if (typeof value === 'string') return value;

  if (typeof value?.buffer === 'string') {
    const hexValue = Buffer.from(value.buffer, 'latin1').toString('hex');
    if (mongoose.Types.ObjectId.isValid(hexValue)) {
      return hexValue;
    }
  }

  try {
    return new mongoose.Types.ObjectId(value).toString();
  } catch {
    return undefined;
  }
};

export const buildProductFilter = (query) => {
  const filter = { isDeleted: false, isApproved: true };
  if (query.categoryId) filter.categoryId = normalizeObjectId(query.categoryId);
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }
  if (query.search) {
    // Use text index if available
    filter.$text = { $search: query.search };
  }
  if (query.tags) {
    const tags = Array.isArray(query.tags) ? query.tags : String(query.tags).split(',');
    filter.tags = { $in: tags.map((t) => t.trim()).filter(Boolean) };
  }
  return filter;
};
