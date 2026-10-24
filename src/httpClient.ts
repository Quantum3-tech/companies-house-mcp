/**
 * HTTP client for the Companies House Public Data API. Handles Basic auth
 * (key as username, empty password), passes every call through the rate
 * limiter, and maps transport outcomes to the sealed error contract. Returns
 * a discriminated union rather than throwing for expected cases, so handlers
 * stay branch-free.
 */

import type { ErrorCode, ToolError } from "./contract/index.js";
import { DEFAULT_RETRY_AFTER_SECONDS } from "./contract/index.js";
import { RateLimiter, RateLimitExceededError } from "./rateLimiter.js";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ToolError["error"] };

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string> },
) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

function err(
  code: ErrorCode,
  message: string,
  retryAfterSeconds?: number,
): { ok: false; error: ToolError["error"] } {
  return {
    ok: false,
    error:
      retryAfterSeconds === undefined
        ? { code, message }
        : { code, message, retry_after_seconds: retryAfterSeconds },
  };
}

export interface HttpClientOptions {
  apiKey: string;
  baseUrl: string;
  rateLimiter: RateLimiter;
  fetchImpl?: FetchLike;
}

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly rateLimiter: RateLimiter;
  private readonly fetchImpl: FetchLike;

  constructor(options: HttpClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;
    this.rateLimiter = options.rateLimiter;
    this.fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  }

  private authHeader(): string {
    const encoded = Buffer.from(`${this.apiKey}:`).toString("base64");
    return `Basic ${encoded}`;
  }

  async get<T>(
    path: string,
    query: Record<string, string | number | undefined> = {},
  ): Promise<ApiResult<T>> {
    try {
      await this.rateLimiter.acquire();
    } catch (e) {
      if (e instanceof RateLimitExceededError) {
        return err(
          "RATE_LIMITED",
          "Local rate limit reached. Wait before retrying.",
          e.retryAfterSeconds,
        );
      }
      throw e;
    }

    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await this.fetchImpl(url.toString(), {
        method: "GET",
        headers: {
          Authorization: this.authHeader(),
          Accept: "application/json",
        },
      });
    } catch {
      return err(
        "UPSTREAM_UNAVAILABLE",
        "Could not reach Companies House. The service may be down or the " +
          "network is unavailable.",
      );
    }

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(
    response: Awaited<ReturnType<FetchLike>>,
  ): Promise<ApiResult<T>> {
    const { status } = response;

    if (status >= 200 && status < 300) {
      return { ok: true, data: (await response.json()) as T };
    }

    if (status === 404) {
      return err(
        "COMPANY_NOT_FOUND",
        "No company exists for that number.",
      );
    }

    if (status === 401) {
      return err(
        "UPSTREAM_AUTH_FAILED",
        "Companies House rejected the API key on this request. This is a " +
          "server configuration problem, not something to retry.",
      );
    }

    if (status === 429) {
      const header = response.headers.get("Retry-After");
      const parsed = header ? Number(header) : NaN;
      const retryAfter = Number.isFinite(parsed)
        ? parsed
        : DEFAULT_RETRY_AFTER_SECONDS;
      return err(
        "RATE_LIMITED",
        "Companies House returned a rate limit response. Wait before " +
          "retrying.",
        retryAfter,
      );
    }

    if (status >= 500) {
      return err(
        "UPSTREAM_UNAVAILABLE",
        `Companies House returned ${status}. The service is having trouble; ` +
          "try again shortly.",
      );
    }

    return err(
      "UPSTREAM_UNAVAILABLE",
      `Unexpected response from Companies House (status ${status}).`,
    );
  }
}
