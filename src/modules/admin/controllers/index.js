import { UserModel } from '../../../models/user.model.js';
import { ProductModel } from '../../../models/product.model.js';
import { CategoryModel } from '../../../models/category.model.js';
import { OrderModel } from '../../../models/order.model.js';
import { successResponse } from '../../../helpers/response.helper.js';
import { AppError } from '../../../middlewares/error.middleware.js';
import { buildQuery, formatPaginatedData } from '../../../helpers/pagination.helper.js';

// User Management
export const getAllUsers = async (req, res, next) => {
  try {
    const query = buildQuery(req.query, {
      defaultLimit: 20,
      maxLimit: 100,
      allowedFilters: ['role', 'isActive'],
      allowedSortFields: ['createdAt', 'email', 'name'],
      searchFields: ['name', 'email']
    });

    const mongoQuery = { isDeleted: false, ...query.filter };

    const users = await UserModel.find(mongoQuery, query.projection)
      .select('-password -refreshToken')
      .sort(query.sort)
      .skip(query.pagination.skip)
      .limit(query.pagination.limit);

    const total = await UserModel.countDocuments(mongoQuery);

    const response = formatPaginatedData(users, total, query.pagination.page, query.pagination.limit);
    return res.status(200).json({ success: true, ...response, message: 'Users retrieved successfully' });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findOne({ _id: id, isDeleted: false })
      .select('-password -refreshToken');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return successResponse(res, user, 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow password update through this endpoint
    delete updates.password;
    delete updates.refreshToken;

    const user = await UserModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    }).select('-password -refreshToken');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return successResponse(res, user, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

export const banUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await UserModel.findByIdAndUpdate(
      id,
      { isActive: false, banReason: reason },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return successResponse(res, user, 'User banned successfully');
  } catch (error) {
    next(error);
  }
};

export const unbanUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findByIdAndUpdate(
      id,
      { isActive: true, $unset: { banReason: 1 } },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return successResponse(res, user, 'User unbanned successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await UserModel.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return successResponse(res, { message: 'User deleted successfully' }, 'Success');
  } catch (error) {
    next(error);
  }
};

// Product Management
export const createProduct = async (req, res, next) => {
  try {
    const productData = req.body;
    const existingProduct = await ProductModel.findOne({ sku: productData.sku });
    if (existingProduct) {
      throw new AppError('SKU already exists', 400);
    }

    const product = await ProductModel.create(productData);

    return successResponse(res, product, 'Product created successfully', 201);
  } catch (error) {
    if (error?.name === 'ValidationError' || error?.code === 11000) {
      return next(new AppError(error.message || 'Invalid product data', 400));
    }
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = await ProductModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    return successResponse(res, product, 'Product updated successfully');
  } catch (error) {
    if (error?.name === 'ValidationError' || error?.code === 11000) {
      return next(new AppError(error.message || 'Invalid product data', 400));
    }
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    return successResponse(res, { message: 'Product deleted successfully' }, 'Success');
  } catch (error) {
    next(error);
  }
};

// Category Management
export const createCategory = async (req, res, next) => {
  try {
    const categoryData = req.body;
    const category = await CategoryModel.create(categoryData);

    return successResponse(res, category, 'Category created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const category = await CategoryModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    return successResponse(res, category, 'Category updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if category has products
    const productsCount = await ProductModel.countDocuments({
      categoryId: id,
      isDeleted: false
    });

    if (productsCount > 0) {
      throw new AppError(
        `Cannot delete category with ${productsCount} products. Please reassign or delete products first.`,
        400
      );
    }

    const category = await CategoryModel.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    return successResponse(res, { message: 'Category deleted successfully' }, 'Success');
  } catch (error) {
    next(error);
  }
};

// Analytics
export const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      pendingOrders,
      lowStockProducts
    ] = await Promise.all([
      UserModel.countDocuments({ isDeleted: false, role: 'user' }),
      ProductModel.countDocuments({ isDeleted: false }),
      OrderModel.countDocuments({ isDeleted: false }),
      OrderModel.aggregate([
        { $match: { isDeleted: false, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      OrderModel.countDocuments({ status: 'pending', isDeleted: false }),
      ProductModel.countDocuments({
        isDeleted: false,
        $expr: { $lte: ['$stock', '$lowStockThreshold'] }
      })
    ]);

    const stats = {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingOrders,
      lowStockProducts
    };

    return successResponse(res, stats, 'Dashboard stats retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate, period = 'daily' } = req.query;

    const matchStage = {
      isDeleted: false,
      status: 'delivered'
    };

    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const groupBy =
      period === 'monthly'
        ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }
        : period === 'weekly'
          ? { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } }
          : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };

    const salesData = await OrderModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupBy,
          totalSales: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          averageOrder: { $avg: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
      { $limit: 30 }
    ]);

    return successResponse(res, salesData, 'Sales report retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getTopProducts = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const topProducts = await OrderModel.aggregate([
      { $match: { isDeleted: false, status: 'delivered' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: { $multiply: ['$items.priceAtPurchase', '$items.quantity'] }
          },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productId: '$_id',
          name: '$product.name',
          totalQuantity: 1,
          totalRevenue: 1,
          orderCount: 1
        }
      }
    ]);

    return successResponse(res, topProducts, 'Top products retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const getRevenueStats = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const [monthlyRevenue, yearlyRevenue, totalRevenue] = await Promise.all([
      OrderModel.aggregate([
        {
          $match: {
            isDeleted: false,
            status: 'delivered',
            createdAt: { $gte: startOfMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      OrderModel.aggregate([
        {
          $match: {
            isDeleted: false,
            status: 'delivered',
            createdAt: { $gte: startOfYear }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      OrderModel.aggregate([
        { $match: { isDeleted: false, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    const stats = {
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      yearlyRevenue: yearlyRevenue[0]?.total || 0,
      totalRevenue: totalRevenue[0]?.total || 0
    };

    return successResponse(res, stats, 'Revenue stats retrieved successfully');
  } catch (error) {
    next(error);
  }
};
