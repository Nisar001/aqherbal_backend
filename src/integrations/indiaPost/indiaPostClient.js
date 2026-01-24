import fetch from 'node-fetch';
import logger from '../../utils/logger.js';
import { INDIA_POST_STATUS_MAP, SHIPMENT_STATUS } from '../../constants/shipmentStatus.js';

/**
 * India Post API Client
 * Note: India Post doesn't have an official public API yet.
 * This implementation uses the unofficial tracking endpoint.
 * For production, consider using aggregator APIs like Delhivery, ShipRocket, or Shiprocket
 */
class IndiaPostClient {
  constructor() {
    this.baseURL = process.env.INDIA_POST_API_URL || 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx';
    this.timeout = parseInt(process.env.INDIA_POST_TIMEOUT || '10000', 10);
    this.maxRetries = 3;
  }

  /**
   * Track a consignment by tracking number
   * @param {string} trackingNumber - The tracking/consignment number
   * @returns {Promise<Object>} Normalized tracking data
   */
  async trackShipment(trackingNumber) {
    try {
      logger.info(`Tracking India Post shipment: ${trackingNumber}`);

      const trackingData = await this._fetchTrackingData(trackingNumber);

      if (!trackingData || !trackingData.events || trackingData.events.length === 0) {
        throw new Error('No tracking information available');
      }

      return this._normalizeTrackingData(trackingData);
    } catch (error) {
      logger.error(`India Post tracking error for ${trackingNumber}:`, error);
      throw new Error(`Failed to fetch tracking data: ${error.message}`);
    }
  }

  /**
   * Fetch tracking data from India Post
   * @private
   */
  async _fetchTrackingData(trackingNumber) {
    // Since India Post doesn't have a proper API, we have a few options:
    // 1. Use web scraping (not recommended for production)
    // 2. Use third-party aggregators (Delhivery, ShipRocket, Ship24, AfterShip)
    // 3. Mock data for development

    // For now, we'll implement a mock/fallback with clear extension points
    if (process.env.USE_INDIA_POST_AGGREGATOR === 'true') {
      return await this._fetchFromAggregator(trackingNumber);
    }

    // Mock implementation for development
    return this._getMockTrackingData(trackingNumber);
  }

  /**
   * Fetch from third-party aggregator (Ship24, AfterShip, etc.)
   * @private
   */
  async _fetchFromAggregator(trackingNumber) {
    const aggregatorURL = process.env.TRACKING_AGGREGATOR_URL;
    const apiKey = process.env.TRACKING_AGGREGATOR_API_KEY;

    if (!aggregatorURL || !apiKey) {
      throw new Error('Tracking aggregator not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${aggregatorURL}/track/${trackingNumber}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Aggregator API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this._parseAggregatorResponse(data);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Parse aggregator API response
   * @private
   */
  _parseAggregatorResponse(data) {
    // This would be customized based on the aggregator being used
    // Example for generic structure:
    return {
      trackingNumber: data.trackingNumber || data.tracking_number,
      status: data.status,
      estimatedDelivery: data.estimatedDelivery || data.estimated_delivery,
      events: (data.events || data.trackingEvents || []).map(event => ({
        status: event.status || event.statusDescription,
        location: event.location || event.city,
        timestamp: new Date(event.timestamp || event.eventTime),
        description: event.description || event.statusDescription
      }))
    };
  }

  /**
   * Mock tracking data for development/testing
   * @private
   */
  _getMockTrackingData(trackingNumber) {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    // Simulate different stages based on tracking number pattern
    const stage = parseInt(trackingNumber.slice(-1), 10) % 5;

    const baseEvents = [
      {
        status: 'Item Booked',
        location: 'Mumbai, Maharashtra',
        timestamp: threeDaysAgo,
        description: 'Item has been booked and accepted by India Post'
      },
      {
        status: 'Item Bagged',
        location: 'Mumbai GPO, Maharashtra',
        timestamp: threeDaysAgo,
        description: 'Item bagged for dispatch'
      }
    ];

    const additionalEvents = [
      [
        {
          status: 'In Transit',
          location: 'Delhi, Delhi',
          timestamp: twoDaysAgo,
          description: 'Item in transit to destination'
        }
      ],
      [
        {
          status: 'In Transit',
          location: 'Delhi, Delhi',
          timestamp: twoDaysAgo,
          description: 'Item in transit'
        },
        {
          status: 'Reached at Hub',
          location: 'Bangalore, Karnataka',
          timestamp: oneDayAgo,
          description: 'Item reached at destination hub'
        }
      ],
      [
        {
          status: 'In Transit',
          location: 'Delhi, Delhi',
          timestamp: twoDaysAgo,
          description: 'Item in transit'
        },
        {
          status: 'Reached at Hub',
          location: 'Bangalore, Karnataka',
          timestamp: oneDayAgo,
          description: 'Item reached at destination hub'
        },
        {
          status: 'Out for Delivery',
          location: 'Bangalore South, Karnataka',
          timestamp: now,
          description: 'Item out for delivery'
        }
      ],
      [
        {
          status: 'In Transit',
          location: 'Delhi, Delhi',
          timestamp: twoDaysAgo,
          description: 'Item in transit'
        },
        {
          status: 'Reached at Hub',
          location: 'Bangalore, Karnataka',
          timestamp: oneDayAgo,
          description: 'Item reached at destination hub'
        },
        {
          status: 'Out for Delivery',
          location: 'Bangalore South, Karnataka',
          timestamp: oneDayAgo,
          description: 'Item out for delivery'
        },
        {
          status: 'Item Delivered',
          location: 'Bangalore South, Karnataka',
          timestamp: now,
          description: 'Item delivered successfully'
        }
      ]
    ];

    return {
      trackingNumber,
      status: additionalEvents[stage]?.slice(-1)[0]?.status || 'Item Booked',
      estimatedDelivery: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      events: [...baseEvents, ...(additionalEvents[stage] || [])]
    };
  }

  /**
   * Normalize tracking data to our internal format
   * @private
   */
  _normalizeTrackingData(trackingData) {
    const events = (trackingData.events || []).map(event => ({
      status: this._mapStatus(event.status),
      rawStatus: event.status,
      location: event.location,
      timestamp: new Date(event.timestamp),
      description: event.description || event.status,
      metadata: {
        originalData: event
      }
    }));

    const latestEvent = events[events.length - 1];

    return {
      trackingNumber: trackingData.trackingNumber,
      currentStatus: latestEvent?.status || SHIPMENT_STATUS.PENDING,
      estimatedDeliveryDate: trackingData.estimatedDelivery ? new Date(trackingData.estimatedDelivery) : null,
      events,
      lastUpdate: latestEvent?.timestamp || new Date(),
      metadata: {
        rawData: trackingData
      }
    };
  }

  /**
   * Map India Post status to our internal status
   * @private
   */
  _mapStatus(rawStatus) {
    const mapped = INDIA_POST_STATUS_MAP[rawStatus];
    if (mapped) {
      return mapped;
    }

    // Fallback mapping based on keywords
    const lowerStatus = rawStatus.toLowerCase();
    if (lowerStatus.includes('deliver')) return SHIPMENT_STATUS.DELIVERED;
    if (lowerStatus.includes('out for')) return SHIPMENT_STATUS.OUT_FOR_DELIVERY;
    if (lowerStatus.includes('transit') || lowerStatus.includes('dispatch')) return SHIPMENT_STATUS.IN_TRANSIT;
    if (lowerStatus.includes('book')) return SHIPMENT_STATUS.LABEL_CREATED;
    if (lowerStatus.includes('return')) return SHIPMENT_STATUS.RETURNED;
    if (lowerStatus.includes('fail') || lowerStatus.includes('lost')) return SHIPMENT_STATUS.FAILED;

    return SHIPMENT_STATUS.IN_TRANSIT; // Default fallback
  }

  /**
   * Validate tracking number format
   */
  isValidTrackingNumber(trackingNumber) {
    if (!trackingNumber || typeof trackingNumber !== 'string') {
      return false;
    }

    // India Post tracking numbers are typically:
    // - Speed Post: 13 characters (e.g., EA123456789IN)
    // - Registered Post: Varies, often 13 characters
    // Pattern: 2 letters + 9 digits + 2 letters (country code)
    const speedPostPattern = /^[A-Z]{2}\d{9}[A-Z]{2}$/;

    // Also accept numeric patterns (some legacy formats)
    const numericPattern = /^\d{10,15}$/;

    return speedPostPattern.test(trackingNumber) || numericPattern.test(trackingNumber);
  }
}

export const indiaPostClient = new IndiaPostClient();
