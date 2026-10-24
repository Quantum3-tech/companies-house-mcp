# Decisions

Each entry is a choice I made, the option I turned down, and why. Newest last.
I write these as I go, not at the end.

## Four tools, not one tool with a mode

I exposed `company_search`, `company_profile`, `company_officers` and
`company_filing_history` as four tools.

Rejected: a single tool with a `mode` enum and a shared parameter bag.

A mode enum makes every parameter optional in the schema, because
`company_number` is required for three modes and meaningless for search. The
model then has to learn from prose which parameters go with which mode, and
the schema cannot enforce it. Four tools give four tight schemas, so a call
missing a required argument fails validation against the schema the model was
handed, not three steps later at the API. The cost is four entries in the tool
list instead of one. I think that is the right trade.

## Trimmed projections, not upstream JSON

Each tool returns a narrow projection. The profile response, for one, drops
more than twenty upstream fields.

Rejected: returning the Companies House JSON verbatim.

Verbatim is honest and future-proof: nothing is hidden. But a profile carries
`etag`, `can_file`, `super_secure_managing_officer_count` and a dozen more the
model will not use, and they cost tokens on every call. Trimming also let me
fix a naming inconsistency (see below) and resolve filing description codes to
text. What is lost is fidelity: a caller wanting `has_charges` does not get it.
I would rather start narrow and add a field when a real question needs it, each
addition recorded here.

## The trimming boundary is made visible

Trimming creates a specific risk: the model cannot tell "absent because the
real value is false" from "absent because I did not fetch it". Asked whether a
company has charges, it would guess.

Rejected: leaving the boundary implicit, or adding an `include_fields`
parameter to pull extras on demand.

I made the boundary visible instead of extensible. Every tool description lists
the exact fields it returns, and the profile result carries a constant
`data_note` spelling out that an absent field means not fetched. An
`include_fields` parameter would reopen the drift between schema and
projection that sealing the contract is meant to prevent, and it would let the
model request fields I have not shaped. If demand for extra fields turns out to
be real, that is a contract change made on purpose, not a parameter.

## Errors the model can act on are results; the rest are not

`COMPANY_NOT_FOUND`, `INVALID_COMPANY_NUMBER`, `RATE_LIMITED` and
`UPSTREAM_UNAVAILABLE` come back as ordinary tool results with `isError: true`
and a stable `code`. A bad or missing API key does not.

Rejected: making every error a JSON-RPC protocol error; and the opposite,
making every error including the key a tool result.

A protocol error is opaque to the model: it cannot branch on "wait twenty
seconds" versus "this company does not exist". Those cases have to be in
content the model can read. But a missing or malformed key is an operator
problem the model cannot fix, so the server validates the key at startup and
refuses to run without one. A 401 that arrives mid-session, after a key that
worked, is a separate code, `UPSTREAM_AUTH_FAILED`, which tells the model to
report it and stop retrying rather than treat it as being about the query.

## Company-number format is checked in the handler, not the schema

The `company_number` input is typed as a plain string. The format check lives
in the handler.

Rejected: a zod regex on the input schema.

A regex on the schema would be caught by the SDK before the handler runs and
surface as a protocol error, which contradicts the decision above:
`INVALID_COMPANY_NUMBER` is meant to be a readable result. So the handler
normalises and checks the format itself, still before any HTTP call, and
returns the structured error.

## Rate limiting is enforced locally against the documented 600 per 5 minutes

A sliding-window limiter caps outgoing requests just under the documented
limit. On `RATE_LIMITED`, the result carries `retry_after_seconds`.

Rejected: discovering the limit by being refused and reacting to 429s; and
retrying indefinitely.

The brief is explicit that the server should respect the limit rather than
find it by refusal, and must not retry forever. The limiter waits for a free
slot up to a bound; past that bound it returns `RATE_LIMITED` rather than
blocking the call indefinitely. A 429 from upstream (possible, since the limit
is per application and another process may share the key) maps to the same
code. The documented limit is 600 per rolling five minutes, per application,
not per IP.

## Default retry-after is the full window when the header is absent

Companies House returns 429 on the limit, and the rate-limiting guide does not
promise a `Retry-After` header. When one is sent I pass it through. When it is
not, I return 300 seconds.

Rejected: omitting the field, or defaulting to a small number like 5 seconds.

Omitting it leaves the model to invent a wait. A small default risks another
immediate refusal. Three hundred seconds is the full documented window:
waiting it out is guaranteed safe and cannot trip the limit again. It is
conservative on purpose.

## Page-size caps are ours, declared per tool

Each paging tool caps `items_per_page` (search and filing history and officers
all max at 100, with per-tool defaults).

Rejected: leaving paging uncapped; refusing paging entirely; and assuming one
documented maximum for all four.

I checked the live docs: Companies House documents no maximum `items_per_page`
for any of these endpoints, and no global one. So the cap is a decision I am
making, not a limit I am mirroring, and I say so in the code. Uncapped, a model
could ask for ten thousand items and burn the rate limit and the context in
one call. Refusing paging breaks officers and filings for large companies. The
caps sit per tool so one can change without the others.

## Resolve filing description codes, keep the original

Filing items arrive with a `description` that is an enum key such as
`incorporation-company`, readable only through a lookup table Companies House
publishes separately. I resolve it to text and also return the original key as
`description_code`.

Rejected: returning the raw code only; or the resolved text only.

The raw code alone is close to useless to the model. The resolved text alone
loses information if my bundled table is stale or missing an entry. Returning
both means the resolution is a convenience, not a dependency. The table is a
copy of someone else's reference data and will go stale silently, so its
source and the date I took it are recorded with the table in
`src/filingDescriptions.ts`.

## A small TTL cache on profile and officers

Profile and officers responses are cached in memory for a short TTL (60
seconds by default, configurable). Search and filing history are not cached.

Rejected: no cache at all in v1.

Six hundred requests per five minutes is tight once a model starts exploring,
and a company profile does not change minute to minute. A short TTL cuts repeat
calls during a single line of questioning without serving stale data in any way
a user would notice. I left search uncached because queries vary too much to
hit, and filing history uncached because it is the one a user is most likely to
re-run expecting a just-filed document to appear.
