/**
 * Sliding-window rate limiter. Companies House documents 600 requests per
 * rolling five minutes, per application. We stay just under that, wait for a
 * free slot up to a bound, and give up with a signal rather than blocking a
 * call forever. See DECISIONS.md.
 */

export class RateLimitExceededError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Local rate limit reached before a slot became free.");
    this.name = "RateLimitExceededError";
  }
}

export interface RateLimiterOptions {
  /** Max requests per window. Kept under the documented 600 for margin. */
  limit?: number;
  /** Window length in milliseconds. */
  windowMs?: number;
  /** Longest we will wait for a slot before giving up. */
  maxWaitMs?: number;
  /** Clock, injectable for tests. */
  now?: () => number;
  /** Sleep, injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
}

export class RateLimiter {
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxWaitMs: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly hits: number[] = [];
  private chain: Promise<void> = Promise.resolve();

  constructor(options: RateLimiterOptions = {}) {
    this.limit = options.limit ?? 590;
    this.windowMs = options.windowMs ?? 5 * 60 * 1000;
    this.maxWaitMs = options.maxWaitMs ?? 30 * 1000;
    this.now = options.now ?? Date.now;
    this.sleep =
      options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /** Acquire one slot. Serialised so concurrent callers queue in order.
   *  Throws RateLimitExceededError if a slot will not free up in time. */
  async acquire(): Promise<void> {
    const run = this.chain.then(() => this.acquireNow());
    // Keep the chain alive even if this acquire throws.
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async acquireNow(): Promise<void> {
    this.prune();
    if (this.hits.length < this.limit) {
      this.hits.push(this.now());
      return;
    }
    const oldest = this.hits[0] ?? this.now();
    const waitMs = oldest + this.windowMs - this.now();
    if (waitMs > this.maxWaitMs) {
      throw new RateLimitExceededError(Math.ceil(waitMs / 1000));
    }
    if (waitMs > 0) {
      await this.sleep(waitMs);
    }
    this.prune();
    this.hits.push(this.now());
  }

  private prune(): void {
    const cutoff = this.now() - this.windowMs;
    while (this.hits.length > 0 && (this.hits[0] as number) <= cutoff) {
      this.hits.shift();
    }
  }
}
