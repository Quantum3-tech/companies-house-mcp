import { describe, expect, it } from "vitest";

import { TtlCache } from "../src/cache.js";

describe("TtlCache", () => {
  it("returns a stored value within the TTL", () => {
    let t = 0;
    const cache = new TtlCache<string>(1000, () => t);
    cache.set("k", "v");
    t = 999;
    expect(cache.get("k")).toBe("v");
  });

  it("drops a value once the TTL has passed", () => {
    let t = 0;
    const cache = new TtlCache<string>(1000, () => t);
    cache.set("k", "v");
    t = 1001;
    expect(cache.get("k")).toBeUndefined();
  });

  it("caches nothing when the TTL is zero", () => {
    const cache = new TtlCache<string>(0);
    cache.set("k", "v");
    expect(cache.get("k")).toBeUndefined();
  });
});
