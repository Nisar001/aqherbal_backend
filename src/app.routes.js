import userRoutes from './modules/user/routes/index.js';
import orderRoutes from './modules/orders/routes/index.js';
import productRoutes from './modules/products/routes/index.js';
import categoryRoutes from './modules/categories/routes/index.js';
import cartRoutes from './modules/cart/routes/index.js';
import paymentRoutes from './modules/payment/routes/index.js';
import reviewRoutes from './modules/reviews/routes/index.js';
import authRoutes from './modules/auth/routes/index.js';
import adminRoutes from './modules/admin/routes/index.js';
import couponRoutes from './modules/coupons/routes/index.js';
import inventoryRoutes from './modules/inventory/routes/index.js';
import notificationRoutes from './modules/notifications/routes/index.js';
import shipmentRoutes from './modules/shipments/routes/index.js';
import { authorizeAdmin } from './middlewares/admin.middleware.js';
import { authenticate } from './middlewares/auth.middleware.js';
import { authRateLimiter, reviewRateLimiter, couponRateLimiter } from './middlewares/rateLimit.middleware.js';


export const appRoutes = (app) => {
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/categories', categoryRoutes);
  app.use('/api/v1/cart', cartRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/reviews', reviewRateLimiter, reviewRoutes);
  app.use('/api/v1/auth', authRateLimiter, authRoutes);
  app.use('/api/v1/admin', authenticate, authorizeAdmin, adminRoutes);
  app.use('/api/v1/coupons', couponRateLimiter, couponRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/shipments', shipmentRoutes);
};
