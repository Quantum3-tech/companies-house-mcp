# companies-house-mcp

An MCP server that lets Claude look up UK companies: search by name, then pull
a company's profile, officers or filing history by number. It talks to the
Companies House Public Data API over stdio.

I built it because the interesting problem is not the HTTP. The API is public
and the calls are trivial. The problem is the contract: deciding what the
model should be able to ask for, what comes back, and how it learns that
something went wrong. That is where almost all of the thinking went, and it is
what the rest of this file is about. If you want the reasoning in full, with
the options I turned down, it is in `DECISIONS.md`.

## Setup

You need a free API key. Register an application at
<https://developer.company-information.service.gov.uk/>, create a key for the
"Public Data API", and copy it.

Then:

```
npm install && npm run build
```

Point Claude Desktop at the built server by adding this to its config file
(`%APPDATA%\Claude\claude_desktop_config.json` on Windows,
`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "companies-house": {
      "command": "node",
      "args": ["C:\\path\\to\\companies-house-mcp\\dist\\index.js"],
      "env": { "COMPANIES_HOUSE_API_KEY": "your-key-here" }
    }
  }
}
```

The key is read from the environment and nowhere else. If it is missing the
server refuses to start and says why, rather than failing on the first call.
Restart Claude Desktop and the four tools appear.

## A real session

This is copied from an actual run. I built the server, pointed it at the live
API, and called each tool through an MCP client. Nothing here is mocked up.
The requests are the lines beginning `>>>`, the responses follow.

```
>>> company_search {"query":"tesco","items_per_page":2}
<<<
{
  "query": "tesco",
  "total_results": 356,
  "items_per_page": 2,
  "start_index": 0,
  "items": [
    {
      "company_number": "00445790",
      "title": "TESCO PLC",
      "company_status": "active",
      "company_type": "plc",
      "date_of_creation": "1947-11-27",
      "address_snippet": "Tesco House, Shire Park, Kestrel Way, Welwyn Garden City, United Kingdom, AL7 1GA"
    },
    {
      "company_number": "09384423",
      "title": "KFORD TYRES (GORNAL) LTD",
      "company_status": "active",
      "company_type": "ltd",
      "date_of_creation": "2015-01-12",
      "address_snippet": "2 Dawley Brook Road, Kingswinford, England, DY6 7BD"
    }
  ]
}

>>> company_profile {"company_number":"00445790"}
<<<
{
  "company_number": "00445790",
  "company_name": "TESCO PLC",
  "company_status": "active",
  "company_type": "plc",
  "data_note": "This profile is a fixed projection. Only the fields present here are fetched. If a property you need (for example charges or insolvency history) is not present, it was not retrieved, not necessarily false.",
  "date_of_creation": "1947-11-27",
  "jurisdiction": "england-wales",
  "registered_office_address": {
    "address_line_1": "Tesco House, Shire Park",
    "address_line_2": "Kestrel Way",
    "locality": "Welwyn Garden City",
    "postal_code": "AL7 1GA",
    "country": "United Kingdom"
  },
  "sic_codes": ["47110"],
  "accounts": {
    "next_due": "2027-08-26",
    "next_made_up_to": "2027-02-26",
    "overdue": false
  }
}

>>> company_officers {"company_number":"00445790","items_per_page":2}
<<<
{
  "company_number": "00445790",
  "active_count": 11,
  "resigned_count": 63,
  "total_results": 74,
  "items_per_page": 2,
  "start_index": 0,
  "items": [
    { "name": "TAYLOR, Christopher Jon", "officer_role": "secretary", "appointed_on": "2025-04-14" },
    {
      "name": "BETHELL, Melissa",
      "officer_role": "director",
      "appointed_on": "2018-09-24",
      "nationality": "British",
      "country_of_residence": "United Kingdom",
      "date_of_birth": { "month": 9, "year": 1974 }
    }
  ]
}

>>> company_filing_history {"company_number":"00445790","items_per_page":2}
<<<
{
  "company_number": "00445790",
  "total_count": 8372,
  "items_per_page": 2,
  "start_index": 0,
  "items": [
    {
      "transaction_id": "MzU0MzY3ODg5MGFkaXF6a2N4",
      "category": "capital",
      "date": "2026-09-16",
      "type": "SH03",
      "description": "Return of purchase of own shares",
      "description_code": "capital-return-purchase-own-shares",
      "pages": 4,
      "paper_filed": true
    },
    {
      "transaction_id": "MzUzOTMzNzQ1OWFkaXF6a2N4",
      "category": "capital",
      "date": "2026-08-26",
      "type": "SH06",
      "description": "Cancellation of shares",
      "description_code": "capital-cancellation-shares",
      "pages": 4,
      "paper_filed": true
    }
  ]
}

>>> company_profile {"company_number":"not-a-number"}
<<< [isError]
{ "ok": false, "error": { "code": "INVALID_COMPANY_NUMBER", "message": "\"not-a-number\" is not a valid company number. Expected eight characters: digits, or a two-letter prefix then six digits, for example 00000006 or SC123456." } }

>>> company_profile {"company_number":"99999999"}
<<< [isError]
{ "ok": false, "error": { "code": "COMPANY_NOT_FOUND", "message": "No company exists for that number." } }
```

A few things in that run are the whole point. The search carries
`company_status`, `company_type`, `date_of_creation` and an address on every
hit, so the model can pick Tesco PLC over a tyre fitter in Kingswinford
without a second call. The two error cases come back as ordinary results the
model can read, flagged `isError`, each with a `code` it can branch on. And
the invalid number never reached the API: it was rejected locally.

The numbers are real as of the run: 356 companies match "tesco", Tesco PLC has
8,372 filings and 74 officer appointments on record, and its accounts are next
due on 26 August 2027.

## The contract, and why it looks like this

Four tools, not one tool with a mode. A single tool would have to mark every
argument optional, because `company_number` is required for three of the four
jobs and meaningless for search. Four tools give the model four tight schemas,
so a call with a missing argument fails against the schema it was handed rather
than three steps later at the API. I rejected the mode parameter for that
reason.

Trimmed responses, not raw upstream JSON. A company profile from Companies
House has more than thirty top-level fields. Most of them the model will never
read, and they cost tokens on every call. I project down to a narrow set and,
while I am there, fix an upstream inconsistency: the profile calls the company
type `type`, search calls it `company_type`, and I expose one name. The cost is
fidelity. If you want `has_charges`, this does not give it to you. I think that
is the right trade for a model client, but it is a trade, and it creates one
specific hazard.

The hazard is that the model cannot tell "absent because it is false" from
"absent because I trimmed it". So the boundary is visible on purpose: each
tool description lists the fields it returns, and the profile carries a
`data_note` saying as much. I rejected an `include_fields` parameter, which
would have let the model pull extras but would also have reopened the gap
between the schema and the projection that sealing the contract is meant to
close.

Errors split in two. Not-found, invalid-number, rate-limited and
upstream-unavailable come back as readable results, because the model can act
differently on each. A missing or bad key does not: that is an operator
problem, so the server validates the key at startup and refuses to run without
one. A 401 arriving mid-session, after a key that worked, is its own code so
the model reports it instead of retrying.

Paging is capped at 100 per call. Companies House documents no maximum, which
surprised me, so the cap is mine and the code says so. Uncapped, a model could
ask for ten thousand filings and spend the whole rate limit on one question.

That rate limit, 600 requests per five minutes per key, is handled before the
fact, not discovered by being refused. A sliding-window limiter holds requests
under the line and waits for a slot; if the wait would be too long it returns
`RATE_LIMITED` with a seconds-to-wait rather than blocking forever. I would
rather the server know the limit than learn it from a 429.

## What it does not do

It covers four endpoints. No charges, no persons-with-significant-control, no
document downloads, no insolvency detail. I scoped it to the things a person
actually asks about a company and stopped.

The filing description table is the weak point. Companies House returns filing
descriptions as enum keys, readable only through a reference file it publishes
separately. I bundled a hand-copied subset of that file, so an unseen code
falls back to a prettified version of the key. It works, and the original code
is always returned alongside, but a hand-copied table goes stale silently. With
more time I would pull the full enumeration file at build time instead of
maintaining a slice of it by hand.

Two other things I would change. The cache is per-process and in-memory with a
TTL but no size bound, which is fine for a desktop tool serving one person and
wrong for anything larger. And the rate limiter is per-process too, so two
servers sharing one key could still exceed the limit between them; a shared
limiter would fix it and is not worth the complexity here.

## Tests

```
npm test
```

The suite runs against fixtures captured from real responses and never touches
the network. The fixtures were taken from companies 00000006 (dissolved) and
00445790 (active) so both the cessation path and the upcoming-accounts path are
covered by real data. `npm run test:live` adds three tests that hit the real
API, and is skipped unless you set a key. `npm run capture` regenerates the
fixtures from live responses.
