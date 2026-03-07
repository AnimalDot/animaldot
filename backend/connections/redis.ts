/**
 * Redis connection scaffolding (Redis Streams).
 * High-frequency packets can be validated and routed here before persisting to TSDB.
 */

import { config } from '../config/env';

export const redisConfig = {
  url: config.redis.url,
  streamVitals: config.redis.streamVitals,
};

// Example: const Redis = require('ioredis');
// const redis = new Redis(redisConfig.url);
// await redis.xadd(redisConfig.streamVitals, '*', 'payload', JSON.stringify(vitalsPayload));
