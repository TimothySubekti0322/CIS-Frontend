/**
 * Shared primitives that mirror the CIS backend's response contract.
 * See `docs` — "CIS API Runbook": every route answers with the same envelope.
 */

/** A subject-area grouping for claims. Owned and written by the AI service. */
export interface Topic {
  id: string;
  name: string;
  description: string | null;
  /** Per-type claim counts returned by `GET /topics`. */
  existingClaimCount: number;
  nonExistingClaimCount: number;
}

/** `meta` block added by every paginated list endpoint. */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** A mapped list response: rows plus the backend's pagination meta. */
export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

/** Pagination inputs accepted by every list endpoint (`limit` clamps at 200). */
export interface PageParams {
  page?: number;
  limit?: number;
}

/** Error codes the backend returns in `error.code`. */
export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_FAILED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNPROCESSABLE_ENTITY"
  | "INTERNAL_ERROR"
  | "SERVICE_UNAVAILABLE";

/** Success envelope: `{ success, message, data, meta? }`. */
export interface ApiEnvelope<T> {
  success: true;
  message: string;
  data: T;
  meta?: PageMetaDto;
}

/** Failure envelope: `{ success: false, message, error: { code, details? } }`. */
export interface ApiErrorEnvelope {
  success: false;
  message: string;
  error?: {
    code?: ApiErrorCode | string;
    details?: unknown;
  };
}

/** Raw `meta` block, snake_case as the backend sends it. */
export interface PageMetaDto {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/** Normalised API error thrown by the api client. */
export class ApiError extends Error {
  status: number;
  /** `error.code` from the envelope, when the backend supplied one. */
  code: ApiErrorCode | string | null;
  /** `error.details` — field-level validation output, when present. */
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code: ApiErrorCode | string | null = null,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the caller should re-authenticate. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** True when a dependency (AI service, database) is unreachable. */
  get isUnavailable(): boolean {
    return this.status === 503;
  }
}

export type ApiMode = "mock" | "live";
