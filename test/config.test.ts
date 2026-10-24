import { describe, expect, it } from "vitest";

import { loadConfig, MissingApiKeyError } from "../src/config.js";

describe("loadConfig", () => {
  it("throws MissingApiKeyError when the key is absent", () => {
    expect(() => loadConfig({})).toThrow(MissingApiKeyError);
  });

  it("throws when the key is only whitespace", () => {
    expect(() => loadConfig({ COMPANIES_HOUSE_API_KEY: "   " })).toThrow(
      MissingApiKeyError,
    );
  });

  it("applies defaults for base URL and cache TTL", () => {
    const config = loadConfig({ COMPANIES_HOUSE_API_KEY: "k" });
    expect(config.baseUrl).toBe("https://api.company-information.service.gov.uk");
    expect(config.cacheTtlSeconds).toBe(60);
  });

  it("trims a trailing slash off a custom base URL", () => {
    const config = loadConfig({
      COMPANIES_HOUSE_API_KEY: "k",
      COMPANIES_HOUSE_BASE_URL: "https://example.test/",
    });
    expect(config.baseUrl).toBe("https://example.test");
  });

  it("reads a custom cache TTL", () => {
    const config = loadConfig({
      COMPANIES_HOUSE_API_KEY: "k",
      COMPANIES_HOUSE_CACHE_TTL_SECONDS: "5",
    });
    expect(config.cacheTtlSeconds).toBe(5);
  });
});
