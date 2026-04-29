import { ProductService } from '../../../services/product.service.js';
import { responseHelper } from '../../../helpers/response.helper.js';
import { formatPaginatedData } from '../../../helpers/pagination.helper.js';
import mongoose from 'mongoose';
import { AppError } from '../../../middlewares/error.middleware.js';

const isInvalidPositiveInteger = (value) => {
  if (value === undefined) return false;
  const parsed = Number(value);
  return !Number.isInteger(parsed) || parsed < 1;
};

export const getProducts = async (req, res, next) => {
  try {
    if (isInvalidPositiveInteger(req.query.page) || isInvalidPositiveInteger(req.query.limit)) {
      throw new AppError('Invalid pagination parameters', 400);
    }

    const { items, page, limit, total } = await ProductService.list(req.query);
    const response = formatPaginatedData(items, total, page, limit);
    response.pagination.currentPage = response.pagination.page;
    return res.status(200).json({ success: true, ...response, message: 'Products fetched' });
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return responseHelper.validationError(res, 'Invalid product ID');
    }

    const product = await ProductService.getById(req.params.id);
    if (!product || product.isDeleted || product.isApproved === false) return responseHelper.notFound(res, 'Product not found');
    return responseHelper.success(res, product, 'Product fetched');
  } catch (err) {
    next(err);
  }
};
