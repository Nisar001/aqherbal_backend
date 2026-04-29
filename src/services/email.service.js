import { emailLinks } from '../utils/emailLinks.js';

// Dedicated function for login alert email
export const sendLoginAlertEmail = async ({ to, name, email, ip }) => {
  return sendEmail({
    to,
    subject: 'AQHerbal Login Alert',
    html: emailTemplates.login({ name, email, ip })
  });
};
// Professional HTML email templates
const emailTemplates = {
  userDeleted: ({ name, email }) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
    <h2 style="color:#d32f2f;">Account Deleted</h2>
    <p>Hello ${name},</p>
    <p>Your AQHerbal account (${email}) has been deleted. If this was not you, please contact our support team immediately.</p>
    <hr>
    <p style="font-size:12px;color:#888;">AQHerbal Team</p>
  </div>
`,
  registration: ({ name, email }) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
      <h2 style="color:#2e7d32;">Welcome to AQHerbal, ${name}!</h2>
      <p>Thank you for registering with AQHerbal. Your account has been created successfully.</p>
      <p><strong>Email:</strong> ${email}</p>
      <p>If you did not register, please contact our support team immediately.</p>
      <hr>
      <p style="font-size:12px;color:#888;">AQHerbal Team</p>
    </div>
  `,
  login: ({ name, email, ip }) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
      <h2 style="color:#1976d2;">Login Alert</h2>
      <p>Hello ${name},</p>
      <p>Your account (${email}) was just logged in.</p>
      <p><strong>IP Address:</strong> ${ip}</p>
      <p>If this was not you, please reset your password immediately or contact support.</p>
      <hr>
      <p style="font-size:12px;color:#888;">AQHerbal Security Team</p>
    </div>
  `,
  passwordChange: ({ name, email }) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
      <h2 style="color:#d32f2f;">Password Changed</h2>
      <p>Hello ${name},</p>
      <p>Your password for AQHerbal (${email}) was changed successfully.</p>
      <p>If you did not perform this action, please contact support immediately.</p>
      <hr>
      <p style="font-size:12px;color:#888;">AQHerbal Security Team</p>
    </div>
  `,
  verification: ({ name, _email, link }) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
      <h2 style="color:#388e3c;">Verify Your Email</h2>
      <p>Hello ${name},</p>
      <p>Thank you for registering with AQHerbal. Please verify your email address by clicking the button below:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${link}" style="background:#388e3c;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">Verify Email</a>
      </p>
      <p>If you did not register, please ignore this email.</p>
      <hr>
      <p style="font-size:12px;color:#888;">AQHerbal Team</p>
    </div>
  `,
  notification: ({ message }) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
      <h2 style="color:#ffa000;">Notification</h2>
      <p>${message}</p>
      <hr>
      <p style="font-size:12px;color:#888;">AQHerbal Team</p>
    </div>
  `,
  orderConfirmation: ({ name, orderNumber, totalAmount, items }) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
      <h2 style="color:#2e7d32;">Order Confirmed!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for your order! Your order has been confirmed and is being processed.</p>
      <div style="background:#fff;padding:16px;margin:16px 0;border-radius:4px;">
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
        <p><strong>Items:</strong> ${items} item(s)</p>
      </div>
      <p>You will receive another email when your order is shipped.</p>
      <hr>
      <p style="font-size:12px;color:#888;">AQHerbal Team</p>
    </div>
  `,
  orderShipped: ({ name, orderNumber, trackingNumber, courier, estimatedDelivery }) => {
    try {
      const trackingUrl = emailLinks.trackOrder(orderNumber);
      return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
      <h2 style="color:#1976d2;">Order Shipped!</h2>
      <p>Hello ${name},</p>
      <p>Great news! Your order has been shipped and is on its way.</p>
      <div style="background:#fff;padding:16px;margin:16px 0;border-radius:4px;">
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
        <p><strong>Courier:</strong> ${courier}</p>
        ${estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>` : ''}
      </div>
      <p style="text-align:center;margin:24px 0;">
        <a href="${trackingUrl}" style="background:#1976d2;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">Track Your Order</a>
      </p>
      <hr>
      <p style="font-size:12px;color:#888;">AQHerbal Team</p>
    </div>
  `;
    } catch (error) {
      console.error('Error building order shipped email:', error.message);
      throw error;
    }
  },
  orderDelivered: ({ name, orderNumber, deliveryDate }) => {
    try {
      const reviewUrl = emailLinks.reviewOrder(orderNumber);
      return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
      <h2 style="color:#2e7d32;">Order Delivered!</h2>
      <p>Hello ${name},</p>
      <p>Your order has been delivered successfully!</p>
      <div style="background:#fff;padding:16px;margin:16px 0;border-radius:4px;">
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Delivered on:</strong> ${deliveryDate}</p>
      </div>
      <p>We hope you enjoy your purchase! If you have any issues, please don't hesitate to contact our support team.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${reviewUrl}" style="background:#2e7d32;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">Leave a Review</a>
      </p>
      <hr>
      <p style="font-size:12px;color:#888;">AQHerbal Team</p>
    </div>
  `;
    } catch (error) {
      console.error('Error building order delivered email:', error.message);
      throw error;
    }
  },
  paymentSuccess: ({ name, orderNumber, amount, paymentMethod }) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
      <h2 style="color:#2e7d32;">Payment Successful!</h2>
      <p>Hello ${name},</p>
      <p>Your payment has been processed successfully.</p>
      <div style="background:#fff;padding:16px;margin:16px 0;border-radius:4px;">
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Amount Paid:</strong> ₹${amount}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
      </div>
      <p>Your order is now being processed and will be shipped soon.</p>
      <hr>
      <p style="font-size:12px;color:#888;">AQHerbal Team</p>
    </div>
  `,
  paymentFailed: ({ name, orderNumber, amount, reason }) => {
    try {
      const retryUrl = emailLinks.retryPayment(orderNumber);
      return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
      <h2 style="color:#d32f2f;">Payment Failed</h2>
      <p>Hello ${name},</p>
      <p>We were unable to process your payment for order ${orderNumber}.</p>
      <div style="background:#fff;padding:16px;margin:16px 0;border-radius:4px;">
        <p><strong>Order Number:</strong> ${orderNumber}</p>
        <p><strong>Amount:</strong> ₹${amount}</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>
      <p>Please try again or use a different payment method.</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${retryUrl}" style="background:#d32f2f;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">Retry Payment</a>
      </p>
      <hr>
      <p style="font-size:12px;color:#888;">AQHerbal Team</p>
    </div>
  `;
    } catch (error) {
      console.error('Error building payment failed email:', error.message);
      throw error;
    }
  },
  lowStockAlert: ({ productName, sku, currentStock, threshold, productUrl }) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;border-radius:8px;">
      <h2 style="color:#ff9800;">⚠️ Low Stock Alert</h2>
      <p>Hello Admin,</p>
      <p>The following product is running low on stock and may need restocking:</p>
      <div style="background:#fff;padding:16px;margin:16px 0;border-radius:4px;border-left:4px solid #ff9800;">
        <p><strong>Product:</strong> ${productName}</p>
        <p><strong>SKU:</strong> ${sku}</p>
        <p><strong>Current Stock:</strong> ${currentStock} units</p>
        <p><strong>Alert Threshold:</strong> ${threshold} units</p>
      </div>
      <p>Please consider restocking this product to avoid stockouts.</p>
      ${productUrl ? `
        <p style="text-align:center;margin:24px 0;">
          <a href="${productUrl}" style="background:#ff9800;color:#fff;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:bold;">View Product</a>
        </p>
      ` : ''}
      <hr>
      <p style="font-size:12px;color:#888;">AQHerbal Inventory System</p>
    </div>
  `
};

// Dedicated email functions
// Removed duplicate sendRegistrationEmail function declaration
// Dedicated function for user deletion email
export const sendUserDeletedEmail = async ({ to, name, email }) => {
  return sendEmail({
    to,
    subject: 'Your AQHerbal Account Was Deleted',
    html: emailTemplates.userDeleted({ name, email })
  });
};

// Dedicated email functions
export const sendRegistrationEmail = async ({ to, name, email }) => {
  return sendEmail({
    to,
    subject: 'Welcome to AQHerbal!',
    html: emailTemplates.registration({ name, email })
  });
};

export const sendPasswordChangeEmail = async ({ to, name, email }) => {
  return sendEmail({
    to,
    subject: 'Your AQHerbal Password Was Changed',
    html: emailTemplates.passwordChange({ name, email })
  });
};

export const sendVerificationEmail = async ({ to, name, _email, link }) => {
  return sendEmail({
    to,
    subject: 'Verify Your AQHerbal Email',
    html: emailTemplates.verification({ name, email: to, link })
  });
};

export const sendNotificationEmail = async ({ to, message }) => {
  return sendEmail({
    to,
    subject: 'Notification from AQHerbal',
    html: emailTemplates.notification({ message })
  });
};

export const sendOrderConfirmationEmail = async ({ to, name, orderNumber, totalAmount, items }) => {
  return sendEmail({
    to,
    subject: `Order Confirmed - ${orderNumber}`,
    html: emailTemplates.orderConfirmation({ name, orderNumber, totalAmount, items })
  });
};

export const sendOrderShippedEmail = async ({ to, name, orderNumber, trackingNumber, courier, estimatedDelivery }) => {
  return sendEmail({
    to,
    subject: `Order Shipped - ${orderNumber}`,
    html: emailTemplates.orderShipped({ name, orderNumber, trackingNumber, courier, estimatedDelivery })
  });
};

export const sendOrderDeliveredEmail = async ({ to, name, orderNumber, deliveryDate }) => {
  return sendEmail({
    to,
    subject: `Order Delivered - ${orderNumber}`,
    html: emailTemplates.orderDelivered({ name, orderNumber, deliveryDate })
  });
};

export const sendPaymentSuccessEmail = async ({ to, name, orderNumber, amount, paymentMethod }) => {
  return sendEmail({
    to,
    subject: `Payment Successful - ${orderNumber}`,
    html: emailTemplates.paymentSuccess({ name, orderNumber, amount, paymentMethod })
  });
};

export const sendPaymentFailedEmail = async ({ to, name, orderNumber, amount, reason }) => {
  return sendEmail({
    to,
    subject: `Payment Failed - ${orderNumber}`,
    html: emailTemplates.paymentFailed({ to, name, orderNumber, amount, reason })
  });
};

export const sendLowStockAlertEmail = async ({ to, productName, sku, currentStock, threshold, productUrl }) => {
  return sendEmail({
    to,
    subject: `⚠️ Low Stock Alert: ${productName}`,
    html: emailTemplates.lowStockAlert({ productName, sku, currentStock, threshold, productUrl })
  });
};

import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import { config } from '../config/config.js';

// Debug log for SMTP config
logger.info('SMTP Config:', {
  host: config.smtp.host,
  port: config.smtp.port,
  user: config.smtp.user,
  pass: config.smtp.pass ? '***' : undefined
});

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: Number(config.smtp.port),
  secure: false,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass
  }
});

export const sendEmail = async ({ to, subject, html }) => {
  try {
    if (process.env.NODE_ENV === 'test') {
      return {
        accepted: [to],
        rejected: [],
        messageId: `test-${Date.now()}`,
        subject,
        html
      };
    }

    const info = await transporter.sendMail({
      from: `AQHerbal <${config.smtp.user}>`,
      to,
      subject,
      html
    });
    logger.info(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email error: ${error.message}`);
    throw error;
  }
};
