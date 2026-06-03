import Redis from 'ioredis'
import { config } from '../config/index.js'

let redis: Redis | null = null

export function getRedis(): Redis {
  if (!redis && config.REDIS_URL !== 'disabled') {
    redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    })
  }

  // Return a mock Redis if disabled
  if (!redis || config.REDIS_URL === 'disabled') {
    return {
      get: async () => null,
      set: async () => {},
      del: async () => {},
      exists: async () => 0,
      expire: async () => {},
      ttl: async () => -1,
      flushall: async () => {},
      ping: async () => 'PONG',
      on: () => {},
      off: () => {},
      once: () => {},
      connect: async () => {},
      disconnect: async () => {},
      quit: async () => {},
      status: 'disconnected',
      options: {},
      pipeline: () => ({
        get: () => ({ exec: async () => [] }),
        set: () => ({ exec: async () => [] }),
        del: () => ({ exec: async () => [] }),
        exists: () => ({ exec: async () => [] }),
        expire: () => ({ exec: async () => [] }),
        ttl: () => ({ exec: async () => [] }),
      }),
    } as any
  }

  return redis!
}
