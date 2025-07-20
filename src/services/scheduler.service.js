import cron from 'node-cron';
import { sendNotificationEmail } from './email.service.js';

export const startNotificationScheduler = () => {
  cron.schedule('0 9 * * *', async () => {
    // Example: send daily notification at 9 AM
    await sendNotificationEmail({
      to: 'user@example.com',
      message: 'This is your daily notification from AQHerbal.'
    });
  });
};
