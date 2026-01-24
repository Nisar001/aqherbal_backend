/**
 * Email Link Generator
 * Safely constructs frontend URLs for email templates
 * Ensures FRONTEND_URL is properly configured before building links
 */

import { getFrontendUrl } from '../config/business.config.js';

export const emailLinks = {
  /**
   * Get order tracking link
   * @param {string} orderNumber - Order number
   * @returns {string} Full URL
   */
  trackOrder: (orderNumber) => {
    try {
      return getFrontendUrl(`/orders/${orderNumber}/tracking`);
    } catch (error) {
      console.error('Failed to build track order link:', error.message);
      throw error;
    }
  },

  /**
   * Get order review link
   * @param {string} orderNumber - Order number
   * @returns {string} Full URL
   */
  reviewOrder: (orderNumber) => {
    try {
      return getFrontendUrl(`/orders/${orderNumber}/review`);
    } catch (error) {
      console.error('Failed to build review order link:', error.message);
      throw error;
    }
  },

  /**
   * Get payment retry link
   * @param {string} orderNumber - Order number
   * @returns {string} Full URL
   */
  retryPayment: (orderNumber) => {
    try {
      return getFrontendUrl(`/orders/${orderNumber}/payment`);
    } catch (error) {
      console.error('Failed to build retry payment link:', error.message);
      throw error;
    }
  },

  /**
   * Get email verification link
   * @param {string} token - Verification token
   * @returns {string} Full URL
   */
  verifyEmail: (token) => {
    try {
      return getFrontendUrl(`/auth/verify?token=${token}`);
    } catch (error) {
      console.error('Failed to build verify email link:', error.message);
      throw error;
    }
  },

  /**
   * Get password reset link
   * @param {string} token - Reset token
   * @returns {string} Full URL
   */
  resetPassword: (token) => {
    try {
      return getFrontendUrl(`/auth/reset-password?token=${token}`);
    } catch (error) {
      console.error('Failed to build reset password link:', error.message);
      throw error;
    }
  }
};
