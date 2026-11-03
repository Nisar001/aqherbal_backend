import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface MemoryEntry {
  value: string;
  expiresAt: number | null;
}

/**
 * Key/value cache used for OTP codes, refresh-token revocation lists, etc.
 *
 * Uses Redis when REDIS_DISABLED=false, otherwise falls back to an in-process
 * Map (fine for dev/single-instance; production should run Redis).
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new Map<string, MemoryEntry>();
  private redis: Redis | null = null;

  constructor(configService: ConfigService) {
    const disabled = configService.get<boolean>('REDIS_DISABLED', true);
    if (!disabled) {
      const url = configService.get<string>(
        'REDIS_URL',
        'redis://localhost:6379',
      );
      this.redis = new Redis(url, {
        lazyConnect: false,
        maxRetriesPerRequest: 1,
      });
      this.redis.on('error', (err) =>
        this.logger.warn(`Redis error: ${err.message}`),
      );
      this.logger.log(`Redis cache enabled (${url})`);
    } else {
      this.logger.log('Redis disabled — using in-memory cache');
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.redis) return this.redis.get(key);
    const entry = this.memory.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.redis) {
      if (ttlSeconds) await this.redis.set(key, value, 'EX', ttlSeconds);
      else await this.redis.set(key, value);
      return;
    }
    this.memory.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async del(key: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(key);
      return;
    }
    this.memory.delete(key);
  }

  /** Atomically decrements a counter; returns the new value (used by OTP resend limits). */
  async decr(key: string, ttlSeconds: number): Promise<number> {
    if (this.redis) {
      const remaining = await this.redis.decr(key);
      if (remaining === ttlSeconds - 1 || remaining < 0) {
        await this.redis.expire(key, ttlSeconds);
      }
      return remaining;
    }
    const current = await this.get(key);
    const next = (current ? parseInt(current, 10) : 0) - 1;
    await this.set(key, String(next), ttlSeconds);
    return next;
  }

  onModuleDestroy(): void {
    if (this.redis) void this.redis.quit();
    this.memory.clear();
  }
}
