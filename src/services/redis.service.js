import { createClient } from 'redis';
import logger from '../utils/logger.js';

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isDisabled = process.env.REDIS_DISABLED === 'true';
  }

  /**
   * Connect to Redis
   */
  async connect() {
    if (this.isDisabled) {
      logger.warn('Redis is disabled - running in fallback mode');
      return;
    }

    try {
      const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

      this.client = createClient({
        url: redisUrl,
        password: process.env.REDIS_PASSWORD,
        database: parseInt(process.env.REDIS_DB || '0', 10),
        socket: {
          connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10)
        }
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();

      logger.info('Redis connection established successfully');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      logger.warn('Running in fallback mode without Redis');
      this.isDisabled = true;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      logger.info('Redis connection closed');
    }
  }

  /**
   * Get value from cache
   */
  async get(key) {
    if (this.isDisabled || !this.isConnected) {
      return null;
    }

    try {
      const prefixedKey = this._getPrefixedKey(key);
      const value = await this.client.get(prefixedKey);

      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }

      return null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = null) {
    if (this.isDisabled || !this.isConnected) {
      return false;
    }

    try {
      const prefixedKey = this._getPrefixedKey(key);
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttl) {
        await this.client.setEx(prefixedKey, ttl, serializedValue);
      } else {
        await this.client.set(prefixedKey, serializedValue);
      }

      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete key from cache
   */
  async del(key) {
    if (this.isDisabled || !this.isConnected) {
      return false;
    }

    try {
      const prefixedKey = this._getPrefixedKey(key);
      await this.client.del(prefixedKey);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (this.isDisabled || !this.isConnected) {
      return false;
    }

    try {
      const prefixedKey = this._getPrefixedKey(key);
      const exists = await this.client.exists(prefixedKey);
      return exists === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key, seconds) {
    if (this.isDisabled || !this.isConnected) {
      return false;
    }

    try {
      const prefixedKey = this._getPrefixedKey(key);
      await this.client.expire(prefixedKey, seconds);
      return true;
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get multiple keys
   */
  async mget(keys) {
    if (this.isDisabled || !this.isConnected) {
      return [];
    }

    try {
      const prefixedKeys = keys.map(k => this._getPrefixedKey(k));
      const values = await this.client.mGet(prefixedKeys);

      return values.map(value => {
        if (!value) return null;

        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });
    } catch (error) {
      logger.error('Redis MGET error:', error);
      return [];
    }
  }

  /**
   * Increment counter
   */
  async incr(key) {
    if (this.isDisabled || !this.isConnected) {
      return 0;
    }

    try {
      const prefixedKey = this._getPrefixedKey(key);
      return await this.client.incr(prefixedKey);
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Decrement counter
   */
  async decr(key) {
    if (this.isDisabled || !this.isConnected) {
      return 0;
    }

    try {
      const prefixedKey = this._getPrefixedKey(key);
      return await this.client.decr(prefixedKey);
    } catch (error) {
      logger.error(`Redis DECR error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Delete keys matching pattern
   */
  async deletePattern(pattern) {
    if (this.isDisabled || !this.isConnected) {
      return 0;
    }

    try {
      const prefixedPattern = this._getPrefixedKey(pattern);
      const keys = [];

      for await (const key of this.client.scanIterator({
        MATCH: prefixedPattern,
        COUNT: 100
      })) {
        keys.push(key);
      }

      if (keys.length > 0) {
        await this.client.del(keys);
      }

      return keys.length;
    } catch (error) {
      logger.error(`Redis DELETE PATTERN error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Flush all cache
   */
  async flushAll() {
    if (this.isDisabled || !this.isConnected) {
      return false;
    }

    try {
      await this.client.flushDb();
      logger.info('Redis cache flushed');
      return true;
    } catch (error) {
      logger.error('Redis FLUSHALL error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (this.isDisabled) {
      return {
        enabled: false,
        connected: false,
        message: 'Redis is disabled'
      };
    }

    if (!this.isConnected) {
      return {
        enabled: true,
        connected: false,
        message: 'Redis is not connected'
      };
    }

    try {
      const info = await this.client.info('stats');
      const dbSize = await this.client.dbSize();

      return {
        enabled: true,
        connected: true,
        dbSize,
        info
      };
    } catch (error) {
      logger.error('Error getting Redis stats:', error);
      return {
        enabled: true,
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Get prefixed key
   */
  _getPrefixedKey(key) {
    const prefix = process.env.REDIS_KEY_PREFIX || 'aqherbal:';
    return `${prefix}${key}`;
  }
}

export const redisService = new RedisService();
