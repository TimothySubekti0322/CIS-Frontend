import { apiClient } from "./client";
import type {
  ClusterResultDto,
  GeneratedClaimDto,
  ReconcileResultDto,
  RescoreResultDto,
  SampleContentResultDto,
  SnapshotResultDto,
} from "./dto";
import { ENDPOINTS } from "./endpoints";

export interface GeneratedClaim {
  claimId: string | null;
  claimStatement: string | null;
  topicId: string | null;
  /** The "last fetched" label moves to the moment the button was clicked. */
  lastFetchedAt: string | null;
}

/** `POST /admin/cluster-now`, and the clustering half of sample generation. */
export interface ClusterResult {
  claimsCreated: number;
  claimsUpdated: number;
  contentItemsClustered: number;
}

/**
 * `POST /admin/generate-sample-content`. The three clustering counts are `null`
 * when `autoCluster` was false — nothing was clustered, which is different
 * from clustering that produced nothing.
 */
export interface SampleContentResult {
  generatedCount: number;
  failedCount: number;
  claimsCreated: number | null;
  claimsUpdated: number | null;
  contentItemsClustered: number | null;
  lastFetchedAt: string | null;
  message: string | null;
}

export interface SampleContentOptions {
  /** 1–50, default 10. */
  count?: number;
  /** Max 255 characters; steers what the generated content is about. */
  topicHint?: string;
  /** Default true — clustering runs synchronously so counts can be reported. */
  autoCluster?: boolean;
}

/** `POST /admin/reconcile`. Nothing here is recoverable — prefer a dry run. */
export interface ReconcileResult {
  dryRun: boolean;
  orphanedReviews: number;
  orphanedAlerts: number;
  orphanedScoreSnapshots: number;
  policiesUnlinked: number;
  claimsInDatabase: number;
  aiPoliciesInDatabase: number;
  message: string | null;
}

function n(value: number | null | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableN(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export const adminApi = {
  /**
   * `POST /admin/generate-generic-claim` — admin test-data utility.
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
   * watched claim immediately, building alert chart history without waiting
   * for the hourly job. Returns 0 when the watchlist is empty.
   *
   * This captures *current* scores; it does not recompute them. The cron job
   * calls `rescore` first, so a manual rescore followed by a manual snapshot
   * reproduces exactly what the cron does.
   */
  async snapshotScores(): Promise<number> {
    const dto = await apiClient.call<SnapshotResultDto>(
      ENDPOINTS.admin.snapshotScores,
    );
    return dto?.snapshots_captured ?? 0;
  },

  /**
   * `POST /admin/rescore` — asks the AI service to re-evaluate every Existing
   * claim's score.
   *
   * A claim's score moves with wall-clock time even when nothing new is
   * ingested: NPR drifts as opposing posts age out of the rolling window, which
   * changes the discount factor and therefore FinalClaimScore. Without this the
   * alert trend chart would plot the same number every hour — a horizontal
   * line by construction. Long call; 503 without an AI service.
   */
  async rescore(): Promise<number> {
    const dto = await apiClient.call<RescoreResultDto>(ENDPOINTS.admin.rescore);
    return n(dto?.claims_rescored);
  },

  /**
   * `POST /admin/generate-sample-content` — populates the databank with
   * fabricated but realistic content, run through the same
   * embed → analyze → cluster pipeline real crawled content would be.
   *
   * Until a live crawler exists this is the only way content enters the system
   * through the product, so it is also the only route to new Existing claims
   * outside policy matchmaking. Long call when `autoCluster` is on.
   */
  async generateSampleContent(
    options: SampleContentOptions = {},
  ): Promise<SampleContentResult> {
    const dto = await apiClient.call<SampleContentResultDto>(
      ENDPOINTS.admin.generateSampleContent,
      {
        body: {
          count: options.count,
          topic_hint: options.topicHint,
          auto_cluster: options.autoCluster,
        },
      },
    );
    return {
      generatedCount: n(dto?.generated_count),
      failedCount: n(dto?.failed_count),
      // Null-preserving on purpose: "not clustered" must not read as "0 claims".
      claimsCreated: nullableN(dto?.claims_created),
      claimsUpdated: nullableN(dto?.claims_updated),
      contentItemsClustered: nullableN(dto?.content_items_clustered),
      lastFetchedAt: dto?.last_fetched_at ?? null,
      message: dto?.message ?? null,
    };
  },

  /**
   * `POST /admin/cluster-now` — forces a clustering pass over content the AI
   * service has ingested but not yet grouped into claims. Normally
   * unnecessary; ingestion triggers clustering on its own in the background.
   */
  async clusterNow(): Promise<ClusterResult> {
    const dto = await apiClient.call<ClusterResultDto>(ENDPOINTS.admin.clusterNow);
    return {
      claimsCreated: n(dto?.claims_created),
      claimsUpdated: n(dto?.claims_updated),
      contentItemsClustered: n(dto?.content_items_clustered),
    };
  },

  /**
   * `POST /admin/reconcile` — clears backend rows whose AI-side claim or policy
   * no longer exists, after a demo reseed or schema reset on the AI side.
   *
   * Every backend reference into an AI table is a soft one with no foreign key,
   * so nothing cascades. Reviews, watchlist rows and snapshots are deleted;
   * policies are re-queued rather than merely unlinked.
   *
   * A `409 CONFLICT` is the empty-database guard: if the AI tables are present
   * but empty, every backend reference looks orphaned and a full sweep would
   * erase the entire human layer. Surface its `message` verbatim.
   */
  async reconcile(
    options: { dryRun?: boolean; force?: boolean } = {},
  ): Promise<ReconcileResult> {
    const dto = await apiClient.call<ReconcileResultDto>(ENDPOINTS.admin.reconcile, {
      body: { dry_run: options.dryRun, force: options.force },
    });
    return {
      dryRun: dto?.dry_run ?? false,
      orphanedReviews: n(dto?.orphaned_reviews),
      orphanedAlerts: n(dto?.orphaned_alerts),
      orphanedScoreSnapshots: n(dto?.orphaned_score_snapshots),
      policiesUnlinked: n(dto?.policies_unlinked),
      claimsInDatabase: n(dto?.claims_in_database),
      aiPoliciesInDatabase: n(dto?.ai_policies_in_database),
      message: dto?.message ?? null,
    };
  },
};
