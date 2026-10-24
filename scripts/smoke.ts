/**
 * Smoke check: spawn the built server over stdio and list its tools. Uses a
 * dummy key, since tools/list makes no API call. Prints the tool names and
 * each input schema so the contract surface can be eyeballed.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main(): Promise<void> {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: { ...process.env, COMPANIES_HOUSE_API_KEY: "dummy-key-for-smoke" },
  });
  const client = new Client({ name: "smoke", version: "0.0.0" });
  await client.connect(transport);

  const { tools } = await client.listTools();
  for (const tool of tools) {
    process.stdout.write(`\n# ${tool.name}\n${tool.description}\n`);
    process.stdout.write(
      `inputSchema: ${JSON.stringify(tool.inputSchema)}\n`,
    );
  }

  await client.close();
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
