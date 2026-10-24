/**
 * MCP server wiring. Registers the four tools with the SDK, passing the zod
 * input shapes straight through so the JSON Schema the model sees and the
 * runtime validation come from one source. Converts handler results into MCP
 * tool content: successes as JSON, failures as JSON with isError set so the
 * model reads the error code.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  TOOL_DESCRIPTIONS,
  TOOL_NAMES,
  companyFilingHistoryInput,
  companyOfficersInput,
  companyProfileInput,
  companySearchInput,
} from "./contract/index.js";
import type { HandlerResult } from "./handlers.js";
import { CompaniesHouseTools } from "./handlers.js";

interface ToolResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

function toToolResult<T>(result: HandlerResult<T>): ToolResult {
  if (result.ok) {
    return {
      content: [{ type: "text", text: JSON.stringify(result.data, null, 2) }],
      structuredContent: result.data as Record<string, unknown>,
    };
  }
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
    isError: true,
  };
}

export function createServer(tools: CompaniesHouseTools): McpServer {
  const server = new McpServer({
    name: "companies-house-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    TOOL_NAMES.SEARCH,
    {
      title: "Search UK companies",
      description: TOOL_DESCRIPTIONS[TOOL_NAMES.SEARCH],
      inputSchema: companySearchInput,
    },
    async (args) => toToolResult(await tools.search(args)),
  );

  server.registerTool(
    TOOL_NAMES.PROFILE,
    {
      title: "UK company profile",
      description: TOOL_DESCRIPTIONS[TOOL_NAMES.PROFILE],
      inputSchema: companyProfileInput,
    },
    async (args) => toToolResult(await tools.profile(args)),
  );

  server.registerTool(
    TOOL_NAMES.OFFICERS,
    {
      title: "UK company officers",
      description: TOOL_DESCRIPTIONS[TOOL_NAMES.OFFICERS],
      inputSchema: companyOfficersInput,
    },
    async (args) => toToolResult(await tools.officers(args)),
  );

  server.registerTool(
    TOOL_NAMES.FILING_HISTORY,
    {
      title: "UK company filing history",
      description: TOOL_DESCRIPTIONS[TOOL_NAMES.FILING_HISTORY],
      inputSchema: companyFilingHistoryInput,
    },
    async (args) => toToolResult(await tools.filingHistory(args)),
  );

  return server;
}
