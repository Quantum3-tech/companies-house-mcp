# companies-house-mcp

An MCP server exposing UK Companies House data to Claude.

## Standing rules

These hold for every change. They are not suggestions.

1. **Every Markdown file follows these writing rules.** Plain British
   English, first person singular, no emoji, no em dashes. Say what the thing
   does not do and what I would change with more time. Every number comes from
   a run that actually happened. No Features, Contributing or Roadmap sections.
   Cut any sentence that would survive a find-and-replace of the project name.
   Re-read this list immediately before committing a doc change. The README is
   part of the product here, not an afterthought.

2. **Read the live Companies House API docs before implementing any endpoint.**
   Do not implement from memory or assumption. The reference is at
   developer.company-information.service.gov.uk. If a response shape differs
   from what was expected, change the code, not the expectation.

3. **`src/contract/` is sealed.** Tool names, input schemas and output shapes
   live there. Changing anything in that directory requires an explicit
   instruction saying so. Everything else may be refactored freely.

4. **Tests never hit the real API without an explicit opt-in.** Fixtures by
   default. A test that requires the network is marked and skipped unless
   `LIVE_API_TESTS=1` is set.

5. **A failing test may be the correct outcome.** If a test fails because the
   behaviour is wrong, say so rather than editing the test to pass.

6. **No secrets in the repo.** The API key comes from the environment. There
   is a `.env.example` with the variable names and no values.

7. **Commit after each working increment.** Messages are imperative, lower
   case, no trailing full stop, and say what changed and why rather than which
   file was touched. Do not batch a day's work into one commit.

## What this is

A Model Context Protocol server that lets Claude look up UK company data:
search, company profile, officers, filing history.

The point of the project is the contract design. The API is public and the
HTTP calls are trivial. What is not trivial is deciding what the model should
be able to ask for, what it gets back, and how it finds out something went
wrong. Design decisions go in `DECISIONS.md` as they are made, with the
option that was rejected and why.

## Stack

- TypeScript, strict mode, no `any` that is not justified in a comment
- `@modelcontextprotocol/sdk`
- stdio transport
- `zod` for input validation, with schemas derived from the same source as
  the JSON Schema given to the model, so the two cannot drift
- `vitest`
- No framework beyond that. No build tooling that is not needed.

## Constraints that shape the design

- Companies House enforces a rate limit. Handle it deliberately: the model
  must be able to tell a rate limit from a not-found from a bad key, and the
  server must not silently swallow or retry forever.
- Companies House responses are large and contain a lot the model will never
  need. Returning raw upstream JSON is a choice, and so is trimming. Pick one,
  and write down why in `DECISIONS.md`.
- A model that has to make three calls to answer one question is a contract
  failure. Search results should carry enough to decide without a follow-up.

## Definition of done for this repo

- A working server that Claude Desktop can connect to, with setup instructions
  that someone else can follow without asking a question.
- Tests covering the tool handlers and the error paths, running without network.
- `DECISIONS.md` with at least four real decisions, each with the rejected
  alternative.
- A README that follows the writing rules above, including a real transcript of
  Claude using the server and a section on what it does not do.
