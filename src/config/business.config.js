/**
 * Business Configuration
 * Centralized business rules and pricing logic
 * All values configurable via environment variables
 */

const parseList = (value, fallback) => {
  if (!value) return fallback;
  const parsed = value.split(',').map((item) => item.trim()).filter(Boolean);
  return parsed.length ? parsed : fallback;
};

export const BUSINESS_CONFIG = {
  // Tax Configuration
  TAX: {
    DEFAULT_RATE: parseFloat(process.env.TAX_RATE || '0.1'), // 10% default
    GST_RATE: parseFloat(process.env.GST_RATE || '0.18'), // 18% GST

    // State-specific tax rates (Indian states)
    STATE_RATES: {
      'Maharashtra': 0.10,
      'Karnataka': 0.10,
      'Delhi': 0.10,
      'Tamil Nadu': 0.10,
      'Gujarat': 0.10,
      'Rajasthan': 0.10,
      'Uttar Pradesh': 0.10,
      'West Bengal': 0.10,
      'Andhra Pradesh': 0.10,
      'Telangana': 0.10,
      'Kerala': 0.10,
      'Madhya Pradesh': 0.10,
      'Bihar': 0.10,
      'Punjab': 0.10,
      'Haryana': 0.10,
      'Assam': 0.10,
      'Odisha': 0.10,
      'Jharkhand': 0.10,
      'Chhattisgarh': 0.10,
      'Uttarakhand': 0.10,
      'Himachal Pradesh': 0.10,
      'Jammu and Kashmir': 0.10,
      'Goa': 0.10
    }
  },

  // Shipping Configuration
  SHIPPING: {
    FREE_THRESHOLD: parseFloat(process.env.FREE_SHIPPING_THRESHOLD || '500'), // Free shipping above ₹500
    DEFAULT_COST: parseFloat(process.env.SHIPPING_COST || '0'), // Standard shipping
    EXPRESS_COST: parseFloat(process.env.EXPRESS_SHIPPING_COST || '100'), // Express shipping ₹100

    // Zone-based shipping (if implemented)
    ZONE_RATES: {
      metro: 0,
      urban: 50,
      rural: 100
    }
  },

  // Inventory Thresholds
  INVENTORY: {
    LOW_STOCK_THRESHOLD: parseInt(process.env.LOW_STOCK_THRESHOLD || '10', 10),
    OUT_OF_STOCK_THRESHOLD: parseInt(process.env.OUT_OF_STOCK_THRESHOLD || '0', 10),
    REORDER_QUANTITY: parseInt(process.env.REORDER_QUANTITY || '50', 10)
  },

  // Order Configuration
  ORDER: {
    CANCELLATION_WINDOW_HOURS: parseInt(process.env.ORDER_CANCELLATION_WINDOW || '24', 10),
    RETURN_WINDOW_DAYS: parseInt(process.env.ORDER_RETURN_WINDOW || '7', 10),
    AUTO_CANCEL_PENDING_HOURS: parseInt(process.env.AUTO_CANCEL_PENDING_HOURS || '48', 10)
  },

  // Payment Configuration
  PAYMENT: {
    MAX_RETRY_ATTEMPTS: parseInt(process.env.PAYMENT_MAX_RETRIES || '3', 10),
    RETRY_WINDOW_HOURS: parseInt(process.env.PAYMENT_RETRY_WINDOW || '24', 10),
    SUPPORTED_METHODS: parseList(process.env.PAYMENT_METHODS, ['card', 'netbanking', 'upi']),
    RAZORPAY_METHODS: parseList(process.env.RAZORPAY_METHODS, ['card', 'netbanking', 'upi']),
    DEFAULT_CURRENCY: process.env.PAYMENT_CURRENCY || 'INR'
  },

  // Review Configuration
  REVIEW: {
    MIN_RATING: 1,
    MAX_RATING: 5,
    VERIFIED_PURCHASE_ONLY: process.env.VERIFIED_REVIEWS_ONLY === 'true',
    MODERATION_REQUIRED: process.env.REVIEW_MODERATION === 'true'
  },

  // Coupon Configuration
  COUPON: {
    MAX_DISCOUNT_PERCENT: parseFloat(process.env.MAX_COUPON_DISCOUNT || '50'), // Max 50% discount
    MIN_ORDER_VALUE: parseFloat(process.env.MIN_COUPON_ORDER_VALUE || '100') // Min ₹100 order
  }
};

/**
 * Calculate tax for a given amount
 * @param {number} subtotal - Subtotal amount
 * @param {string} state - Customer state (optional)
 * @returns {number} Tax amount
 */
export const calculateTax = (subtotal, state = null) => {
  const rate = state && BUSINESS_CONFIG.TAX.STATE_RATES[state]
    ? BUSINESS_CONFIG.TAX.STATE_RATES[state]
    : BUSINESS_CONFIG.TAX.DEFAULT_RATE;

  return subtotal * rate;
};

/**
 * Calculate shipping cost
 * @param {number} subtotal - Order subtotal
 * @param {string} shippingMethod - 'standard' or 'express'
 * @param {string} zone - Shipping zone (optional)
 * @returns {number} Shipping cost
 */
export const calculateShipping = (subtotal, shippingMethod = 'standard', zone = null) => {
  // Free shipping if above threshold
  if (subtotal >= BUSINESS_CONFIG.SHIPPING.FREE_THRESHOLD) {
    return 0;
  }

  // Zone-based if provided
  if (zone && BUSINESS_CONFIG.SHIPPING.ZONE_RATES[zone] !== undefined) {
    return BUSINESS_CONFIG.SHIPPING.ZONE_RATES[zone];
  }

  // Method-based
  switch (shippingMethod) {
  case 'express':
    return BUSINESS_CONFIG.SHIPPING.EXPRESS_COST;
  case 'standard':
  default:
    return BUSINESS_CONFIG.SHIPPING.DEFAULT_COST;
  }
};

/**
 * Check if product is low stock
 * @param {number} currentStock - Current stock level
 * @param {number} customThreshold - Custom threshold (optional)
 * @returns {boolean}
 */
export const isLowStock = (currentStock, customThreshold = null) => {
  const threshold = customThreshold || BUSINESS_CONFIG.INVENTORY.LOW_STOCK_THRESHOLD;
  return currentStock <= threshold && currentStock > BUSINESS_CONFIG.INVENTORY.OUT_OF_STOCK_THRESHOLD;
};

/**
 * Check if product is out of stock
 * @param {number} currentStock - Current stock level
 * @returns {boolean}
 */
export const isOutOfStock = (currentStock) => {
  return currentStock <= BUSINESS_CONFIG.INVENTORY.OUT_OF_STOCK_THRESHOLD;
};

/**
 * Get Frontend URL for email links with validation
 * @param {string} path - Path to append (e.g., '/orders/123/payment')
 * @returns {string} Full URL
 * @throws {Error} If FRONTEND_URL is not configured
 */
export const getFrontendUrl = (path = '') => {
  const baseUrl = process.env.FRONTEND_URL;

  if (!baseUrl) {
    throw new Error(
      'FRONTEND_URL environment variable is not configured. ' +
      'Email links will not work. Set FRONTEND_URL in your .env file.'
    );
  }

  try {
    const url = new URL(path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`);
    return url.toString();
  } catch (error) {
    throw new Error(
      `Invalid FRONTEND_URL or path construction: ${baseUrl}${path}. ` +
      `Error: ${error.message}`
    );
  }
};
