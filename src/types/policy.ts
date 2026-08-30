import type { ClaimSummary } from "./claim";
import type { PageParams } from "./common";

/** Derived server-side from `rolledOutDate` — never set by the caller. */
export type PolicyStatus = "rolled_out" | "not_rolled_out";

/**
 * AI matchmaking job state.
 * `pending`    queued, the AI call has not started        (is_processing: true)
 * `processing` handed to the AI service, awaiting result  (is_processing: true)
 * `completed`  matchmaking finished, claim lists final
 * `failed`     see `processingError`; retry with /rematch
 * `skipped`    no AI service configured — not an error
 */
export type PolicyProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "skipped";

export interface Policy {
  id: string;
  name: string;
  description: string | null;
  /** Pre-formatted label from the backend, e.g. "January 2026". */
  monthYear: string | null;
  rolledOutDate: string | null;
  status: PolicyStatus;
  fileName: string | null;
  /** Backend-relative path to `GET /policies/:id/file`. */
  downloadUrl: string | null;
  processingStatus: PolicyProcessingStatus;
  isProcessing: boolean;
  processingError: string | null;
  linkedClaimCount: number;
  /** The id in the AI service's own `policies` table. `null` until the
   *  matchmaking callback supplies one — claim lists stay empty until then. */
  aiPolicyId: string | null;
  createdAt: string | null;
}

/** `GET /policies/:id` — adds the two correlated claim lists. */
export interface PolicyDetail extends Policy {
  existingClaims: ClaimSummary[];
  nonExistingClaims: ClaimSummary[];
}

/** `GET /policies/:id/processing` — the lightweight polling payload. */
export interface PolicyProcessing {
  policyId: string;
  processingStatus: PolicyProcessingStatus;
  isProcessing: boolean;
  attempts: number;
  processedAt: string | null;
  aiPolicyId: string | null;
  linkedClaimCount: number;
  processingError: string | null;
}

export interface PolicyListParams extends PageParams {
  years?: number[];
  q?: string;
  status?: PolicyStatus;
}

/** multipart/form-data payload for `POST /policies`. */
export interface CreatePolicyPayload {
  file: File;
  name: string;
  /** `YYYY-MM-DD`. */
  rolledOutDate: string;
  description?: string;
}

/** `PATCH /policies/:id` — all optional, at least one required. */
export interface UpdatePolicyPayload {
  name?: string;
  rolledOutDate?: string;
  description?: string;
}

/** True while the "Processing" badge should show and polling should continue. */
export function isPolicyProcessing(status: PolicyProcessingStatus): boolean {
  return status === "pending" || status === "processing";
}
