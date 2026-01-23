/**
 * Rate limiter for WebSocket connections
 * Implements token bucket algorithm
 */

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  refillInterval: number; // milliseconds
}

const defaultConfigs: Record<string, RateLimitConfig> = {
  message: {
    maxTokens: 20,
    refillRate: 5,
    refillInterval: 1000,
  },
  room_create: {
    maxTokens: 5,
    refillRate: 1,
    refillInterval: 5000,
  },
  connection: {
    maxTokens: 10,
    refillRate: 2,
    refillInterval: 1000,
  },
  typing: {
    maxTokens: 10,
    refillRate: 5,
    refillInterval: 1000,
  },
  default: {
    maxTokens: 30,
    refillRate: 10,
    refillInterval: 1000,
  },
};

// Store rate limit buckets by user ID and action type
const buckets = new Map<string, Map<string, RateLimitBucket>>();

/**
 * Get or create a bucket for a user and action
 */
function getBucket(userId: string, action: string): RateLimitBucket {
  let userBuckets = buckets.get(userId);
  if (!userBuckets) {
    userBuckets = new Map();
    buckets.set(userId, userBuckets);
  }

  let bucket = userBuckets.get(action);
  if (!bucket) {
    const config = defaultConfigs[action] || defaultConfigs.default;
    bucket = {
      tokens: config.maxTokens,
      lastRefill: Date.now(),
    };
    userBuckets.set(action, bucket);
  }

  return bucket;
}

/**
 * Refill tokens based on elapsed time
 */
function refillBucket(bucket: RateLimitBucket, config: RateLimitConfig): void {
  const now = Date.now();
  const elapsed = now - bucket.lastRefill;
  const refillCount = Math.floor(elapsed / config.refillInterval);

  if (refillCount > 0) {
    bucket.tokens = Math.min(
      config.maxTokens,
      bucket.tokens + refillCount * config.refillRate
    );
    bucket.lastRefill = now;
  }
}

/**
 * Check if action is allowed and consume a token if so
 */
export function checkRateLimit(
  userId: string,
  action: string
): { allowed: boolean; remaining: number; resetTime: number } {
  const config = defaultConfigs[action] || defaultConfigs.default;
  const bucket = getBucket(userId, action);

  // Refill tokens
  refillBucket(bucket, config);

  if (bucket.tokens > 0) {
    bucket.tokens--;
    return {
      allowed: true,
      remaining: bucket.tokens,
      resetTime: bucket.lastRefill + config.refillInterval,
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetTime: bucket.lastRefill + config.refillInterval,
  };
}

/**
 * Get rate limit info without consuming a token
 */
export function getRateLimitInfo(
  userId: string,
  action: string
): { remaining: number; resetTime: number; isLimited: boolean } {
  const config = defaultConfigs[action] || defaultConfigs.default;
  const bucket = getBucket(userId, action);

  // Refill tokens
  refillBucket(bucket, config);

  return {
    remaining: bucket.tokens,
    resetTime: bucket.lastRefill + config.refillInterval,
    isLimited: bucket.tokens === 0,
  };
}

/**
 * Reset rate limit for a user and action
 */
export function resetRateLimit(userId: string, action?: string): void {
  if (action) {
    const userBuckets = buckets.get(userId);
    if (userBuckets) {
      userBuckets.delete(action);
    }
  } else {
    buckets.delete(userId);
  }
}

/**
 * Clean up old buckets (for users who disconnected)
 */
export function cleanupBuckets(activeUserIds: Set<string>): number {
  let removed = 0;

  for (const userId of buckets.keys()) {
    if (!activeUserIds.has(userId)) {
      buckets.delete(userId);
      removed++;
    }
  }

  return removed;
}

/**
 * Get rate limit config for an action
 */
export function getRateLimitConfig(action: string): RateLimitConfig {
  return defaultConfigs[action] || defaultConfigs.default;
}
