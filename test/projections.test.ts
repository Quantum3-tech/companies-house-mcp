import { describe, expect, it } from "vitest";

import {
  projectFilingHistory,
  projectOfficers,
  projectProfile,
  projectSearch,
} from "../src/projections.js";
import { PROFILE_DATA_NOTE } from "../src/contract/index.js";
import { loadFixture } from "./helpers.js";

describe("projectSearch", () => {
  const raw = loadFixture("search-companies.json");
  const result = projectSearch(raw as never, "tesco");

  it("echoes the query and keeps envelope paging fields", () => {
    expect(result.query).toBe("tesco");
    expect(result.total_results).toBe(2);
    expect(result.items_per_page).toBe(20);
    expect(result.start_index).toBe(0);
  });

  it("carries the disambiguation fields and drops the rest", () => {
    const first = result.items[0]!;
    expect(first).toEqual({
      company_number: "00445790",
      title: "TESCO PLC",
      company_status: "active",
      company_type: "plc",
      date_of_creation: "1947-11-27",
      address_snippet:
        "Tesco House, Shire Park, Kestrel Way, Welwyn Garden City, Hertfordshire, AL7 1GA",
    });
    // matches, description, links and the structured address are not carried.
    expect(first).not.toHaveProperty("matches");
    expect(first).not.toHaveProperty("links");
    expect(first).not.toHaveProperty("address");
  });
});

describe("projectProfile", () => {
  const raw = loadFixture("company-profile.json");
  const result = projectProfile(raw as never);

  it("renames upstream `type` to `company_type`", () => {
    expect(result.company_type).toBe("plc");
    expect(result).not.toHaveProperty("type");
  });

  it("keeps sic_codes and accounts due dates", () => {
    expect(result.sic_codes).toEqual(["47110", "70100"]);
    expect(result.accounts?.next_due).toBe("2024-11-23");
    expect(result.accounts?.overdue).toBe(false);
  });

  it("drops trimmed fields and includes the boundary note", () => {
    expect(result).not.toHaveProperty("has_charges");
    expect(result).not.toHaveProperty("etag");
    expect(result).not.toHaveProperty("can_file");
    expect(result.data_note).toBe(PROFILE_DATA_NOTE);
  });
});

describe("projectOfficers", () => {
  const raw = loadFixture("officers.json");
  const result = projectOfficers(raw as never, "00445790");

  it("keeps active and resigned counts", () => {
    expect(result.active_count).toBe(2);
    expect(result.resigned_count).toBe(1);
    expect(result.company_number).toBe("00445790");
  });

  it("keeps month-and-year date of birth as given", () => {
    expect(result.items[0]!.date_of_birth).toEqual({ month: 4, year: 1970 });
  });

  it("leaves optional fields absent rather than null", () => {
    const secretary = result.items[1]!;
    expect(secretary).not.toHaveProperty("date_of_birth");
    expect(secretary).not.toHaveProperty("nationality");
  });
});

describe("projectFilingHistory", () => {
  const raw = loadFixture("filing-history.json");
  const result = projectFilingHistory(raw as never, "00445790");

  it("reads the upstream total_count, not total_results", () => {
    expect(result.total_count).toBe(3);
  });

  it("resolves a known description code and keeps the original", () => {
    const accounts = result.items[0]!;
    expect(accounts.description).toBe("Full accounts");
    expect(accounts.description_code).toBe("accounts-with-accounts-type-full");
  });

  it("falls back to a prettified code when unknown, still keeping the key", () => {
    const unknown = result.items[2]!;
    expect(unknown.description).toBe("Some code not in our table");
    expect(unknown.description_code).toBe("some-code-not-in-our-table");
  });
});
