import { NotificationModel } from '../../../models/notification.model.js';
import { successResponse } from '../../../helpers/response.helper.js';
import { AppError } from '../../../middlewares/error.middleware.js';
import { buildQuery, formatPaginatedData } from '../../../helpers/pagination.helper.js';

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const query = buildQuery(req.query, {
      defaultLimit: 20,
      maxLimit: 100,
      allowedFilters: ['isRead'],
      allowedSortFields: ['createdAt', 'type'],
      searchFields: ['message', 'type']
    });

    const mongoQuery = { userId, isDeleted: false, ...query.filter };

    const notifications = await NotificationModel.find(mongoQuery, query.projection)
      .sort(query.sort)
      .skip(query.pagination.skip)
      .limit(query.pagination.limit);

    const total = await NotificationModel.countDocuments(mongoQuery);
    const unreadCount = await NotificationModel.countDocuments({
      userId,
      isRead: false,
      isDeleted: false
    });

    const response = formatPaginatedData(notifications, total, query.pagination.page, query.pagination.limit);
    return res.status(200).json({
      success: true,
      ...response,
      unreadCount,
      message: 'Notifications retrieved successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await NotificationModel.findOne({
      _id: id,
      userId,
      isDeleted: false
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return successResponse(
      res,
      notification,
      'Notification marked as read'
    );
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await NotificationModel.updateMany(
      { userId, isRead: false, isDeleted: false },
      { isRead: true, readAt: new Date() }
    );

    return successResponse(
      res,
      { message: 'All notifications marked as read' },
      'Success'
    );
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await NotificationModel.findOne({
      _id: id,
      userId,
      isDeleted: false
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    notification.isDeleted = true;
    notification.deletedAt = new Date();
    await notification.save();

    return successResponse(
      res,
      { message: 'Notification deleted successfully' },
      'Success'
    );
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const count = await NotificationModel.countDocuments({
      userId,
      isRead: false,
      isDeleted: false
    });

    return successResponse(res, { count }, 'Unread count retrieved');
  } catch (error) {
    next(error);
  }
};

// Admin: Send notification to user(s)
export const sendNotification = async (req, res, next) => {
  try {
    const { userId, userIds, type, title, message, data, priority } = req.body;

    if (!userId && (!userIds || userIds.length === 0)) {
      throw new AppError('Must specify userId or userIds', 400);
    }

    const targetUsers = userId ? [userId] : userIds;
    const notifications = [];

    for (const uid of targetUsers) {
      const notification = new NotificationModel({
        userId: uid,
        type: type || 'info',
        title: title || 'Notification',
        message,
        data: data || {},
        priority: priority || 'normal',
        isRead: false
      });
      await notification.save();
      notifications.push(notification);
    }

    return successResponse(
      res,
      { count: notifications.length, notifications },
      'Notifications sent successfully',
      201
    );
  } catch (error) {
    next(error);
  }
};
