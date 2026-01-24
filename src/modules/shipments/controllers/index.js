import ShipmentService from '../../../services/shipment.service.js';
import { successResponse, errorResponse } from '../../../helpers/response.helper.js';
import logger from '../../../utils/logger.js';

/**
 * Admin: Create shipment for an order
 * POST /admin/orders/:orderId/assign-shipment
 */
export const createShipment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const shipmentData = req.body;
    const createdBy = req.user._id;

    const shipment = await ShipmentService.createShipment(orderId, shipmentData, createdBy);

    return successResponse(res, shipment, 'Shipment created successfully', 201);
  } catch (error) {
    logger.error('Create shipment error:', error);
    return errorResponse(res, error.message, 400);
  }
};

/**
 * Get shipment by tracking number (public)
 * GET /shipments/track/:trackingNumber
 */
export const trackByNumber = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { refresh } = req.query;

    let shipment = await ShipmentService.getShipmentByTrackingNumber(trackingNumber);

    if (!shipment) {
      return errorResponse(res, 'Shipment not found', 404);
    }

    // Refresh tracking data if requested or if stale
    if (refresh === 'true' || shipment.needsSync()) {
      shipment = await ShipmentService.trackShipment(shipment._id, refresh === 'true');
    }

    // Public view - limited information
    const publicData = {
      trackingNumber: shipment.trackingNumber,
      courierProvider: shipment.courierProvider,
      currentStatus: shipment.currentStatus,
      estimatedDeliveryDate: shipment.estimatedDeliveryDate,
      actualDeliveryDate: shipment.actualDeliveryDate,
      trackingEvents: shipment.trackingEvents.map(event => ({
        status: event.status,
        location: event.location,
        timestamp: event.timestamp,
        description: event.description
      })),
      lastUpdate: shipment.lastTrackedAt || shipment.updatedAt
    };

    return successResponse(res, publicData, 'Tracking information retrieved');
  } catch (error) {
    logger.error('Track by number error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get shipment for user's order
 * GET /orders/:orderId/tracking
 */
export const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;
    const { refresh } = req.query;

    let shipment = await ShipmentService.getShipmentByOrderId(orderId);

    if (!shipment) {
      return errorResponse(res, 'Shipment not found for this order', 404);
    }

    // Verify ownership
    if (shipment.userId.toString() !== userId.toString()) {
      return errorResponse(res, 'Unauthorized access', 403);
    }

    // Refresh if requested
    if (refresh === 'true' || shipment.needsSync()) {
      shipment = await ShipmentService.trackShipment(shipment._id, refresh === 'true');
    }

    return successResponse(res, shipment, 'Order tracking information retrieved');
  } catch (error) {
    logger.error('Get order tracking error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get all shipments with filters
 * GET /admin/shipments
 */
export const getShipments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = '-createdAt',
      courierProvider,
      currentStatus,
      isActive,
      userId,
      fromDate,
      toDate
    } = req.query;

    const filters = {};
    if (courierProvider) filters.courierProvider = courierProvider;
    if (currentStatus) filters.currentStatus = currentStatus;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (userId) filters.userId = userId;
    if (fromDate) filters.fromDate = fromDate;
    if (toDate) filters.toDate = toDate;

    const result = await ShipmentService.getShipments(
      filters,
      { page: parseInt(page), limit: parseInt(limit), sortBy }
    );

    return successResponse(res, {
      shipments: result.shipments,
      pagination: result.pagination
    }, 'Shipments retrieved successfully');
  } catch (error) {
    logger.error('Get shipments error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Get shipment by ID
 * GET /admin/shipments/:id
 */
export const getShipmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { refresh } = req.query;

    let shipment = await ShipmentService.getShipmentById(id);

    if (!shipment) {
      return errorResponse(res, 'Shipment not found', 404);
    }

    // Refresh if requested
    if (refresh === 'true') {
      shipment = await ShipmentService.trackShipment(id, true);
    }

    return successResponse(res, shipment, 'Shipment retrieved successfully');
  } catch (error) {
    logger.error('Get shipment by ID error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Manually refresh shipment tracking
 * POST /admin/shipments/:id/refresh
 */
export const refreshTracking = async (req, res) => {
  try {
    const { id } = req.params;

    const shipment = await ShipmentService.trackShipment(id, true);

    return successResponse(res, shipment, 'Tracking refreshed successfully');
  } catch (error) {
    logger.error('Refresh tracking error:', error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Admin: Update shipment
 * PUT /admin/shipments/:id
 */
export const updateShipment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updatedBy = req.user._id;

    const shipment = await ShipmentService.updateShipment(id, updates, updatedBy);

    return successResponse(res, shipment, 'Shipment updated successfully');
  } catch (error) {
    logger.error('Update shipment error:', error);
    return errorResponse(res, error.message, 400);
  }
};

/**
 * Admin: Cancel shipment
 * POST /admin/shipments/:id/cancel
 */
export const cancelShipment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const cancelledBy = req.user._id;

    if (!reason) {
      return errorResponse(res, 'Cancellation reason is required', 400);
    }

    const shipment = await ShipmentService.cancelShipment(id, reason, cancelledBy);

    return successResponse(res, shipment, 'Shipment cancelled successfully');
  } catch (error) {
    logger.error('Cancel shipment error:', error);
    return errorResponse(res, error.message, 400);
  }
};

/**
 * Admin: Bulk refresh tracking (manual trigger)
 * POST /admin/shipments/bulk-refresh
 */
export const bulkRefreshTracking = async (req, res) => {
  try {
    // Trigger async - don't wait for completion
    ShipmentService.bulkTrackShipments().catch(err => {
      logger.error('Bulk refresh error:', err);
    });

    return successResponse(res, null, 'Bulk tracking refresh initiated');
  } catch (error) {
    logger.error('Bulk refresh trigger error:', error);
    return errorResponse(res, error.message, 500);
  }
};
