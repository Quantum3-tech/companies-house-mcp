/**
 * Live tests. These hit the real Companies House API and are skipped unless
 * LIVE_API_TESTS=1 and a key is set. They check that the real response shape
 * still matches what the projections read, which is the thing fixtures cannot
 * catch: upstream changing a field name under us.
 */

import { describe, expect, it } from "vitest";

import { HttpClient } from "../src/httpClient.js";
import { RateLimiter } from "../src/rateLimiter.js";
import { CompaniesHouseTools } from "../src/handlers.js";

const live =
  process.env.LIVE_API_TESTS === "1" && !!process.env.COMPANIES_HOUSE_API_KEY;

/** 00000006 is a long-standing real registration used throughout the CH docs. */
const KNOWN_NUMBER = "00000006";

function liveTools(): CompaniesHouseTools {
  const client = new HttpClient({
    apiKey: process.env.COMPANIES_HOUSE_API_KEY as string,
    baseUrl: "https://api.company-information.service.gov.uk",
    rateLimiter: new RateLimiter(),
  });
  return new CompaniesHouseTools(client, 0);
}

describe.skipIf(!live)("live API", () => {
  it("search returns usable disambiguation fields", async () => {
    const result = await liveTools().search({ query: "tesco" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.items.length).toBeGreaterThan(0);
      expect(result.data.items[0]!.company_number).toMatch(/^[A-Z0-9]{8}$/);
      expect(result.data.items[0]!.title.length).toBeGreaterThan(0);
    }
  });

  it("profile projects a known company", async () => {
    const result = await liveTools().profile({ company_number: KNOWN_NUMBER });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.company_number).toBe(KNOWN_NUMBER);
      expect(result.data.company_type.length).toBeGreaterThan(0);
    }
  });

  it("a nonexistent company comes back as COMPANY_NOT_FOUND", async () => {
    const result = await liveTools().profile({ company_number: "99999999" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("COMPANY_NOT_FOUND");
  });
});
