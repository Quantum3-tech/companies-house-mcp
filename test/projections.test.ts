import { describe, expect, it } from "vitest";

import {
  projectFilingHistory,
  projectOfficers,
  projectProfile,
  projectSearch,
} from "../src/projections.js";
import { PROFILE_DATA_NOTE } from "../src/contract/index.js";
import { loadFixture } from "./helpers.js";

// These fixtures are real responses captured from the live API on 2026-10-24.
// The assertions below are the actual values that came back.

describe("projectSearch", () => {
  const raw = loadFixture("search-companies.json");
  const result = projectSearch(raw as never, "tesco");

  it("echoes the query and keeps the envelope paging fields", () => {
    expect(result.query).toBe("tesco");
    expect(result.total_results).toBe(356);
    expect(result.items_per_page).toBe(2);
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
        "Tesco House, Shire Park, Kestrel Way, Welwyn Garden City, United Kingdom, AL7 1GA",
    });
    expect(first).not.toHaveProperty("matches");
    expect(first).not.toHaveProperty("links");
    expect(first).not.toHaveProperty("address");
    expect(first).not.toHaveProperty("snippet");
    expect(first).not.toHaveProperty("description");
  });
});

describe("projectProfile, dissolved company 00000006", () => {
  const raw = loadFixture("company-profile.json");
  const result = projectProfile(raw as never);

  it("renames upstream `type` to `company_type`", () => {
    expect(result.company_type).toBe("private-unlimited-nsc");
    expect(result).not.toHaveProperty("type");
  });

  it("carries status, cessation date and sic codes", () => {
    expect(result.company_status).toBe("dissolved");
    expect(result.date_of_cessation).toBe("2018-07-10");
    expect(result.sic_codes).toEqual(["65110"]);
  });

  it("omits accounts when there are no upcoming accounts", () => {
    expect(result.accounts).toBeUndefined();
  });

  it("drops trimmed fields and includes the boundary note", () => {
    expect(result).not.toHaveProperty("has_charges");
    expect(result).not.toHaveProperty("etag");
    expect(result).not.toHaveProperty("can_file");
    expect(result.data_note).toBe(PROFILE_DATA_NOTE);
  });
});

describe("projectProfile, active company 00445790", () => {
  const raw = loadFixture("company-profile-active.json");
  const result = projectProfile(raw as never);

  it("keeps the accounts due dates", () => {
    expect(result.company_type).toBe("plc");
    expect(result.accounts?.next_due).toBe("2027-08-26");
    expect(result.accounts?.next_made_up_to).toBe("2027-02-26");
    expect(result.accounts?.overdue).toBe(false);
  });

  it("trims confirmation_statement and previous_company_names", () => {
    expect(result).not.toHaveProperty("confirmation_statement");
    expect(result).not.toHaveProperty("previous_company_names");
  });
});

describe("projectOfficers, 00000006", () => {
  const raw = loadFixture("officers.json");
  const result = projectOfficers(raw as never, "00000006");

  it("keeps the active and resigned counts and the total", () => {
    expect(result.active_count).toBe(0);
    expect(result.resigned_count).toBe(49);
    expect(result.total_results).toBe(52);
    expect(result.company_number).toBe("00000006");
  });

  it("keeps month-and-year date of birth where present", () => {
    expect(result.items[1]!.name).toBe("GALBRAITH, James");
    expect(result.items[1]!.date_of_birth).toEqual({ month: 3, year: 1963 });
  });

  it("leaves date of birth absent for an officer who has none", () => {
    expect(result.items[0]!.name).toBe("PRINGLE, Martin");
    expect(result.items[0]!).not.toHaveProperty("date_of_birth");
  });
});

describe("projectFilingHistory", () => {
  it("reads the upstream total_count, not total_results (00000006)", () => {
    const raw = loadFixture("filing-history.json");
    const result = projectFilingHistory(raw as never, "00000006");
    expect(result.total_count).toBe(206);
    const first = result.items[0]!;
    expect(first.description_code).toBe("gazette-dissolved-voluntary");
    expect(first.description).toBe(
      "Final gazette dissolved following voluntary strike-off",
    );
    expect(first.type).toBe("GAZ2(A)");
  });

  it("resolves live capital filing codes (00445790)", () => {
    const raw = loadFixture("filing-history-active.json");
    const result = projectFilingHistory(raw as never, "00445790");
    expect(result.total_count).toBe(8372);
    const cancellation = result.items.find(
      (i) => i.description_code === "capital-cancellation-shares",
    );
    expect(cancellation?.description).toBe("Cancellation of shares");
  });
});
