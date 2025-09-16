/**/**
 * Environment Configuration
 * 
 * Environment variables and configuration settings for the analytics module.
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

export interface EnvironmentConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  redisUrl?: string;
  enableCaching: boolean;
  cacheTimeout: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

const NODE_ENV = process.env.NODE_ENV || 'development';

export const environment: EnvironmentConfig = {
  isDevelopment: NODE_ENV === 'development',
  isProduction: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',
  redisUrl: process.env.REDIS_URL,
  enableCaching: process.env.ENABLE_CACHING !== 'false',
  cacheTimeout: parseInt(process.env.CACHE_TIMEOUT || '300', 10), // 5 minutes default
  logLevel: (process.env.LOG_LEVEL as any) || 'info',
};

export default environment;