import userRoutes from './modules/user/routes/index.js';
import orderRoutes from './modules/orders/routes/index.js';
import productRoutes from './modules/products/routes/index.js';
import categoryRoutes from './modules/categories/routes/index.js';
import cartRoutes from './modules/cart/routes/index.js';
import paymentRoutes from './modules/payment/routes/index.js';
import reviewRoutes from './modules/reviews/routes/index.js';
import authRoutes from './modules/auth/routes/index.js';
import adminRoutes from './modules/admin/routes/index.js';
import { authorizeAdmin } from './middlewares/admin.middleware.js';


export const appRoutes = (app) => {
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/categories', categoryRoutes);
  app.use('/api/v1/cart', cartRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/reviews', reviewRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/admin', authorizeAdmin, adminRoutes);
};
