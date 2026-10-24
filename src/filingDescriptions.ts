/**
 * Filing-history description resolution.
 *
 * Companies House returns a `description` that is an enum key, not readable
 * text. The readable templates live in a reference file published separately
 * from the API, in the companieshouse/api-enumerations repository, file
 * `filing_history.yml`, under `description`.
 *
 * PROVENANCE: this is a hand-copied SUBSET of that file, taken on 2026-10-24
 * from https://github.com/companieshouse/api-enumerations. It is not complete.
 * It is a copy of someone else's reference data and will go stale silently: if
 * a code is missing or a template has changed upstream, `resolveFilingDescription`
 * falls back to a prettified form of the key, and the original key is returned
 * to the model as `description_code` regardless. See DECISIONS.md.
 *
 * The upstream templates contain {placeholders} filled from each filing's
 * `description_values`. We do not interpolate; we return the template text as
 * a readable label and leave the raw code alongside it.
 */

const DESCRIPTIONS: Record<string, string> = {
  "incorporation-company": "Incorporation",
  "accounts-with-accounts-type-full": "Full accounts",
  "accounts-with-accounts-type-small": "Small company accounts",
  "accounts-with-accounts-type-micro-entity": "Micro-entity accounts",
  "accounts-with-accounts-type-dormant": "Dormant accounts",
  "accounts-with-accounts-type-total-exemption-full":
    "Total exemption full accounts",
  "accounts-with-accounts-type-group": "Group accounts",
  "confirmation-statement": "Confirmation statement",
  "confirmation-statement-with-updates":
    "Confirmation statement with updates",
  "annual-return-company-with-made-up-date": "Annual return",
  "change-person-director-company-with-change-date":
    "Director's details changed",
  "appoint-person-director-company": "Appointment of a director",
  "termination-person-director-company": "Termination of a director",
  "appoint-person-secretary-company": "Appointment of a secretary",
  "termination-person-secretary-company": "Termination of a secretary",
  "change-registered-office-address-company-with-date-old-address-new-address":
    "Registered office address changed",
  "capital-allotment-shares": "Allotment of shares",
  "capital-statement-of-capital": "Statement of capital",
  "mortgage-create-with-deed": "Registration of a charge",
  "mortgage-satisfaction-with-date": "Satisfaction of a charge",
  "dissolution-voluntary": "Voluntary dissolution",
  "gazette-dissolved": "Dissolved by gazette",
  "resolution": "Resolution",
  "change-account-reference-date-company-current-shortened":
    "Accounting reference date shortened",
  // Codes observed in real responses on 2026-10-24 (companies 00000006 and
  // 00445790) and added so resolution is genuine, not just prettified.
  "gazette-dissolved-voluntary":
    "Final gazette dissolved following voluntary strike-off",
  "gazette-notice-voluntary":
    "First gazette notice for voluntary strike-off",
  "gazette-notice-compulsory":
    "First gazette notice for compulsory strike-off",
  "dissolution-application-strike-off-company": "Application to strike off",
  "termination-director-company-with-name-termination-date":
    "Termination of appointment of a director",
  "capital-cancellation-shares": "Cancellation of shares",
  "capital-return-purchase-own-shares":
    "Return of purchase of own shares",
};

/** Turn an unknown enum key into something a human can read. */
function prettify(code: string): string {
  const text = code.replace(/[-_]+/g, " ").trim();
  return text.length > 0 ? text.charAt(0).toUpperCase() + text.slice(1) : code;
}

/** Resolve a filing description code to readable text. Never throws; falls
 *  back to a prettified key when the code is not in the table. */
export function resolveFilingDescription(code: string | undefined): string {
  if (!code) return "Unknown filing";
  return DESCRIPTIONS[code] ?? prettify(code);
}
