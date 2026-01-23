import { Queue, Worker } from 'bullmq';
import { sendEmail } from './email.service.js';
import logger from '../utils/logger.js';

const redisDisabled = process.env.REDIS_DISABLED === 'true';

// Redis connection configuration
const connection = redisDisabled
  ? null
  : {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  };

// Create queues (or fall back to in-process handlers when Redis is disabled)
export const emailQueue = redisDisabled
  ? {
    add: async (_jobName, data) => {
      await sendEmail(data);
      logger.info('Email processed locally (Redis disabled)');
      return { id: 'local-email', data };
    }
  }
  : new Queue('email', { connection });

export const notificationQueue = redisDisabled
  ? {
    add: async (_jobName, data) => {
      // No-op but keep interface compatible
      logger.info('Notification queued locally (Redis disabled)', data);
      return { id: 'local-notification', data };
    }
  }
  : new Queue('notification', { connection });

class NotificationServiceImpl {
  constructor() {
    if (!redisDisabled) {
      this.initializeWorkers();
    } else {
      logger.warn('Redis disabled via REDIS_DISABLED=true; using local handlers.');
    }
  }

  initializeWorkers() {
    // Email worker
    const emailWorker = new Worker(
      'email',
      async (job) => {
        const { to, subject, template, data } = job.data;
        try {
          await sendEmail({ to, subject, template, data });
          logger.info(`Email sent successfully to ${to}`);
          return { success: true };
        } catch (error) {
          logger.error('Email sending failed:', error);
          throw error;
        }
      },
      { connection }
    );

    emailWorker.on('completed', (job) => {
      logger.info(`Email job ${job.id} completed`);
    });

    emailWorker.on('failed', (job, err) => {
      logger.error(`Email job ${job.id} failed:`, err);
    });

    // Notification worker
    const notificationWorker = new Worker(
      'notification',
      async (job) => {
        const { userId, type, title, message, data } = job.data;
        try {
          // Save notification to database
          const notification = await this.createInAppNotification(
            userId,
            type,
            title,
            message,
            data
          );
          logger.info(`Notification created for user ${userId}`);
          return { success: true, notificationId: notification._id };
        } catch (error) {
          logger.error('Notification creation failed:', error);
          throw error;
        }
      },
      { connection }
    );

    notificationWorker.on('completed', (job) => {
      logger.info(`Notification job ${job.id} completed`);
    });

    notificationWorker.on('failed', (job, err) => {
      logger.error(`Notification job ${job.id} failed:`, err);
    });

    logger.info('Notification workers initialized');
  }

  async queueEmail(to, subject, template, data, priority = 1) {
    try {
      const job = await emailQueue.add(
        'send-email',
        { to, subject, template, data },
        { priority, attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
      );
      return job.id;
    } catch (error) {
      logger.error('Failed to queue email:', error);
      throw error;
    }
  }

  async queueNotification(userId, type, title, message, data = {}, priority = 1) {
    try {
      const job = await notificationQueue.add(
        'create-notification',
        { userId, type, title, message, data },
        { priority, attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
      );
      return job.id;
    } catch (error) {
      logger.error('Failed to queue notification:', error);
      throw error;
    }
  }

  async createInAppNotification(userId, type, title, message, data) {
    const { NotificationModel } = await import('../models/notification.model.js');

    const notification = await NotificationModel.create({
      userId,
      type,
      title,
      message,
      data,
      isRead: false,
      createdAt: new Date()
    });

    return notification;
  }

  // Order notifications
  async notifyOrderCreated(userId, order) {
    await this.queueEmail(
      order.email || userId.email,
      'Order Confirmation',
      'orderConfirmation',
      {
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        items: order.items
      },
      3 // High priority
    );

    await this.queueNotification(
      userId,
      'order',
      'Order Placed Successfully',
      `Your order ${order.orderNumber} has been placed successfully.`,
      { orderId: order._id, orderNumber: order.orderNumber },
      3
    );
  }

  async notifyOrderStatusChange(userId, order, newStatus) {
    const statusMessages = {
      confirmed: 'Your order has been confirmed',
      processing: 'Your order is being processed',
      shipped: 'Your order has been shipped',
      delivered: 'Your order has been delivered',
      cancelled: 'Your order has been cancelled'
    };

    await this.queueEmail(
      order.email || userId.email,
      `Order ${newStatus.toUpperCase()}`,
      'orderStatusChange',
      {
        orderNumber: order.orderNumber,
        status: newStatus,
        statusMessage: statusMessages[newStatus]
      },
      2
    );

    await this.queueNotification(
      userId,
      'order',
      `Order ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
      statusMessages[newStatus],
      { orderId: order._id, orderNumber: order.orderNumber, status: newStatus },
      2
    );
  }

  // Payment notifications
  async notifyPaymentSuccess(userId, payment, order) {
    await this.queueEmail(
      order.email || userId.email,
      'Payment Successful',
      'paymentSuccess',
      {
        orderNumber: order.orderNumber,
        amount: payment.amount,
        paymentMethod: payment.method
      },
      3
    );

    await this.queueNotification(
      userId,
      'payment',
      'Payment Successful',
      `Payment of ₹${payment.amount} for order ${order.orderNumber} was successful.`,
      { paymentId: payment._id, orderId: order._id },
      3
    );
  }

  async notifyPaymentFailed(userId, payment, order) {
    await this.queueEmail(
      order.email || userId.email,
      'Payment Failed',
      'paymentFailed',
      {
        orderNumber: order.orderNumber,
        amount: payment.amount,
        failureReason: payment.failureReason
      },
      3
    );

    await this.queueNotification(
      userId,
      'payment',
      'Payment Failed',
      `Payment for order ${order.orderNumber} failed. Please try again.`,
      { paymentId: payment._id, orderId: order._id },
      3
    );
  }

  // Review notifications
  async notifyReviewApproved(userId, review, product) {
    await this.queueNotification(
      userId,
      'review',
      'Review Approved',
      `Your review for ${product.name} has been approved.`,
      { reviewId: review._id, productId: product._id },
      1
    );
  }

  async notifyReviewRejected(userId, review, product, reason) {
    await this.queueNotification(
      userId,
      'review',
      'Review Not Approved',
      `Your review for ${product.name} was not approved. Reason: ${reason}`,
      { reviewId: review._id, productId: product._id },
      1
    );
  }

  // Low stock notification (admin)
  async notifyLowStock(product, currentStock) {
    await this.queueEmail(
      process.env.ADMIN_EMAIL || 'admin@aqherbal.com',
      'Low Stock Alert',
      'lowStockAlert',
      {
        productName: product.name,
        sku: product.sku,
        currentStock,
        threshold: product.lowStockThreshold || 10
      },
      3
    );
  }
}

export const NotificationService = new NotificationServiceImpl();

// Legacy function for backward compatibility
export const notifyUser = async (userEmail, message, type = 'email') => {
  if (type === 'email') {
    await NotificationService.queueEmail(userEmail, 'Notification', 'generic', { message });
    logger.info(`Notification sent to ${userEmail} via email.`);
  }
};
