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

