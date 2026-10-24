/**
 * SEALED CONTRACT. Do not change without an explicit instruction.
 *
 * Tool names, input schemas and descriptions. The zod shapes here are the
 * single source of truth: the MCP SDK derives the JSON Schema shown to the
 * model from them, and the same shapes validate input at runtime, so the two
 * cannot drift.
 *
 * Note on company_number: the format check is NOT in the zod schema. A zod
 * failure surfaces as a protocol error, which the model cannot read. We want
 * a bad format to come back as a readable INVALID_COMPANY_NUMBER result, so
 * the handler validates format and the schema only requires a string. See
 * DECISIONS.md.
 *
 * Note on page-size caps: Companies House documents no maximum items_per_page
 * for any endpoint. The caps below are ours, not the API's. They are declared
 * per tool so one can change without touching the others.
 */

import { z } from "zod";

export const TOOL_NAMES = {
  SEARCH: "company_search",
  PROFILE: "company_profile",
  OFFICERS: "company_officers",
  FILING_HISTORY: "company_filing_history",
} as const;

/** Per-tool page-size caps. Ours, not documented by Companies House. */
export const PAGE_SIZE = {
  SEARCH: { default: 20, max: 100 },
  OFFICERS: { default: 35, max: 100 },
  FILING_HISTORY: { default: 25, max: 100 },
} as const;

export const companySearchInput = {
  query: z
    .string()
    .min(1)
    .describe("Company name or part of a name to search for."),
  items_per_page: z
    .number()
    .int()
    .min(1)
    .max(PAGE_SIZE.SEARCH.max)
    .optional()
    .describe(
      `Results per page. Default ${PAGE_SIZE.SEARCH.default}, maximum ${PAGE_SIZE.SEARCH.max}.`,
    ),
  start_index: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Zero-based offset of the first result. Default 0."),
};

export const companyProfileInput = {
  company_number: z
    .string()
    .describe(
      "Companies House number, for example 00000006 or SC123456. Eight " +
        "characters, digits or letters. Case is normalised.",
    ),
};

export const companyOfficersInput = {
  company_number: z
    .string()
    .describe("Companies House number, for example 00000006 or SC123456."),
  items_per_page: z
    .number()
    .int()
    .min(1)
    .max(PAGE_SIZE.OFFICERS.max)
    .optional()
    .describe(
      `Officers per page. Default ${PAGE_SIZE.OFFICERS.default}, maximum ${PAGE_SIZE.OFFICERS.max}.`,
    ),
  start_index: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Zero-based offset of the first officer. Default 0."),
  order_by: z
    .enum(["appointed_on", "resigned_on", "surname"])
    .optional()
    .describe("Sort order for the officers list."),
};

export const companyFilingHistoryInput = {
  company_number: z
    .string()
    .describe("Companies House number, for example 00000006 or SC123456."),
  category: z
    .string()
    .optional()
    .describe(
      "Optional comma-separated categories to include, for example " +
        "'accounts,confirmation-statement'. Omit for all categories.",
    ),
  items_per_page: z
    .number()
    .int()
    .min(1)
    .max(PAGE_SIZE.FILING_HISTORY.max)
    .optional()
    .describe(
      `Filings per page. Default ${PAGE_SIZE.FILING_HISTORY.default}, maximum ${PAGE_SIZE.FILING_HISTORY.max}.`,
    ),
  start_index: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Zero-based offset of the first filing. Default 0."),
};

export const TOOL_DESCRIPTIONS = {
  [TOOL_NAMES.SEARCH]:
    "Search UK companies by name. Returns a list of matches, each with " +
    "company_number, title, company_status, company_type, date_of_creation " +
    "and address_snippet: enough to choose the right company without a " +
    "follow-up call. Use the returned company_number with the other tools. " +
    "On failure returns an error object with a code field.",
  [TOOL_NAMES.PROFILE]:
    "Get the profile of one UK company by its number. Returns company_name, " +
    "company_number, company_status, company_type, date_of_creation, " +
    "date_of_cessation, jurisdiction, registered_office_address, sic_codes " +
    "and accounts due dates. This is a fixed subset; a property not listed " +
    "was not fetched, so do not read its absence as false. On failure " +
    "returns an error object with a code field, including COMPANY_NOT_FOUND " +
    "and INVALID_COMPANY_NUMBER.",
  [TOOL_NAMES.OFFICERS]:
    "List the officers of one UK company by its number. Returns active_count " +
    "and resigned_count, then items each with name, officer_role, " +
    "appointed_on, resigned_on, nationality, occupation, " +
    "country_of_residence and date_of_birth (month and year only). Paged. " +
    "On failure returns an error object with a code field.",
  [TOOL_NAMES.FILING_HISTORY]:
    "List the filing history of one UK company by its number. Returns items " +
    "each with transaction_id, category, date, type, a resolved description, " +
    "the original description_code, pages and paper_filed. Filter with the " +
    "category parameter. Paged. On failure returns an error object with a " +
    "code field.",
} as const;
