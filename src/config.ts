/**
 * Configuration, read once from the environment. The API key is validated
 * here, at startup: a missing key is an operator problem the model cannot fix,
 * so the server refuses to start rather than returning it as a tool error.
 */

export interface Config {
  apiKey: string;
  baseUrl: string;
  cacheTtlSeconds: number;
}

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "COMPANIES_HOUSE_API_KEY is not set. Register an application at " +
        "https://developer.company-information.service.gov.uk/ to get a key, " +
        "then set it in the environment. See .env.example.",
    );
    this.name = "MissingApiKeyError";
  }
}

const DEFAULT_BASE_URL = "https://api.company-information.service.gov.uk";
const DEFAULT_CACHE_TTL_SECONDS = 60;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = env.COMPANIES_HOUSE_API_KEY?.trim();
  if (!apiKey) {
    throw new MissingApiKeyError();
  }

  const baseUrl = (
    env.COMPANIES_HOUSE_BASE_URL?.trim() || DEFAULT_BASE_URL
  ).replace(/\/+$/, "");

  const ttlRaw = env.COMPANIES_HOUSE_CACHE_TTL_SECONDS?.trim();
  const cacheTtlSeconds =
    ttlRaw && Number.isFinite(Number(ttlRaw))
      ? Math.max(0, Number(ttlRaw))
      : DEFAULT_CACHE_TTL_SECONDS;

  return { apiKey, baseUrl, cacheTtlSeconds };
}
