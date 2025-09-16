/**
 * Redis Client Service for CVPlus Analytics
import { Redis } from 'ioredis';

class RedisClientService {
  private client: Redis | null = null;

  getClient(): Redis {
    if (!this.client) {
      // Use environment variables or defaults for Redis connection
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });
    }
    return this.client;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}

export const redisClient = new RedisClientService().getClient();