import { describe, expect, it } from "vitest";

import { resolveFilingDescription } from "../src/filingDescriptions.js";

describe("resolveFilingDescription", () => {
  it("resolves a known code to readable text", () => {
    expect(resolveFilingDescription("incorporation-company")).toBe(
      "Incorporation",
    );
  });

  it("prettifies an unknown code rather than failing", () => {
    expect(resolveFilingDescription("brand-new-upstream-code")).toBe(
      "Brand new upstream code",
    );
  });

  it("handles a missing code", () => {
    expect(resolveFilingDescription(undefined)).toBe("Unknown filing");
  });
});
