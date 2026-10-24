#!/usr/bin/env node
/**
 * Entry point. Loads config (which refuses to start without an API key),
 * wires the client, rate limiter and tools, and serves over stdio.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig, MissingApiKeyError } from "./config.js";
import { HttpClient } from "./httpClient.js";
import { RateLimiter } from "./rateLimiter.js";
import { CompaniesHouseTools } from "./handlers.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (e) {
    if (e instanceof MissingApiKeyError) {
      process.stderr.write(`${e.message}\n`);
      process.exit(1);
    }
    throw e;
  }

  const rateLimiter = new RateLimiter();
  const client = new HttpClient({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    rateLimiter,
  });
  const tools = new CompaniesHouseTools(client, config.cacheTtlSeconds);
  const server = createServer(tools);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  process.stderr.write(`Fatal: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
