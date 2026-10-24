/**
 * Projections from raw Companies House JSON to the sealed output shapes.
 * This is where the trimming happens, where the `type` / `company_type`
 * naming split is reconciled, and where filing description codes are
 * resolved. Upstream shapes are typed loosely because we read a handful of
 * fields from a much larger object.
 */

import type {
  Address,
  CompanyProfile,
  FilingHistoryResult,
  FilingItem,
  OfficersResult,
  OfficerItem,
  SearchResult,
  SearchResultItem,
} from "./contract/index.js";
import { PROFILE_DATA_NOTE } from "./contract/index.js";
import { resolveFilingDescription } from "./filingDescriptions.js";

interface RawAddress {
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  premises?: string;
}

function projectAddress(raw: RawAddress | undefined): Address | undefined {
  if (!raw) return undefined;
  const out: Address = {};
  if (raw.address_line_1) out.address_line_1 = raw.address_line_1;
  if (raw.address_line_2) out.address_line_2 = raw.address_line_2;
  if (raw.locality) out.locality = raw.locality;
  if (raw.region) out.region = raw.region;
  if (raw.postal_code) out.postal_code = raw.postal_code;
  if (raw.country) out.country = raw.country;
  if (raw.premises) out.premises = raw.premises;
  return Object.keys(out).length > 0 ? out : undefined;
}

interface RawSearch {
  total_results?: number;
  items_per_page?: number;
  start_index?: number;
  items?: Array<{
    company_number?: string;
    title?: string;
    company_status?: string;
    company_type?: string;
    date_of_creation?: string;
    address_snippet?: string;
  }>;
}

export function projectSearch(raw: RawSearch, query: string): SearchResult {
  const items: SearchResultItem[] = (raw.items ?? []).map((item) => {
    const out: SearchResultItem = {
      company_number: item.company_number ?? "",
      title: item.title ?? "",
      company_status: item.company_status ?? "",
      company_type: item.company_type ?? "",
    };
    if (item.date_of_creation) out.date_of_creation = item.date_of_creation;
    if (item.address_snippet) out.address_snippet = item.address_snippet;
    return out;
  });

  return {
    query,
    total_results: raw.total_results ?? items.length,
    items_per_page: raw.items_per_page ?? items.length,
    start_index: raw.start_index ?? 0,
    items,
  };
}

interface RawProfile {
  company_number?: string;
  company_name?: string;
  company_status?: string;
  type?: string;
  date_of_creation?: string;
  date_of_cessation?: string;
  jurisdiction?: string;
  registered_office_address?: RawAddress;
  sic_codes?: string[];
  accounts?: {
    next_due?: string;
    next_made_up_to?: string;
    overdue?: boolean;
    next_accounts?: { due_on?: string; overdue?: boolean };
  };
}

export function projectProfile(raw: RawProfile): CompanyProfile {
  const out: CompanyProfile = {
    company_number: raw.company_number ?? "",
    company_name: raw.company_name ?? "",
    company_status: raw.company_status ?? "",
    // Reconcile the naming split: profile calls it `type`, search calls it
    // `company_type`. We expose one name.
    company_type: raw.type ?? "",
    data_note: PROFILE_DATA_NOTE,
  };
  if (raw.date_of_creation) out.date_of_creation = raw.date_of_creation;
  if (raw.date_of_cessation) out.date_of_cessation = raw.date_of_cessation;
  if (raw.jurisdiction) out.jurisdiction = raw.jurisdiction;

  const address = projectAddress(raw.registered_office_address);
  if (address) out.registered_office_address = address;

  if (raw.sic_codes && raw.sic_codes.length > 0) out.sic_codes = raw.sic_codes;

  const nextDue = raw.accounts?.next_due ?? raw.accounts?.next_accounts?.due_on;
  const overdue = raw.accounts?.overdue ?? raw.accounts?.next_accounts?.overdue;
  const nextMadeUpTo = raw.accounts?.next_made_up_to;
  if (nextDue !== undefined || overdue !== undefined || nextMadeUpTo) {
    out.accounts = {};
    if (nextDue !== undefined) out.accounts.next_due = nextDue;
    if (nextMadeUpTo) out.accounts.next_made_up_to = nextMadeUpTo;
    if (overdue !== undefined) out.accounts.overdue = overdue;
  }

  return out;
}

interface RawOfficers {
  active_count?: number;
  resigned_count?: number;
  total_results?: number;
  items_per_page?: number;
  start_index?: number;
  items?: Array<{
    name?: string;
    officer_role?: string;
    appointed_on?: string;
    resigned_on?: string;
    nationality?: string;
    occupation?: string;
    country_of_residence?: string;
    date_of_birth?: { month?: number; year?: number };
  }>;
}

export function projectOfficers(
  raw: RawOfficers,
  companyNumber: string,
): OfficersResult {
  const items: OfficerItem[] = (raw.items ?? []).map((item) => {
    const out: OfficerItem = {
      name: item.name ?? "",
      officer_role: item.officer_role ?? "",
    };
    if (item.appointed_on) out.appointed_on = item.appointed_on;
    if (item.resigned_on) out.resigned_on = item.resigned_on;
    if (item.nationality) out.nationality = item.nationality;
    if (item.occupation) out.occupation = item.occupation;
    if (item.country_of_residence)
      out.country_of_residence = item.country_of_residence;
    if (item.date_of_birth) out.date_of_birth = item.date_of_birth;
    return out;
  });

  return {
    company_number: companyNumber,
    active_count: raw.active_count ?? 0,
    resigned_count: raw.resigned_count ?? 0,
    total_results: raw.total_results ?? items.length,
    items_per_page: raw.items_per_page ?? items.length,
    start_index: raw.start_index ?? 0,
    items,
  };
}

interface RawFilingHistory {
  total_count?: number;
  items_per_page?: number;
  start_index?: number;
  items?: Array<{
    transaction_id?: string;
    category?: string;
    date?: string;
    type?: string;
    description?: string;
    pages?: number;
    paper_filed?: boolean;
  }>;
}

export function projectFilingHistory(
  raw: RawFilingHistory,
  companyNumber: string,
): FilingHistoryResult {
  const items: FilingItem[] = (raw.items ?? []).map((item) => {
    const code = item.description ?? "";
    const out: FilingItem = {
      transaction_id: item.transaction_id ?? "",
      category: item.category ?? "",
      date: item.date ?? "",
      type: item.type ?? "",
      description: resolveFilingDescription(code),
      description_code: code,
    };
    if (item.pages !== undefined) out.pages = item.pages;
    if (item.paper_filed !== undefined) out.paper_filed = item.paper_filed;
    return out;
  });

  return {
    company_number: companyNumber,
    total_count: raw.total_count ?? items.length,
    items_per_page: raw.items_per_page ?? items.length,
    start_index: raw.start_index ?? 0,
    items,
  };
}
