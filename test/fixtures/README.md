# Test fixtures

These JSON files are request/response bodies in the shape the Companies House
Public Data API returns. They drive the offline unit tests, which never touch
the network.

Provenance: these were written by hand to match the documented response
schemas (the field names, nesting and the quirks the projection code exists to
handle: `type` versus `company_type`, `total_count` versus `total_results`,
filing `description` as an enum key, date of birth as month and year only).
They are representative, not a captured snapshot of any one company's live
record.

To replace them with genuinely captured responses, set a key and run:

    COMPANIES_HOUSE_API_KEY=yourkey npm run capture

That script calls the live API and overwrites these files with real bodies.
The live test suite (`npm run test:live`) checks the projections against the
live API directly.
