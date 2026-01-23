import { InventoryService } from '../../../services/inventory.service.js';
import { successResponse } from '../../../helpers/response.helper.js';

export const adjustStock = async (req, res, next) => {
  try {
    const { productId, quantity, type, reason } = req.body;
    const adminId = req.user.id;

    const result = await InventoryService.adjustStock(
      productId,
      quantity,
      type,
      reason,
      adminId
    );

    return successResponse(
      res,
      result,
      'Stock adjusted successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const setLowStockThreshold = async (req, res, next) => {
  try {
    const { productId, lowStockThreshold } = req.body;

    const product = await InventoryService.setLowStockThreshold(
      productId,
      lowStockThreshold
    );

    return successResponse(
      res,
      product,
      'Low stock threshold updated successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getLowStockProducts = async (req, res, next) => {
  try {
    const { threshold } = req.query;
    const products = await InventoryService.getLowStockProducts(
      threshold ? parseInt(threshold) : null
    );

    return successResponse(
      res,
      { products, count: products.length },
      'Low stock products retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

export const getStockHistory = async (req, res, next) => {
  try {
    const { calculatePagination, buildPaginationMeta } = await import('../../../helpers/pagination.helper.js');
    const { productId } = req.params;
    const { page, limit } = calculatePagination(req.query, 20, 100);

    const history = await InventoryService.getStockHistory(productId, page, limit);
    const pagination = buildPaginationMeta(history.total, page, limit);
    return res.status(200).json({
      success: true,
      data: history.history,
      pagination,
      message: 'Stock history retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const getInventorySummary = async (req, res, next) => {
  try {
    const summary = await InventoryService.getInventorySummary();

    return successResponse(
      res,
      summary,
      'Inventory summary retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};
