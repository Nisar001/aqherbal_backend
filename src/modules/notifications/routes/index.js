import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth.middleware.js';
import { checkRole } from '../../../middlewares/admin.middleware.js';
import * as notificationController from '../controllers/index.js';

const router = Router();

// All routes require authentication
router.get('/', authenticate, notificationController.getNotifications);

router.get('/unread-count', authenticate, notificationController.getUnreadCount);

// Bulk actions must be registered before dynamic :id routes.
router.put('/read-all', authenticate, notificationController.markAllAsRead);
router.put('/mark-all-read', authenticate, notificationController.markAllAsRead);
router.post('/mark-all-read', authenticate, notificationController.markAllAsRead);
router.delete('/clear-all', authenticate, notificationController.clearAllNotifications);

router.put('/:id/read', authenticate, notificationController.markAsRead);
router.post('/:id/mark-read', authenticate, notificationController.markAsRead);

router.delete('/:id', authenticate, notificationController.deleteNotification);

// Admin: Send notification
router.post('/send', authenticate, checkRole(['admin', 'super_admin']), notificationController.sendNotification);

export default router;
