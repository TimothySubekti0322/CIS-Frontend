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
  internalRoutesAuthenticated: boolean;
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
   * `GET /health/ready` — database, storage driver and AI service config.
   * 503 when the database ping fails, echoing the same payload under
   * `error.details`.
   */
  async ready(): Promise<Readiness> {
    const dto = await apiClient.call<ReadinessDto>(ENDPOINTS.health.ready);
    return {
      database: dto?.database ?? "unknown",
      storageDriver: dto?.storage_driver ?? "unknown",
      aiServiceConfigured: dto?.ai_service?.configured ?? false,
      internalRoutesAuthenticated: dto?.internal_routes_authenticated ?? false,
    };
  },
};
