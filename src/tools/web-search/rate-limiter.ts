import { getEnv } from '../../utils/helpers.js';
import { logger } from '../../utils/logger.js';

/**
 * Simple rate limiter implementation
 */
export class RateLimiter {
  private requests: number[];
  private limit: number; // Maximum requests per window
  private windowMs: number; // Time window in milliseconds
  private retryAfterMs: number; // Retry after time in milliseconds

  constructor() {
    // Get rate limit from environment or use defaults
    this.limit = parseInt(getEnv('WEB_SEARCH_RATE_LIMIT') || '5', 10);
    this.windowMs = parseInt(getEnv('WEB_SEARCH_RATE_WINDOW_MS') || '1000', 10); // Default 1 second
    this.retryAfterMs = parseInt(getEnv('WEB_SEARCH_RETRY_AFTER_MS') || '1000', 10); // Default 1 second

    this.requests = [];

    // Validate parameters
    if (isNaN(this.limit) || this.limit <= 0) {
      this.limit = 5;
    }

    if (isNaN(this.windowMs) || this.windowMs <= 0) {
      this.windowMs = 1000;
    }

    if (isNaN(this.retryAfterMs) || this.retryAfterMs <= 0) {
      this.retryAfterMs = 1000;
    }

    logger.info('Rate limiter initialized', {
      limit: this.limit,
      windowMs: this.windowMs,
      retryAfterMs: this.retryAfterMs
    });
  }

  /**
   * Check if a request is allowed based on rate limit
   * @returns true if request is allowed, false if rate limit exceeded
   */
  checkLimit(): boolean {
    const now = Date.now();

    // Remove requests outside the time window
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);

    // Check if we're within the limit
    if (this.requests.length < this.limit) {
      return true;
    }

    // Rate limit exceeded
    logger.warn('Rate limit exceeded', {
      currentRequests: this.requests.length,
      limit: this.limit,
      windowMs: this.windowMs
    });

    return false;
  }

  /**
   * Increment request count
   */
  increment(): void {
    this.requests.push(Date.now());
  }

  /**
   * Get time to wait before next request is allowed
   * @returns Time in milliseconds to wait, or 0 if request is allowed
   */
  getTimeToWait(): number {
    const now = Date.now();

    // Remove requests outside the time window
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);

    // If we're within the limit, no wait time
    if (this.requests.length < this.limit) {
      return 0;
    }

    // Find the oldest request in the current window
    const oldestRequest = Math.min(...this.requests);

    // Calculate wait time
    const waitTime = oldestRequest + this.windowMs - now;

    // Return wait time or retryAfterMs, whichever is greater
    return Math.max(waitTime, this.retryAfterMs);
  }

  /**
   * Get current rate limit status
   * @returns Object with current status
   */
  getStatus(): {
    current: number;
    limit: number;
    windowMs: number;
    isAllowed: boolean;
    timeToWait: number;
  } {
    const now = Date.now();

    // Remove requests outside the time window
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);

    return {
      current: this.requests.length,
      limit: this.limit,
      windowMs: this.windowMs,
      isAllowed: this.requests.length < this.limit,
      timeToWait: this.getTimeToWait()
    };
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.requests = [];
    logger.info('Rate limiter reset');
  }

  /**
   * Wait until request is allowed
   * @returns Promise that resolves when request is allowed
   */
  async waitUntilAllowed(): Promise<void> {
    let waitTime = this.getTimeToWait();

    while (waitTime > 0) {
      logger.debug('Rate limiter waiting', { waitTime });
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 100)));
      waitTime = this.getTimeToWait();
    }
  }
}