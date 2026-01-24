import cron from 'node-cron';
import ShipmentService from '../services/shipment.service.js';
import logger from '../utils/logger.js';

/**
 * Shipment tracking background job
 * Runs every 4 hours to update active shipments
 */
class ShipmentTrackingJob {
  constructor() {
    this.cronSchedule = process.env.SHIPMENT_TRACKING_CRON || '0 */4 * * *'; // Every 4 hours
    this.isRunning = false;
    this.job = null;
  }

  /**
   * Start the cron job
   */
  start() {
    if (this.job) {
      logger.warn('Shipment tracking job is already running');
      return;
    }

    this.job = cron.schedule(this.cronSchedule, async () => {
      await this.run();
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'Asia/Kolkata'
    });

    logger.info(`Shipment tracking job started with schedule: ${this.cronSchedule}`);
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      logger.info('Shipment tracking job stopped');
    }
  }

  /**
   * Execute the job
   */
  async run() {
    if (this.isRunning) {
      logger.warn('Shipment tracking job is already running, skipping this execution');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting shipment tracking job...');

      const results = await ShipmentService.bulkTrackShipments();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      logger.info(`Shipment tracking job completed in ${duration}s:`, {
        success: results.success,
        failed: results.failed,
        skipped: results.skipped
      });
    } catch (error) {
      logger.error('Shipment tracking job failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Manually trigger the job (for testing or admin action)
   */
  async trigger() {
    logger.info('Manually triggering shipment tracking job...');
    await this.run();
  }
}

export const shipmentTrackingJob = new ShipmentTrackingJob();
