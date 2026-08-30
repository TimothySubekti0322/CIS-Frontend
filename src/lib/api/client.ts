import { config, isMockMode } from "@/lib/config";
import { getToken } from "@/lib/auth/token";
import { ApiError } from "@/types/common";
import { buildPath } from "./endpoints";
import { mockHandlers, type MockContext } from "./mock/handlers";

interface EndpointDef {
  method: string;
  path: string;
}

interface CallOptions {
  params?: Record<string, string | number>;
  query?: Record<string, unknown>;
  body?: unknown;
}

/**
 * Single entry point for every API call.
 *
 * - live mode: `fetch` against NEXT_PUBLIC_API_BASE_URL, Bearer token attached.
 * - mock mode: dispatched to an in-memory handler keyed by the endpoint's path
 *   template (see `src/lib/api/mock/handlers.ts`).
 */
async function call<T>(endpoint: EndpointDef, options: CallOptions = {}): Promise<T> {
  const { params, query, body } = options;

  if (isMockMode) {
    const handler = mockHandlers[`${endpoint.method} ${endpoint.path}`];
    if (!handler) {
      throw new ApiError(
        `No mock handler for ${endpoint.method} ${endpoint.path}`,
        501,
      );
    }
    const ctx: MockContext = {
      method: endpoint.method,
      params: params ?? {},
      query: query ?? {},
      body,
    };
    return handler(ctx) as Promise<T>;
  }

  if (!config.apiBaseUrl) {
    throw new ApiError(
      "NEXT_PUBLIC_API_BASE_URL is not set. Configure it or use NEXT_PUBLIC_API_MODE=mock.",
      500,
    );
  }

  const url = config.apiBaseUrl.replace(/\/$/, "") + buildPath(endpoint.path, params, query);
  const token = getToken();

  let res: Response;
  try {
    res = await fetch(url, {
      method: endpoint.method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (err) {
    throw new ApiError(
      "Network error — the CIS backend could not be reached.",
      0,
      err,
    );
  }

  const text = await res.text();
  const payload = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : null) ?? `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const apiClient = { call };
