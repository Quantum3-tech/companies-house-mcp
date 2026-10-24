/**
 * SEALED CONTRACT. Do not change without an explicit instruction.
 *
 * The error contract. These codes are the stable surface the model branches
 * on. Not-found and rate-limited are returned as tool results with
 * isError: true, because the model can act on them. A bad or missing API key
 * is NOT here as a startup concern: the server refuses to start without a key
 * (see src/config.ts). A 401 that arrives mid-session is UPSTREAM_AUTH_FAILED,
 * a distinct class the model is told it cannot fix.
 */

export const ERROR_CODES = {
  /** The company number is well formed but no company exists with it. */
  COMPANY_NOT_FOUND: "COMPANY_NOT_FOUND",
  /** The company number does not match the expected format. Caught locally,
   *  before any HTTP call. */
  INVALID_COMPANY_NUMBER: "INVALID_COMPANY_NUMBER",
  /** The 600-per-5-minute limit was hit, locally or upstream. Carries
   *  retry_after_seconds so the model knows how long to wait. */
  RATE_LIMITED: "RATE_LIMITED",
  /** The key was accepted at startup but upstream returned 401 on this call.
   *  The model cannot fix this; it should report it and stop retrying. */
  UPSTREAM_AUTH_FAILED: "UPSTREAM_AUTH_FAILED",
  /** Companies House returned 5xx or was unreachable. Transient. */
  UPSTREAM_UNAVAILABLE: "UPSTREAM_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ToolError {
  error: {
    /** Stable machine-readable case. Branch on this, not on message. */
    code: ErrorCode;
    /** Human-readable explanation. Safe to show a user. */
    message: string;
    /** Present only on RATE_LIMITED. Seconds to wait before retrying. */
    retry_after_seconds?: number;
  };
}

/** Default wait returned on RATE_LIMITED when upstream sends no Retry-After.
 *  Set to the full documented window: waiting the whole window is safe and
 *  cannot itself trip the limit again. */
export const DEFAULT_RETRY_AFTER_SECONDS = 300;
