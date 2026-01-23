export const buildProductFilter = (query) => {
  const filter = { isDeleted: false };
  if (query.categoryId) filter.categoryId = query.categoryId;
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
