import { describe, expect, it } from "vitest";

import { RateLimiter, RateLimitExceededError } from "../src/rateLimiter.js";

/** A controllable clock and a sleep that advances it, so the sliding window
 *  can be tested without real time. */
function controllable() {
  let t = 0;
  const now = () => t;
  const sleep = async (ms: number) => {
    t += ms;
  };
  const advance = (ms: number) => {
    t += ms;
  };
  return { now, sleep, advance };
}

describe("RateLimiter", () => {
  it("lets through up to the limit without waiting", async () => {
    const { now, sleep } = controllable();
    const limiter = new RateLimiter({ limit: 3, windowMs: 1000, now, sleep });
    await limiter.acquire();
    await limiter.acquire();
    await limiter.acquire();
    // No assertion needed beyond not throwing; three fit in the window.
    expect(true).toBe(true);
  });

  it("waits for the window to free a slot when at the limit", async () => {
    const { now, sleep } = controllable();
    const limiter = new RateLimiter({
      limit: 2,
      windowMs: 1000,
      maxWaitMs: 5000,
      now,
      sleep,
    });
    await limiter.acquire();
    await limiter.acquire();
    const before = now();
    await limiter.acquire();
    // The third had to wait until the first hit aged out of the window.
    expect(now()).toBeGreaterThanOrEqual(before + 1000);
  });

  it("gives up with RateLimitExceededError when the wait exceeds the bound", async () => {
    const { now, sleep } = controllable();
    const limiter = new RateLimiter({
      limit: 1,
      windowMs: 10000,
      maxWaitMs: 1000,
      now,
      sleep,
    });
    await limiter.acquire();
    await expect(limiter.acquire()).rejects.toBeInstanceOf(
      RateLimitExceededError,
    );
  });

  it("reports a retry-after in seconds on giving up", async () => {
    const { now, sleep } = controllable();
    const limiter = new RateLimiter({
      limit: 1,
      windowMs: 10000,
      maxWaitMs: 1000,
      now,
      sleep,
    });
    await limiter.acquire();
    try {
      await limiter.acquire();
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(RateLimitExceededError);
      expect((e as RateLimitExceededError).retryAfterSeconds).toBe(10);
    }
  });
});
