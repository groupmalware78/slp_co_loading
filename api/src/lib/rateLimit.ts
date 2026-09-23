import Redis from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";

// Per-company request limiting, keyed on Company.requestsPerMinute (see
// admin's new "Access" panel on a company). Fails OPEN on any Redis
// connectivity problem — logs loudly and lets the request through, since
// Redis is new, optional-until-configured infra in a stack that's never
// had a hard external dependency before; a misconfigured/down Redis
// shouldn't take down every tenant's API access.

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not set.");
  if (!redisClient) {
    redisClient = new Redis(url, { enableOfflineQueue: false, lazyConnect: false });
    redisClient.on("error", (err) => {
      console.error("[rateLimit] Redis connection error:", err.message);
    });
  }
  return redisClient;
}

// One limiter instance per distinct points-per-minute value in use, so
// companies with different requestsPerMinute settings don't share a
// bucket configuration.
const limiterCache = new Map<number, RateLimiterRedis>();

function getLimiter(pointsPerMinute: number): RateLimiterRedis {
  let limiter = limiterCache.get(pointsPerMinute);
  if (!limiter) {
    limiter = new RateLimiterRedis({
      storeClient: getRedisClient(),
      keyPrefix: "apikey-rl",
      points: pointsPerMinute,
      duration: 60,
    });
    limiterCache.set(pointsPerMinute, limiter);
  }
  return limiter;
}

export class RateLimitExceededError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super("Rate limit exceeded.");
    this.name = "RateLimitExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function checkRateLimit(companyId: string, pointsPerMinute: number): Promise<void> {
  if (pointsPerMinute <= 0) return; // 0 = unlimited

  try {
    await getLimiter(pointsPerMinute).consume(companyId, 1);
  } catch (err) {
    // rate-limiter-flexible throws a RateLimiterRes (has msBeforeNext) when
    // the limit is actually exceeded; anything else (e.g. Redis down) is a
    // real error we fail open on.
    if (err && typeof err === "object" && "msBeforeNext" in err) {
      const msBeforeNext = (err as { msBeforeNext: number }).msBeforeNext;
      throw new RateLimitExceededError(Math.ceil(msBeforeNext / 1000));
    }
    console.error("[rateLimit] Redis error, failing open:", err);
  }
}
