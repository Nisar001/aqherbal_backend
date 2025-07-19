import userRoutes from './modules/user/routes/index.js';
import orderRoutes from './modules/orders/routes/index.js';

import productRoutes from './modules/products/routes/index.js';
import categoryRoutes from './modules/categories/routes/index.js';
import cartRoutes from './modules/cart/routes/index.js';
import paymentRoutes from './modules/payment/routes/index.js';
import reviewRoutes from './modules/reviews/routes/index.js';
import authRoutes from './modules/auth/routes/index.js';

export const appRoutes = (app) => {
  app.use('/api/users', userRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/auth', authRoutes);
  // Add more routes here
};
