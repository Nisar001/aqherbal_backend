import { indiaPostClient } from '../integrations/indiaPost/indiaPostClient.js';
import { ShipmentModel } from '../models/shipment.model.js';
import { OrderModel } from '../models/order.model.js';
import logger from '../utils/logger.js';
import { COURIER_PROVIDERS, SHIPMENT_STATUS } from '../constants/shipmentStatus.js';
import { ORDER_STATUS } from '../constants/orderStatus.js';
import { NotificationService } from './notification.service.js';

class ShipmentService {
  /**
   * Create a new shipment for an order
   */
  async createShipment(orderId, shipmentData, createdBy) {
    try {
      const order = await OrderModel.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status === ORDER_STATUS.CANCELLED) {
        throw new Error('Cannot create shipment for cancelled order');
      }

      // Validate tracking number format
      if (!this._validateTrackingNumber(shipmentData.courierProvider, shipmentData.trackingNumber)) {
        throw new Error('Invalid tracking number format');
      }

      // Check for duplicate tracking number
      const existingShipment = await ShipmentModel.findOne({
        trackingNumber: shipmentData.trackingNumber,
        isDeleted: false
      });

      if (existingShipment) {
        throw new Error('Tracking number already exists');
      }

      // Create shipment
      const shipment = new ShipmentModel({
        orderId: order._id,
        userId: order.userId,
        courierProvider: shipmentData.courierProvider,
        trackingNumber: shipmentData.trackingNumber,
        consignmentNumber: shipmentData.consignmentNumber,
        estimatedDeliveryDate: shipmentData.estimatedDeliveryDate,
        shippingAddress: order.shippingAddress,
        weight: shipmentData.weight,
        dimensions: shipmentData.dimensions,
        metadata: shipmentData.metadata || {}
      });

      // Add initial tracking event
      shipment.addTrackingEvent({
        status: SHIPMENT_STATUS.LABEL_CREATED,
        location: shipmentData.originLocation || 'Origin',
        timestamp: new Date(),
        description: 'Shipment label created and order dispatched'
      });

      await shipment.save();

      // Update order
      order.trackingNumber = shipmentData.trackingNumber;
      order.status = ORDER_STATUS.SHIPPED;
      order.statusHistory.push({
        status: ORDER_STATUS.SHIPPED,
        changedAt: new Date(),
        changedBy: createdBy,
        notes: `Shipped via ${shipmentData.courierProvider}. Tracking: ${shipmentData.trackingNumber}`
      });

      await order.save();

      // Send notification
      await NotificationService.notifyOrderStatusChange(
        order._id,
        order.userId,
        ORDER_STATUS.SHIPPED,
        {
          trackingNumber: shipmentData.trackingNumber,
          courier: shipmentData.courierProvider
        }
      );

      logger.info(`Shipment created for order ${orderId}: ${shipment._id}`);

      return shipment;
    } catch (error) {
      logger.error('Error creating shipment:', error);
      throw error;
    }
  }

  /**
   * Get shipment by ID
   */
  async getShipmentById(shipmentId) {
    const shipment = await ShipmentModel.findOne({
      _id: shipmentId,
      isDeleted: false
    }).populate('orderId', 'orderNumber totalAmount items')
      .populate('userId', 'name email phone');

    return shipment;
  }

  /**
   * Get shipment by order ID
   */
  async getShipmentByOrderId(orderId) {
    const shipment = await ShipmentModel.findOne({
      orderId,
      isDeleted: false
    }).populate('orderId', 'orderNumber totalAmount items')
      .populate('userId', 'name email phone');

    return shipment;
  }

  /**
   * Get shipment by tracking number
   */
  async getShipmentByTrackingNumber(trackingNumber) {
    const shipment = await ShipmentModel.findOne({
      trackingNumber,
      isDeleted: false
    }).populate('orderId', 'orderNumber totalAmount items')
      .populate('userId', 'name email phone');

    return shipment;
  }

  /**
   * Track shipment and update status
   */
  async trackShipment(shipmentId, forceRefresh = false) {
    try {
      const shipment = await ShipmentModel.findOne({
        _id: shipmentId,
        isDeleted: false
      });

      if (!shipment) {
        throw new Error('Shipment not found');
      }

      // Check if sync is needed
      if (!forceRefresh && !shipment.needsSync()) {
        logger.info(`Shipment ${shipmentId} doesn't need sync yet`);
        return shipment;
      }

      // Fetch tracking data from courier
      const trackingData = await this._fetchTrackingData(shipment.courierProvider, shipment.trackingNumber);

      // Update shipment with new events
      const newEvents = this._getNewEvents(shipment.trackingEvents, trackingData.events);

      for (const event of newEvents) {
        shipment.addTrackingEvent(event);
      }

      if (trackingData.estimatedDeliveryDate && !shipment.estimatedDeliveryDate) {
        shipment.estimatedDeliveryDate = trackingData.estimatedDeliveryDate;
      }

      shipment.updateSyncStatus(true);
      await shipment.save();

      // If delivered, update order
      if (shipment.isDelivered()) {
        await this._handleDelivery(shipment);
      }

      logger.info(`Shipment ${shipmentId} tracked successfully`);

      return shipment;
    } catch (error) {
      logger.error(`Error tracking shipment ${shipmentId}:`, error);

      // Update sync error
      const shipment = await ShipmentModel.findById(shipmentId);
      if (shipment) {
        shipment.updateSyncStatus(false, error.message);
        await shipment.save();
      }

      throw error;
    }
  }

  /**
   * Get all shipments with filters
   */
  async getShipments(filters = {}, pagination = {}) {
    const { page = 1, limit = 20, sortBy = '-createdAt' } = pagination;
    const skip = (page - 1) * limit;

    const query = { isDeleted: false };

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.courierProvider) {
      query.courierProvider = filters.courierProvider;
    }

    if (filters.currentStatus) {
      query.currentStatus = filters.currentStatus;
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.createdAt.$lte = new Date(filters.toDate);
    }

    const [shipments, total] = await Promise.all([
      ShipmentModel.find(query)
        .populate('orderId', 'orderNumber totalAmount')
        .populate('userId', 'name email phone')
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .lean(),
      ShipmentModel.countDocuments(query)
    ]);

    return {
      shipments,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    };
  }

  /**
   * Update shipment manually (for corrections)
   */
  async updateShipment(shipmentId, updates, updatedBy) {
    const shipment = await ShipmentModel.findOne({
      _id: shipmentId,
      isDeleted: false
    });

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    const allowedUpdates = [
      'estimatedDeliveryDate',
      'weight',
      'dimensions',
      'metadata'
    ];

    for (const key of Object.keys(updates)) {
      if (allowedUpdates.includes(key)) {
        shipment[key] = updates[key];
      }
    }

    await shipment.save();

    logger.info(`Shipment ${shipmentId} updated by ${updatedBy}`);

    return shipment;
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(shipmentId, reason, cancelledBy) {
    const shipment = await ShipmentModel.findOne({
      _id: shipmentId,
      isDeleted: false
    });

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    if (shipment.isDelivered()) {
      throw new Error('Cannot cancel delivered shipment');
    }

    shipment.addTrackingEvent({
      status: SHIPMENT_STATUS.CANCELLED,
      location: 'System',
      timestamp: new Date(),
      description: `Shipment cancelled: ${reason}`
    });

    shipment.isActive = false;
    await shipment.save();

    logger.info(`Shipment ${shipmentId} cancelled by ${cancelledBy}`);

    return shipment;
  }

  /**
   * Get shipments that need sync
   */
  async getShipmentsForSync(limit = 50) {
    const shipments = await ShipmentModel.find({
      isActive: true,
      isDeleted: false,
      currentStatus: {
        $nin: [SHIPMENT_STATUS.DELIVERED, SHIPMENT_STATUS.FAILED, SHIPMENT_STATUS.CANCELLED]
      }
    })
      .sort('lastSyncAt')
      .limit(limit);

    return shipments.filter(shipment => shipment.needsSync());
  }

  /**
   * Bulk track shipments (for background job)
   */
  async bulkTrackShipments() {
    try {
      const shipments = await this.getShipmentsForSync();
      logger.info(`Found ${shipments.length} shipments to sync`);

      const results = {
        success: 0,
        failed: 0,
        skipped: 0
      };

      for (const shipment of shipments) {
        try {
          await this.trackShipment(shipment._id, true);
          results.success++;
        } catch (error) {
          logger.error(`Failed to track shipment ${shipment._id}:`, error);
          results.failed++;
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.info('Bulk tracking completed:', results);

      return results;
    } catch (error) {
      logger.error('Error in bulk tracking:', error);
      throw error;
    }
  }

  /**
   * Private helper: Fetch tracking data from courier
   */
  async _fetchTrackingData(courierProvider, trackingNumber) {
    switch (courierProvider) {
    case COURIER_PROVIDERS.INDIA_POST:
    case COURIER_PROVIDERS.SPEED_POST:
      return await indiaPostClient.trackShipment(trackingNumber);

      // Add more courier integrations here
    case COURIER_PROVIDERS.DELHIVERY:
    case COURIER_PROVIDERS.BLUEDART:
    case COURIER_PROVIDERS.DTDC:
      throw new Error(`Courier ${courierProvider} integration not yet implemented`);

    default:
      throw new Error(`Unsupported courier provider: ${courierProvider}`);
    }
  }

  /**
   * Private helper: Validate tracking number
   */
  _validateTrackingNumber(courierProvider, trackingNumber) {
    switch (courierProvider) {
    case COURIER_PROVIDERS.INDIA_POST:
    case COURIER_PROVIDERS.SPEED_POST:
      return indiaPostClient.isValidTrackingNumber(trackingNumber);

    default:
      // Basic validation for other providers
      return trackingNumber && trackingNumber.length >= 8;
    }
  }

  /**
   * Private helper: Get new tracking events
   */
  _getNewEvents(existingEvents, newEvents) {
    const existingTimestamps = new Set(
      existingEvents.map(e => e.timestamp.toISOString())
    );

    return newEvents.filter(event => {
      const timestamp = new Date(event.timestamp).toISOString();
      return !existingTimestamps.has(timestamp);
    });
  }

  /**
   * Private helper: Handle delivery
   */
  async _handleDelivery(shipment) {
    try {
      const order = await OrderModel.findById(shipment.orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Update order status
      order.status = ORDER_STATUS.DELIVERED;
      order.deliveredAt = shipment.actualDeliveryDate || new Date();
      order.statusHistory.push({
        status: ORDER_STATUS.DELIVERED,
        changedAt: new Date(),
        changedBy: null, // System update
        notes: 'Order delivered successfully'
      });

      await order.save();

      // Send delivery notification
      await NotificationService.notifyOrderStatusChange(
        order._id,
        order.userId,
        ORDER_STATUS.DELIVERED,
        {
          deliveryDate: order.deliveredAt
        }
      );

      logger.info(`Order ${order._id} marked as delivered`);
    } catch (error) {
      logger.error(`Error handling delivery for shipment ${shipment._id}:`, error);
      // Don't throw - this is a background operation
    }
  }
}

export default new ShipmentService();
