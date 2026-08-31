import { apiClient } from "./client";
import type { HealthDto, ReadinessDto } from "./dto";
import { ENDPOINTS } from "./endpoints";

export interface Health {
  status: string;
  service: string;
  environment: string;
  uptimeSeconds: number;
}

export interface Readiness {
  database: string;
  storageDriver: string;
  aiServiceConfigured: boolean;
  /**
   * `null` when the AI service is not configured — there is nothing to reach.
   * An unreachable AI service does NOT make the probe fail: only a database
   * failure returns 503.
   */
  aiServiceReachable: boolean | null;
  /** Present only when `aiServiceReachable` is false. */
  aiServiceError: string | null;
}

/**
 * Ops probes. Both are public and mounted at the API root, outside `/api/v1`.
 * Not used by any screen — they exist so a deploy check or a "backend
 * reachable?" banner has a first-class call to make.
 */
export const healthApi = {
  /** `GET /health` — liveness only, no dependency checks. */
  async live(): Promise<Health> {
    const dto = await apiClient.call<HealthDto>(ENDPOINTS.health.live);
    return {
      status: dto?.status ?? "unknown",
      service: dto?.service ?? "",
      environment: dto?.environment ?? "",
      uptimeSeconds: dto?.uptime_seconds ?? 0,
    };
  },

  /**
   * `GET /health/ready` — database, storage driver and AI service reachability.
   * 503 only when the database ping fails, echoing the same payload under
   * `error.details`.
   */
  async ready(): Promise<Readiness> {
    const dto = await apiClient.call<ReadinessDto>(ENDPOINTS.health.ready);
    const ai = dto?.ai_service ?? null;
    const configured = ai?.configured ?? false;
    return {
      database: dto?.database ?? "unknown",
      storageDriver: dto?.storage_driver ?? "unknown",
      aiServiceConfigured: configured,
      // `reachable` is only sent when configured, so an unconfigured service
      // reports null rather than a misleading `false`.
      aiServiceReachable: configured ? (ai?.reachable ?? false) : null,
      aiServiceError: ai?.error ?? null,
    };
  },
};
