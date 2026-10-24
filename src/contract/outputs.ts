/**
 * SEALED CONTRACT. Do not change without an explicit instruction.
 *
 * Output projections. Each tool returns one of these shapes, never raw
 * upstream JSON. The field set is deliberately narrow. The boundary is made
 * visible two ways: every tool description lists the fields it returns, and
 * the profile result carries `data_note` so a reader can tell "absent because
 * false" from "absent because not fetched". See DECISIONS.md.
 */

export interface Address {
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  premises?: string;
}

/** One hit from company_search. Carries enough to choose a company and move
 *  on without a second call. */
export interface SearchResultItem {
  company_number: string;
  /** The registered company name (upstream calls this `title`). */
  title: string;
  company_status: string;
  company_type: string;
  date_of_creation?: string;
  /** One-line address, enough to disambiguate between branches. */
  address_snippet?: string;
}

export interface SearchResult {
  query: string;
  total_results: number;
  items_per_page: number;
  start_index: number;
  items: SearchResultItem[];
}

/** Company profile. `company_type` is normalised from the upstream `type`
 *  field so it matches the name search results use. */
export interface CompanyProfile {
  company_number: string;
  company_name: string;
  company_status: string;
  company_type: string;
  date_of_creation?: string;
  date_of_cessation?: string;
  jurisdiction?: string;
  registered_office_address?: Address;
  sic_codes?: string[];
  accounts?: {
    next_due?: string;
    next_made_up_to?: string;
    overdue?: boolean;
  };
  /** Fixed boundary note. The profile returns only the fields above. A field
   *  not listed here was not fetched; do not read its absence as false. */
  data_note: string;
}

export const PROFILE_DATA_NOTE =
  "This profile is a fixed projection. Only the fields present here are " +
  "fetched. If a property you need (for example charges or insolvency " +
  "history) is not present, it was not retrieved, not necessarily false.";

export interface OfficerItem {
  /** Preformatted by upstream as "SURNAME, Forename". Not split. */
  name: string;
  officer_role: string;
  appointed_on?: string;
  resigned_on?: string;
  nationality?: string;
  occupation?: string;
  country_of_residence?: string;
  /** Month and year only. Companies House never returns the day. */
  date_of_birth?: { month?: number; year?: number };
}

export interface OfficersResult {
  company_number: string;
  active_count: number;
  resigned_count: number;
  total_results: number;
  items_per_page: number;
  start_index: number;
  items: OfficerItem[];
}

export interface FilingItem {
  transaction_id: string;
  category: string;
  date: string;
  type: string;
  /** Resolved human-readable text. */
  description: string;
  /** The original upstream enum key, kept so nothing is lost if the
   *  resolution table is stale or missing an entry. */
  description_code: string;
  pages?: number;
  paper_filed?: boolean;
}

export interface FilingHistoryResult {
  company_number: string;
  /** Upstream names this `total_count`, not `total_results`. */
  total_count: number;
  items_per_page: number;
  start_index: number;
  items: FilingItem[];
}
