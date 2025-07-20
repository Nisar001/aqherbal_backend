import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: process.env.PORT || 5000,
  dbUrl: process.env.DB_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'secret',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: process.env.SMTP_PORT || 587,
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  cloudinaryName: process.env.CLOUDINARY_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  // Add more env values as needed
};

export default config;
