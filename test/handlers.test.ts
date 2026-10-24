import { describe, expect, it } from "vitest";

import { CompaniesHouseTools } from "../src/handlers.js";
import { HttpClient } from "../src/httpClient.js";
import { RateLimiter } from "../src/rateLimiter.js";
import { loadFixture, stubFetch } from "./helpers.js";

function makeTools(responses: Parameters<typeof stubFetch>[0], ttl = 60) {
  const { fetch, calls } = stubFetch(responses);
  const client = new HttpClient({
    apiKey: "test-key",
    baseUrl: "https://api.example.test",
    rateLimiter: new RateLimiter({ limit: 1000 }),
    fetchImpl: fetch,
  });
  return { tools: new CompaniesHouseTools(client, ttl), calls };
}

describe("search handler", () => {
  it("projects a successful search and sends q plus a clamped page size", async () => {
    const { tools, calls } = makeTools([
      { status: 200, body: loadFixture("search-companies.json") },
    ]);
    const result = await tools.search({ query: "tesco", items_per_page: 999 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items).toHaveLength(2);
    }
    expect(calls[0]).toContain("q=tesco");
    // 999 is clamped to the search max of 100.
    expect(calls[0]).toContain("items_per_page=100");
  });
});

describe("profile handler", () => {
  it("rejects a bad company number before any HTTP call", async () => {
    const { tools, calls } = makeTools([{ status: 200, body: {} }]);
    const result = await tools.profile({ company_number: "not valid" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INVALID_COMPANY_NUMBER");
    expect(calls).toHaveLength(0);
  });

  it("normalises case before calling", async () => {
    const { tools, calls } = makeTools([
      { status: 200, body: loadFixture("company-profile.json") },
    ]);
    await tools.profile({ company_number: "sc123456" });
    expect(calls[0]).toContain("/company/SC123456");
  });

  it("maps a 404 to COMPANY_NOT_FOUND", async () => {
    const { tools } = makeTools([{ status: 404, body: { errors: [] } }]);
    const result = await tools.profile({ company_number: "00000006" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("COMPANY_NOT_FOUND");
  });

  it("maps a mid-session 401 to UPSTREAM_AUTH_FAILED", async () => {
    const { tools } = makeTools([{ status: 401, body: {} }]);
    const result = await tools.profile({ company_number: "00000006" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UPSTREAM_AUTH_FAILED");
  });

  it("serves the second identical call from cache", async () => {
    const { tools, calls } = makeTools([
      { status: 200, body: loadFixture("company-profile.json") },
    ]);
    await tools.profile({ company_number: "00445790" });
    await tools.profile({ company_number: "00445790" });
    expect(calls).toHaveLength(1);
  });
});

describe("error mapping", () => {
  it("maps 429 to RATE_LIMITED with the Retry-After header", async () => {
    const { tools } = makeTools([
      { status: 429, body: {}, headers: { "Retry-After": "42" } },
    ]);
    const result = await tools.profile({ company_number: "00000006" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("RATE_LIMITED");
      expect(result.error.retry_after_seconds).toBe(42);
    }
  });

  it("defaults Retry-After to the full window when absent", async () => {
    const { tools } = makeTools([{ status: 429, body: {} }]);
    const result = await tools.profile({ company_number: "00000006" });
    if (!result.ok) expect(result.error.retry_after_seconds).toBe(300);
  });

  it("maps a 500 to UPSTREAM_UNAVAILABLE", async () => {
    const { tools } = makeTools([{ status: 503, body: {} }]);
    const result = await tools.officers({ company_number: "00000006" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UPSTREAM_UNAVAILABLE");
  });

  it("maps a network failure to UPSTREAM_UNAVAILABLE", async () => {
    const { tools } = makeTools([{ status: 0, networkError: true }]);
    const result = await tools.filingHistory({ company_number: "00000006" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UPSTREAM_UNAVAILABLE");
  });
});

describe("filing history handler", () => {
  it("passes a category filter through and projects items", async () => {
    const { tools, calls } = makeTools([
      { status: 200, body: loadFixture("filing-history.json") },
    ]);
    const result = await tools.filingHistory({
      company_number: "00000006",
      category: "gazette",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.total_count).toBe(206);
    expect(calls[0]).toContain("category=gazette");
  });
});
