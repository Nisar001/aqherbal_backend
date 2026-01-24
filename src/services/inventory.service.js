import { ProductRepository } from '../repositories/product.repository.js';
import { AppError } from '../middlewares/error.middleware.js';

class InventoryServiceImpl {
  async adjustStock(productId, quantity, type, reason, adminId) {
    const product = await ProductRepository.findById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    let newStock = product.stock;
    let adjustment = 0;

    switch (type) {
    case 'add':
      newStock += quantity;
      adjustment = quantity;
      break;
    case 'subtract':
      if (product.stock < quantity) {
        throw new AppError('Insufficient stock to subtract', 400);
      }
      newStock -= quantity;
      adjustment = -quantity;
      break;
    case 'set':
      adjustment = quantity - product.stock;
      newStock = quantity;
      break;
    default:
      throw new AppError('Invalid adjustment type', 400);
    }

    // Update product stock
    const updatedProduct = await ProductRepository.update(productId, {
      stock: newStock,
      $push: {
        stockHistory: {
          previousStock: product.stock,
          newStock,
          adjustment,
          type,
          reason,
          adjustedBy: adminId,
          adjustedAt: new Date()
        }
      }
    });

    // Check if stock is now low
    if (newStock <= (product.lowStockThreshold || 10)) {
      await this.sendLowStockAlert(product, newStock);
    }

    return {
      product: updatedProduct,
      adjustment: {
        previousStock: product.stock,
        newStock,
        adjustment,
        type,
        reason
      }
    };
  }

  async setLowStockThreshold(productId, threshold) {
    const product = await ProductRepository.findById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const updatedProduct = await ProductRepository.update(productId, {
      lowStockThreshold: threshold
    });

    // Check if current stock is below new threshold
    if (product.stock <= threshold) {
      await this.sendLowStockAlert(product, product.stock);
    }

    return updatedProduct;
  }

  async getLowStockProducts(threshold = null) {
    const products = await ProductRepository.model.find({
      isDeleted: false,
      isActive: true
    });

    const lowStockProducts = products.filter((product) => {
      const productThreshold = threshold || product.lowStockThreshold || 10;
      return product.stock <= productThreshold;
    });

    return lowStockProducts.map((product) => ({
      _id: product._id,
      name: product.name,
      sku: product.sku,
      currentStock: product.stock,
      lowStockThreshold: product.lowStockThreshold || 10,
      category: product.category,
      price: product.price
    }));
  }

  async getStockHistory(productId, page = 1, limit = 50) {
    const product = await ProductRepository.model
      .findById(productId)
      .select('name sku stock stockHistory')
      .populate('stockHistory.adjustedBy', 'firstName lastName email');

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // Sort stock history by date (newest first)
    const sortedHistory = product.stockHistory
      .sort((a, b) => b.adjustedAt - a.adjustedAt);

    const total = sortedHistory.length;
    const skip = (page - 1) * limit;
    const history = sortedHistory.slice(skip, skip + limit);

    return {
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        currentStock: product.stock
      },
      history,
      total,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getInventorySummary() {
    const products = await ProductRepository.model.find({
      isDeleted: false,
      isActive: true
    });

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStockCount = products.filter(
      (p) => p.stock <= (p.lowStockThreshold || 10)
    ).length;
    const outOfStockCount = products.filter((p) => p.stock === 0).length;

    const totalValue = products.reduce(
      (sum, p) => sum + p.stock * p.price,
      0
    );

    return {
      totalProducts,
      totalStock,
      lowStockCount,
      outOfStockCount,
      totalValue: totalValue.toFixed(2),
      averageStockPerProduct: (totalStock / totalProducts).toFixed(2)
    };
  }

  async sendLowStockAlert(product, currentStock) {
    try {
      const { sendLowStockAlertEmail } = await import('./email.service.js');

      await sendLowStockAlertEmail({
        to: process.env.ADMIN_EMAIL,
        productName: product.name,
        sku: product.sku,
        currentStock,
        threshold: product.lowStockThreshold || 10,
        productUrl: process.env.ADMIN_URL ? `${process.env.ADMIN_URL}/products/${product._id}` : null
      });
    } catch (error) {
      // Use logger instead of console.error
      const logger = await import('../utils/logger.js').then(m => m.default);
      logger.error('Error sending low stock alert:', {
        error: error.message,
        productId: product._id,
        productName: product.name
      });
      // Don't throw - inventory operations should continue
    }
  }

  async recordStockMovement(productId, quantity, type, reason, orderId = null) {
    // This method is called internally by OrderService
    const product = await ProductRepository.findById(productId);
    if (!product) return;

    await ProductRepository.update(productId, {
      $push: {
        stockHistory: {
          previousStock: product.stock,
          newStock: product.stock - quantity,
          adjustment: -quantity,
          type: type || 'order',
          reason: reason || 'Stock reserved for order',
          orderId,
          adjustedAt: new Date()
        }
      }
    });
  }
}

export const InventoryService = new InventoryServiceImpl();
