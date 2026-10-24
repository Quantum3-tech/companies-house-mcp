/**
 * Capture real Companies House responses into test/fixtures.
 *
 * Usage: COMPANIES_HOUSE_API_KEY=yourkey npm run capture
 *
 * This overwrites the hand-written fixtures with genuine response bodies so
 * the offline tests run against something real. It calls the live API, so it
 * is not part of the test run and is gated on a key being present.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const key = process.env.COMPANIES_HOUSE_API_KEY?.trim();
if (!key) {
  process.stderr.write("COMPANIES_HOUSE_API_KEY is not set.\n");
  process.exit(1);
}

const base = "https://api.company-information.service.gov.uk";
const auth = `Basic ${Buffer.from(`${key}:`).toString("base64")}`;
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "test", "fixtures");

async function get(path: string): Promise<unknown> {
  const res = await fetch(base + path, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`${path} returned ${res.status}`);
  }
  return res.json();
}

async function main(): Promise<void> {
  // A well-known, long-standing registration used in the CH docs.
  const number = process.argv[2] ?? "00000006";

  const jobs: Array<[string, string]> = [
    ["search-companies.json", "/search/companies?q=tesco&items_per_page=2"],
    ["company-profile.json", `/company/${number}`],
    ["officers.json", `/company/${number}/officers?items_per_page=5`],
    ["filing-history.json", `/company/${number}/filing-history?items_per_page=5`],
  ];

  for (const [file, path] of jobs) {
    const body = await get(path);
    writeFileSync(join(outDir, file), JSON.stringify(body, null, 2) + "\n");
    process.stdout.write(`wrote ${file} from ${path}\n`);
  }
}

main().catch((e) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
