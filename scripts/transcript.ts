/**
 * Drive the built server over stdio with real tool calls and print the
 * exchange. Used to produce the transcript in the README from an actual
 * session. Reads the key from the environment and passes it to the spawned
 * server; the key is never printed.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main(): Promise<void> {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) {
    process.stderr.write("COMPANIES_HOUSE_API_KEY is not set.\n");
    process.exit(1);
  }

  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: { ...process.env, COMPANIES_HOUSE_API_KEY: key },
  });
  const client = new Client({ name: "transcript", version: "0.0.0" });
  await client.connect(transport);

  const calls: Array<[string, Record<string, unknown>]> = [
    ["company_search", { query: "tesco", items_per_page: 2 }],
    ["company_profile", { company_number: "00445790" }],
    ["company_officers", { company_number: "00445790", items_per_page: 2 }],
    ["company_filing_history", { company_number: "00445790", items_per_page: 2 }],
    ["company_profile", { company_number: "not-a-number" }],
    ["company_profile", { company_number: "99999999" }],
  ];

  for (const [name, args] of calls) {
    process.stdout.write(`\n>>> ${name} ${JSON.stringify(args)}\n`);
    const res = await client.callTool({ name, arguments: args });
    const content = res.content as Array<{ type: string; text?: string }>;
    const text = content.map((c) => c.text ?? "").join("\n");
    const flag = res.isError ? " [isError]" : "";
    process.stdout.write(`<<<${flag}\n${text}\n`);
  }

  await client.close();
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
