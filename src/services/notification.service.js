import { sendNotificationEmail } from './email.service.js';
import logger from '../utils/logger.js';

export const notifyUser = async (userEmail, message, type = 'email') => {
  if (type === 'email') {
    await sendNotificationEmail({ to: userEmail, message });
    logger.info(`Notification sent to ${userEmail} via email.`);
  }
  // Add other notification types (SMS, push) here
};
