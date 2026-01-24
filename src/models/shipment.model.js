import mongoose from 'mongoose';
import { SHIPMENT_STATUS, COURIER_PROVIDERS } from '../constants/shipmentStatus.js';

const trackingEventSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: Object.values(SHIPMENT_STATUS),
    required: true
  },
  location: String,
  timestamp: {
    type: Date,
    required: true
  },
  description: String,
  rawStatus: String, // Original status from courier API
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const shipmentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courierProvider: {
    type: String,
    enum: Object.values(COURIER_PROVIDERS),
    required: true,
    index: true
  },
  trackingNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  consignmentNumber: String, // Some couriers use different reference numbers
  currentStatus: {
    type: String,
    enum: Object.values(SHIPMENT_STATUS),
    default: SHIPMENT_STATUS.PENDING,
    index: true
  },
  estimatedDeliveryDate: Date,
  actualDeliveryDate: Date,
  shippingAddress: {
    name: String,
    phone: String,
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: 'India' }
  },
  weight: Number, // in grams
  dimensions: {
    length: Number,
    width: Number,
    height: Number
  },
  trackingEvents: [trackingEventSchema],
  lastTrackedAt: Date,
  lastSyncAt: Date,
  syncAttempts: { type: Number, default: 0 },
  syncErrors: [{
    error: String,
    timestamp: { type: Date, default: Date.now }
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Compound indexes for efficient queries
shipmentSchema.index({ orderId: 1, isDeleted: 1 });
shipmentSchema.index({ userId: 1, currentStatus: 1, isDeleted: 1 });
shipmentSchema.index({ courierProvider: 1, currentStatus: 1 });
shipmentSchema.index({ lastSyncAt: 1, isActive: 1 });

// Instance methods
shipmentSchema.methods.addTrackingEvent = function (event) {
  this.trackingEvents.push(event);
  this.currentStatus = event.status;
  this.lastTrackedAt = event.timestamp;

  if (event.status === SHIPMENT_STATUS.DELIVERED) {
    this.actualDeliveryDate = event.timestamp;
    this.isActive = false;
  }
};

shipmentSchema.methods.updateSyncStatus = function (success = true, error = null) {
  this.lastSyncAt = new Date();
  this.syncAttempts += 1;

  if (!success && error) {
    this.syncErrors.push({ error, timestamp: new Date() });
    // Keep only last 10 errors
    if (this.syncErrors.length > 10) {
      this.syncErrors = this.syncErrors.slice(-10);
    }
  }
};

shipmentSchema.methods.isDelivered = function () {
  return this.currentStatus === SHIPMENT_STATUS.DELIVERED;
};

shipmentSchema.methods.isFailed = function () {
  return [SHIPMENT_STATUS.FAILED, SHIPMENT_STATUS.RETURNED, SHIPMENT_STATUS.CANCELLED].includes(this.currentStatus);
};

shipmentSchema.methods.needsSync = function () {
  if (!this.isActive || this.isDeleted) return false;
  if (this.isDelivered() || this.isFailed()) return false;

  const now = new Date();
  const lastSync = this.lastSyncAt || this.createdAt;
  const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);

  // Sync more frequently for active deliveries
  if (this.currentStatus === SHIPMENT_STATUS.OUT_FOR_DELIVERY) {
    return hoursSinceSync >= 0.5; // Every 30 minutes
  }

  return hoursSinceSync >= 4; // Every 4 hours for other statuses
};

export const ShipmentModel = mongoose.model('Shipment', shipmentSchema);
