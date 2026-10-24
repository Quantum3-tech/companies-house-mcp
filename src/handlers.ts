/**
 * Tool handlers. Each validates its input (including the company-number
 * format, locally, before any HTTP call), checks the cache where it applies,
 * calls the client, and projects the result. Handlers return the sealed
 * output shape on success or a ToolError on failure; the server layer turns
 * that into MCP content.
 */

import type {
  CompanyProfile,
  FilingHistoryResult,
  OfficersResult,
  SearchResult,
  ToolError,
} from "./contract/index.js";
import { PAGE_SIZE } from "./contract/index.js";
import type { ApiResult, HttpClient } from "./httpClient.js";
import { TtlCache } from "./cache.js";
import {
  projectFilingHistory,
  projectOfficers,
  projectProfile,
  projectSearch,
} from "./projections.js";

export type HandlerResult<T> = ApiResult<T>;

/** Companies House numbers are eight characters: all digits, or a two-letter
 *  prefix (SC, NI, OC, and so on) followed by six digits. We uppercase and
 *  check that shape before spending a request on it. */
const COMPANY_NUMBER_RE = /^[A-Z0-9]{8}$/;

function normaliseCompanyNumber(
  raw: string,
): { ok: true; value: string } | { ok: false; error: ToolError["error"] } {
  const value = raw.trim().toUpperCase();
  if (!COMPANY_NUMBER_RE.test(value)) {
    return {
      ok: false,
      error: {
        code: "INVALID_COMPANY_NUMBER",
        message:
          `"${raw}" is not a valid company number. Expected eight ` +
          "characters: digits, or a two-letter prefix then six digits, " +
          "for example 00000006 or SC123456.",
      },
    };
  }
  return { ok: true, value };
}

function clamp(value: number | undefined, def: number, max: number): number {
  if (value === undefined) return def;
  return Math.min(Math.max(1, Math.trunc(value)), max);
}

export interface SearchArgs {
  query: string;
  items_per_page?: number;
  start_index?: number;
}

export interface ProfileArgs {
  company_number: string;
}

export interface OfficersArgs {
  company_number: string;
  items_per_page?: number;
  start_index?: number;
  order_by?: "appointed_on" | "resigned_on" | "surname";
}

export interface FilingHistoryArgs {
  company_number: string;
  category?: string;
  items_per_page?: number;
  start_index?: number;
}

export class CompaniesHouseTools {
  private readonly profileCache: TtlCache<CompanyProfile>;
  private readonly officersCache: TtlCache<OfficersResult>;

  constructor(
    private readonly client: HttpClient,
    cacheTtlSeconds: number,
  ) {
    const ttlMs = cacheTtlSeconds * 1000;
    this.profileCache = new TtlCache<CompanyProfile>(ttlMs);
    this.officersCache = new TtlCache<OfficersResult>(ttlMs);
  }

  async search(args: SearchArgs): Promise<HandlerResult<SearchResult>> {
    const result = await this.client.get<unknown>("/search/companies", {
      q: args.query,
      items_per_page: clamp(
        args.items_per_page,
        PAGE_SIZE.SEARCH.default,
        PAGE_SIZE.SEARCH.max,
      ),
      start_index: args.start_index,
    });
    if (!result.ok) return result;
    return { ok: true, data: projectSearch(result.data as never, args.query) };
  }

  async profile(args: ProfileArgs): Promise<HandlerResult<CompanyProfile>> {
    const normalised = normaliseCompanyNumber(args.company_number);
    if (!normalised.ok) return normalised;
    const number = normalised.value;

    const cached = this.profileCache.get(number);
    if (cached) return { ok: true, data: cached };

    const result = await this.client.get<unknown>(`/company/${number}`);
    if (!result.ok) return result;

    const data = projectProfile(result.data as never);
    this.profileCache.set(number, data);
    return { ok: true, data };
  }

  async officers(args: OfficersArgs): Promise<HandlerResult<OfficersResult>> {
    const normalised = normaliseCompanyNumber(args.company_number);
    if (!normalised.ok) return normalised;
    const number = normalised.value;

    const perPage = clamp(
      args.items_per_page,
      PAGE_SIZE.OFFICERS.default,
      PAGE_SIZE.OFFICERS.max,
    );
    const startIndex = args.start_index ?? 0;
    const key = `${number}:${startIndex}:${perPage}:${args.order_by ?? ""}`;

    const cached = this.officersCache.get(key);
    if (cached) return { ok: true, data: cached };

    const result = await this.client.get<unknown>(
      `/company/${number}/officers`,
      {
        items_per_page: perPage,
        start_index: args.start_index,
        order_by: args.order_by,
      },
    );
    if (!result.ok) return result;

    const data = projectOfficers(result.data as never, number);
    this.officersCache.set(key, data);
    return { ok: true, data };
  }

  async filingHistory(
    args: FilingHistoryArgs,
  ): Promise<HandlerResult<FilingHistoryResult>> {
    const normalised = normaliseCompanyNumber(args.company_number);
    if (!normalised.ok) return normalised;
    const number = normalised.value;

    const result = await this.client.get<unknown>(
      `/company/${number}/filing-history`,
      {
        category: args.category,
        items_per_page: clamp(
          args.items_per_page,
          PAGE_SIZE.FILING_HISTORY.default,
          PAGE_SIZE.FILING_HISTORY.max,
        ),
        start_index: args.start_index,
      },
    );
    if (!result.ok) return result;

    return {
      ok: true,
      data: projectFilingHistory(result.data as never, number),
    };
  }
}
