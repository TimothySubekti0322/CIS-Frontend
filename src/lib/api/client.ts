import { config, isMockMode } from "@/lib/config";
import { clearSession, getRefreshToken, getToken, setSession } from "@/lib/auth/token";
import { ApiError, type ApiEnvelope, type PageMetaDto } from "@/types/common";
import { buildPath, ENDPOINTS, type EndpointDef } from "./endpoints";
import { mockHandlers, type MockContext } from "./mock/handlers";

export interface CallOptions {
  params?: Record<string, string | number>;
  query?: Record<string, unknown>;
  /** JSON body. Ignored when `form` is set. */
  body?: unknown;
  /** multipart/form-data body — `Content-Type` is left to the browser. */
  form?: FormData;
  signal?: AbortSignal;
}

/** An unwrapped envelope: `data` plus the `meta` block list routes add. */
export interface ApiResult<T> {
  data: T;
  meta?: PageMetaDto;
  message: string;
}

/* --------------------------- envelope plumbing --------------------------- */

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Every route answers `{ success, message, data, meta? }`. Anything that is not
 * shaped like the envelope is passed through untouched, so a proxy that strips
 * it (or a future raw route) still works.
 */
function unwrap<T>(payload: unknown): ApiResult<T> {
  if (isRecord(payload) && "success" in payload && "data" in payload) {
    const envelope = payload as unknown as ApiEnvelope<T>;
    return {
      data: envelope.data,
      meta: envelope.meta,
      message: envelope.message ?? "",
    };
  }
  return { data: payload as T, meta: undefined, message: "" };
}

/** Build an ApiError from a failure envelope, falling back to the status. */
function toApiError(payload: unknown, status: number): ApiError {
  if (isRecord(payload)) {
    const message =
      typeof payload.message === "string" && payload.message
        ? payload.message
        : `Request failed with status ${status}`;
    const error = isRecord(payload.error) ? payload.error : null;
    return new ApiError(
      message,
      status,
      typeof error?.code === "string" ? error.code : null,
      error?.details,
    );
  }
  return new ApiError(`Request failed with status ${status}`, status);
}

/* ------------------------------ url building ----------------------------- */

function endpointUrl(endpoint: EndpointDef, options: CallOptions): string {
  const prefix = endpoint.prefix === "none" ? "" : config.apiPrefix;
  return (
    config.apiBaseUrl +
    prefix +
    buildPath(endpoint.path, options.params, options.query)
  );
}

/* --------------------------- refresh single-flight ------------------------ */

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchange the refresh token for a new pair. Single-flight: a burst of 401s
 * (the F1 page fires several queries at once) triggers exactly one exchange,
 * which matters because the presented refresh token is single-use — a second
 * concurrent call would race and lose the session.
 *
 * Returns `true` when the session was renewed and the caller should retry.
 */
async function refreshSession(): Promise<boolean> {
  const token = getRefreshToken();
  if (!token) return false;

  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(
        endpointUrl(ENDPOINTS.auth.refresh, {}),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: token }),
          cache: "no-store",
        },
      );
      if (!res.ok) {
        clearSession();
        return false;
      }
      const { data } = unwrap<{
        access_token?: string;
        refresh_token?: string | null;
        expires_in?: number | null;
      }>(safeJsonParse(await res.text()));
      if (!data?.access_token) {
        clearSession();
        return false;
      }
      setSession(
        data.access_token,
        data.refresh_token ?? null,
        data.expires_in ?? null,
      );
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/* -------------------------------- requests ------------------------------- */

function buildRequest(endpoint: EndpointDef, options: CallOptions): RequestInit {
  const headers: Record<string, string> = { Accept: "application/json" };

  if (!endpoint.public) {
    const token = getToken();
    // The runbook's header, verbatim: `Authorization: Bearer $TOKEN`.
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let body: BodyInit | undefined;
  if (options.form) {
    // Never set Content-Type for FormData — the browser adds the boundary.
    body = options.form;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  return {
    method: endpoint.method,
    headers,
    body,
    signal: options.signal,
    cache: "no-store",
  };
}

async function fetchOnce(
  endpoint: EndpointDef,
  options: CallOptions,
): Promise<Response> {
  try {
    return await fetch(endpointUrl(endpoint, options), buildRequest(endpoint, options));
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(
      "Network error — the CIS backend could not be reached.",
      0,
      null,
      err,
    );
  }
}

/**
 * One authenticated round trip, with a single transparent refresh-and-retry
 * on 401. Public routes (login/register/refresh/health) never retry.
 */
async function request(
  endpoint: EndpointDef,
  options: CallOptions,
): Promise<Response> {
  let res = await fetchOnce(endpoint, options);
  if (res.status === 401 && !endpoint.public && (await refreshSession())) {
    res = await fetchOnce(endpoint, options);
  }
  return res;
}

/* -------------------------------- mock mode ------------------------------ */

async function callMock<T>(
  endpoint: EndpointDef,
  options: CallOptions,
): Promise<ApiResult<T>> {
  const handler = mockHandlers[`${endpoint.method} ${endpoint.path}`];
  if (!handler) {
    throw new ApiError(
      `No mock handler for ${endpoint.method} ${endpoint.path}`,
      501,
      "NOT_FOUND",
    );
  }
  const ctx: MockContext = {
    method: endpoint.method,
    params: options.params ?? {},
    query: options.query ?? {},
    body: options.body,
    form: options.form,
  };
  // Mock handlers return the same envelope the backend does, so the unwrap
  // and mapping paths below are identical in both modes.
  return unwrap<T>(await handler(ctx));
}

/* ------------------------------- public API ------------------------------ */

/** Full envelope — use when the `meta` pagination block is needed. */
async function callWithMeta<T>(
  endpoint: EndpointDef,
  options: CallOptions = {},
): Promise<ApiResult<T>> {
  if (isMockMode) return callMock<T>(endpoint, options);

  if (!config.apiBaseUrl) {
    throw new ApiError(
      "NEXT_PUBLIC_API_BASE_URL is not set. Configure it or use NEXT_PUBLIC_API_MODE=mock.",
      500,
    );
  }

  const res = await request(endpoint, options);
  const text = await res.text();
  const payload = text ? safeJsonParse(text) : null;

  if (!res.ok) throw toApiError(payload, res.status);
  return unwrap<T>(payload);
}

/** The common case: the `data` field of a successful envelope. */
async function call<T>(
  endpoint: EndpointDef,
  options: CallOptions = {},
): Promise<T> {
  const { data } = await callWithMeta<T>(endpoint, options);
  return data;
}

/**
 * Fetch a binary body (the policy document). Follows the backend's 307 to a
 * signed storage URL, and equally handles the local driver streaming bytes
 * directly. Returns the blob plus the filename the response advertises.
 */
async function download(
  endpoint: EndpointDef,
  options: CallOptions = {},
): Promise<{ blob: Blob; fileName: string | null }> {
  if (isMockMode) {
    throw new ApiError(
      "File downloads are not available in mock mode.",
      501,
      "SERVICE_UNAVAILABLE",
    );
  }
  const res = await request(endpoint, options);
  if (!res.ok) {
    const text = await res.text();
    throw toApiError(text ? safeJsonParse(text) : null, res.status);
  }
  return {
    blob: await res.blob(),
    fileName: parseFileName(res.headers.get("Content-Disposition")),
  };
}

function parseFileName(disposition: string | null): string | null {
  if (!disposition) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8) return decodeURIComponent(utf8[1]);
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1] : null;
}

export const apiClient = { call, callWithMeta, download };
