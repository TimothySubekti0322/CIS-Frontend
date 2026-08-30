/** A subject-area grouping for claims (PRD US3, US6). */
export interface Topic {
  id: string;
  label: string;
}

/** Standard paginated list envelope returned by list endpoints. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Normalised API error shape thrown by the api client. */
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export type ApiMode = "mock" | "live";
