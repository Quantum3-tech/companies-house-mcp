import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import type { FetchLike } from "../src/httpClient.js";

const here = dirname(fileURLToPath(import.meta.url));

export function loadFixture(name: string): unknown {
  const path = join(here, "fixtures", name);
  return JSON.parse(readFileSync(path, "utf8"));
}

export interface StubResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** Set to throw a network-level error instead of responding. */
  networkError?: boolean;
}

/** Build a FetchLike that returns queued responses in order, and records the
 *  URLs it was called with. */
export function stubFetch(responses: StubResponse[]): {
  fetch: FetchLike;
  calls: string[];
} {
  const calls: string[] = [];
  let i = 0;
  const fetch: FetchLike = async (url) => {
    calls.push(url);
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    if (!r || r.networkError) {
      throw new Error("network down");
    }
    const headers = r.headers ?? {};
    return {
      status: r.status,
      headers: { get: (name: string) => headers[name] ?? null },
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    };
  };
  return { fetch, calls };
}
