import { apiClient } from "./client";
import type { GeneratedClaimDto, SnapshotResultDto } from "./dto";
import { ENDPOINTS } from "./endpoints";

export interface GeneratedClaim {
  claimId: string | null;
  claimStatement: string | null;
  topicId: string | null;
  /** The S1 "last fetched" label moves to the moment the button was clicked. */
  lastFetchedAt: string | null;
}

export const adminApi = {
  /**
   * `POST /admin/generate-generic-claim` — the F4 test-data utility.
   *
   * This is the one AI call the backend awaits inline: `claims` is owned and
   * written exclusively by the AI service, so the backend proxies the request
   * and the caller's response is the AI service's. 503 when `AI_SERVICE_URL`
   * is unconfigured.
   */
  async generateGenericClaim(topicId?: string): Promise<GeneratedClaim> {
    const dto = await apiClient.call<GeneratedClaimDto>(
      ENDPOINTS.admin.generateGenericClaim,
      { body: topicId ? { topic_id: topicId } : {} },
    );
    return {
      claimId: dto?.claim_id ?? null,
      claimStatement: dto?.claim_statement ?? null,
      topicId: dto?.topic_id ?? null,
      lastFetchedAt: dto?.last_fetched_at ?? null,
    };
  },

  /**
   * `POST /admin/snapshot-scores` — captures a score snapshot for every
   * watched claim immediately, building F3 chart history without waiting for
   * the hourly cron. Returns 0 when the watchlist is empty.
   */
  async snapshotScores(): Promise<number> {
    const dto = await apiClient.call<SnapshotResultDto>(
      ENDPOINTS.admin.snapshotScores,
    );
    return dto?.snapshots_captured ?? 0;
  },
};
