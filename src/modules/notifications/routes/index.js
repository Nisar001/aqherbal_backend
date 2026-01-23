import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import * as notificationController from '../controllers/index.js';

const router = Router();

// All routes require authentication
router.get('/', authenticate, notificationController.getNotifications);

router.get('/unread-count', authenticate, notificationController.getUnreadCount);

router.put('/:id/read', authenticate, notificationController.markAsRead);

router.put('/read-all', authenticate, notificationController.markAllAsRead);

router.delete('/:id', authenticate, notificationController.deleteNotification);

export default router;
