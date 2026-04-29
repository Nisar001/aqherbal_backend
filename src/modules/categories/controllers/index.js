import { CategoryService } from '../../../services/category.service.js';
import { responseHelper } from '../../../helpers/response.helper.js';
import { buildQuery, formatPaginatedData } from '../../../helpers/pagination.helper.js';
import mongoose from 'mongoose';

export const getCategories = async (req, res, next) => {
  try {
    const query = buildQuery(req.query, {
      defaultLimit: 20,
      maxLimit: 100,
      allowedFilters: ['status'],
      allowedSortFields: ['createdAt', 'name'],
      searchFields: ['name', 'description']
    });

    const { items, page, limit, total } = await CategoryService.list(query.raw);
    const response = formatPaginatedData(items, total, page, limit);
    return res.status(200).json({ success: true, ...response, message: 'Categories fetched' });
  } catch (err) {
    next(err);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return responseHelper.validationError(res, 'Invalid category ID');
    }

    const category = await CategoryService.getById(req.params.id);
    if (!category || category.isDeleted) return responseHelper.notFound(res, 'Category not found');
    return responseHelper.success(res, category, 'Category fetched');
  } catch (err) {
    next(err);
  }
};
