import { ProductService } from '../../../services/product.service.js';
import { responseHelper } from '../../../helpers/response.helper.js';
import { buildQuery, formatPaginatedData } from '../../../helpers/pagination.helper.js';

export const getProducts = async (req, res, next) => {
  try {
    const query = buildQuery(req.query, {
      defaultLimit: 20,
      maxLimit: 100,
      allowedFilters: ['status', 'category'],
      allowedSortFields: ['price', 'createdAt', 'name', 'rating'],
      searchFields: ['name', 'description']
    });

    const { items, page, limit, total } = await ProductService.list(query.raw);
    const response = formatPaginatedData(items, total, page, limit);
    return res.status(200).json({ success: true, ...response, message: 'Products fetched' });
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const product = await ProductService.getById(req.params.id);
    if (!product || product.isDeleted) return responseHelper.notFound(res, 'Product not found');
    return responseHelper.success(res, product, 'Product fetched');
  } catch (err) {
    next(err);
  }
};
