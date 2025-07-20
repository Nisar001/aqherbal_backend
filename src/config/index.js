import dotenv from 'dotenv'
dotenv.config();

import mongoose from 'mongoose';

export const config = {
  port: process.env.PORT || 5000,
  dbUrl: process.env.DB_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'secret',
};

export const connectDB = async () => {
  try {
        await mongoose.connect(config.dbUrl);
        console.log('MongoDB connected');
  } catch (error) {
        console.error('MongoDB connection error:', error.message);
        console.error('Full error:', error);
        console.error('DB URL:', config.dbUrl);
    process.exit(1);
  }
};
