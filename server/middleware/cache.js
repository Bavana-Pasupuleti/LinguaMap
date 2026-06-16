// In-memory cache for local dev (no Redis required)
// Falls back to Redis when REDIS_URL is set

const USE_REDIS = !!process.env.REDIS_URL;
let redis = null;
const memCache = new Map();

if (USE_REDIS) {
  try {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL);
  } catch {
    console.log('Redis not available, using in-memory cache');
  }
}

const DEFAULT_TTL = 3600;

function cacheMiddleware(ttl = DEFAULT_TTL) {
  return async (req, res, next) => {
    const key = `api:${req.originalUrl}`;

    try {
      if (redis) {
        const cached = await redis.get(key);
        if (cached) return res.json(JSON.parse(cached));
      } else {
        const entry = memCache.get(key);
        if (entry && entry.expires > Date.now()) {
          return res.json(entry.data);
        }
      }
    } catch (err) {
      // cache miss, continue
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      try {
        if (redis) {
          redis.setex(key, ttl, JSON.stringify(data)).catch(() => {});
        } else {
          memCache.set(key, { data, expires: Date.now() + ttl * 1000 });
        }
      } catch {}
      return originalJson(data);
    };

    next();
  };
}

module.exports = { cacheMiddleware, redis };
