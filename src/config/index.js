import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import { config } from './config.js';

export const connectDB = async () => {
  try {
    await mongoose.connect(config.dbUrl);
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error({ message: 'MongoDB connection error', error: error.message, stack: error.stack });
    logger.error({ dbUrl: config.dbUrl });
    process.exit(1);
  }
};
