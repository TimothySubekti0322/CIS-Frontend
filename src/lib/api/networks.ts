import type { Paginated } from "@/types/common";
import type {
  AccountAnnexParams,
  AccountAnnexRow,
  AccountDrawer,
  AllowlistActionResult,
  AllowlistPayload,
  BurstTimeline,
  GenerateReportPayload,
  NetworkDetail,
  NetworkGraph,
  NetworkListParams,
  NetworkListResult,
  NetworkReviewLogEntry,
  NetworkStatusFilter,
  RepresentativeContent,
  ReportView,
  UpdateNetworkStatusPayload,
} from "@/types/network";
import { apiClient } from "./client";
import type {
  AccountAnnexRowDto,
  AccountDrawerDto,
  AllowlistActionResultDto,
  BurstTimelineDto,
  NetworkDetailDto,
  NetworkGraphDto,
  NetworkListDto,
  NetworkReviewLogEntryDto,
  RepresentativeContentDto,
  ReportViewDto,
} from "./dto.networks";
import { ENDPOINTS, buildPath } from "./endpoints";
import { mapMeta } from "./mappers";
import {
  mapAccountAnnexRow,
  mapAccountDrawer,
  mapAllowlistResult,
  mapBurstTimeline,
  mapNetworkDetail,
  mapNetworkGraph,
  mapNetworkList,
  mapRepresentativeContent,
  mapReport,
  mapReviewLogEntry,
} from "./mappers.networks";
import { config } from "@/lib/config";

/**
 * F5 — Coordinated-Network Detector.
 *
 * Every route here answers `503 SERVICE_UNAVAILABLE` with a display-ready
 * message when the detection pipeline has not been deployed. That is not an
 * error state to hide: the F5 page renders the message and F1–F4 carry on.
 */
export const networksApi = {
  /**
   * `GET /networks` — the F5 main page (US43–US48).
   *
   * Medium and High only unless `showLowConfidence` is set: PRD 10.6.3 rule 2
   * keeps Low networks behind an explicit toggle, and when revealed they come
   * back flagged `lowConfidence` rather than silently mixed in.
   */
  async list(params: NetworkListParams = {}): Promise<{
    result: NetworkListResult;
    meta: ReturnType<typeof mapMeta>;
  }> {
    const { data, meta } = await apiClient.callWithMeta<NetworkListDto>(
      ENDPOINTS.networks.list,
      {
        query: {
          status: params.status === "all" ? undefined : params.status,
          confidence: params.confidence,
          show_low_confidence: params.showLowConfidence,
          claim_ids: params.claimIds,
          topic_ids: params.topicIds,
          policy_ids: params.policyIds,
          q: params.q,
          detected_from: params.detectedFrom,
          detected_to: params.detectedTo,
          sort: params.sort,
          page: params.page,
          limit: params.limit,
        },
      },
    );
    const result = mapNetworkList(data ?? {});
    return { result, meta: mapMeta(meta, result.networks.length) };
  },

  /**
   * `GET /networks/:id` — US49/US50. The composite is never returned without
   * `whyFlagged`; that is the F5 counterpart of US23's rule for claim scores.
   */
  async get(id: string): Promise<NetworkDetail> {
    const dto = await apiClient.call<NetworkDetailDto>(ENDPOINTS.networks.get, {
      params: { id },
    });
    return mapNetworkDetail(dto);
  },

  /**
   * `PUT /networks/:id/status` — records a human assessment (US52).
   *
   * `reason` is required and at least 20 characters. A network assessment
   * without a stated reason is not recordable: it is the input both the
   * allowlist and the recalibration analysis learn from.
   */
  async updateStatus(
    id: string,
    payload: UpdateNetworkStatusPayload,
  ): Promise<void> {
    await apiClient.call<unknown>(ENDPOINTS.networks.updateStatus, {
      params: { id },
      body: { status: payload.status, reason: payload.reason },
    });
  },

  /** `GET /networks/:id/review-log` — append-only history, newest first. */
  async reviewLog(id: string, limit = 100): Promise<NetworkReviewLogEntry[]> {
    const dto = await apiClient.call<NetworkReviewLogEntryDto[]>(
      ENDPOINTS.networks.reviewLog,
      { params: { id }, query: { limit } },
    );
    return (dto ?? []).map(mapReviewLogEntry);
  },

  /**
   * `GET /networks/:id/graph` — US51. Coordinates are precomputed server-side
   * and used verbatim: PRD 10.8 requires the PDF and the screen to render
   * identically, so the layout is never recomputed in the browser.
   */
  async graph(id: string): Promise<NetworkGraph> {
    const dto = await apiClient.call<NetworkGraphDto>(ENDPOINTS.networks.graph, {
      params: { id },
    });
    return mapNetworkGraph(dto ?? {});
  },

  /** `GET /networks/:id/timeline` — burst bins with z-scores (US53). */
  async timeline(id: string): Promise<BurstTimeline> {
    const dto = await apiClient.call<BurstTimelineDto>(
      ENDPOINTS.networks.timeline,
      { params: { id } },
    );
    return mapBurstTimeline(dto ?? {});
  },

  /**
   * `GET /networks/:id/content` — US54. Rendered from the evidence snapshot and
   * never re-fetched, which is why a post deleted since capture still appears,
   * marked no longer publicly available.
   */
  async content(id: string): Promise<RepresentativeContent> {
    const dto = await apiClient.call<RepresentativeContentDto>(
      ENDPOINTS.networks.content,
      { params: { id } },
    );
    return mapRepresentativeContent(dto ?? {});
  },

  /** `GET /networks/:id/accounts` — the US55 annex, sortable and paginated. */
  async accounts(
    id: string,
    params: AccountAnnexParams = {},
  ): Promise<Paginated<AccountAnnexRow>> {
    const { data, meta } = await apiClient.callWithMeta<AccountAnnexRowDto[]>(
      ENDPOINTS.networks.accounts,
      {
        params: { id },
        query: {
          role: params.role,
          q: params.q,
          sort: params.sort,
          page: params.page,
          limit: params.limit,
        },
      },
    );
    const items = (data ?? []).map(mapAccountAnnexRow);
    return { items, meta: mapMeta(meta, items.length) };
  },

  /**
   * `GET /networks/:id/accounts/:accountId` — the drawer behind US55's rule
   * that no account may appear in a network without a viewable reason.
   */
  async account(id: string, accountId: string): Promise<AccountDrawer> {
    const dto = await apiClient.call<AccountDrawerDto>(ENDPOINTS.networks.account, {
      params: { id, accountId },
    });
    return mapAccountDrawer(dto ?? {});
  },

  /**
   * `GET /networks/:id/accounts.csv` — US57. The export is written to the audit
   * log *before* the bytes are sent, so this is a recorded action, not a read.
   */
  async accountsCsv(id: string): Promise<{ blob: Blob; fileName: string | null }> {
    return apiClient.download(ENDPOINTS.networks.accountsCsv, { params: { id } });
  },

  /**
   * `POST /networks/:id/reports` — the 10-section PDF (US58, US59).
   *
   * The gate is a fail-closed allowlist: only `under_review`, `confirmed` and
   * `action_taken` may be exported. An unreviewed export is an unreviewed
   * accusation. `NetworkDetail.export` reports the same condition up front, so
   * the UI disables the action for the server's reason rather than guessing.
   */
  async generateReport(
    id: string,
    payload: GenerateReportPayload,
  ): Promise<ReportView> {
    const dto = await apiClient.call<ReportViewDto>(
      ENDPOINTS.networks.generateReport,
      {
        params: { id },
        body: {
          report_type: payload.reportType,
          include_graph: payload.includeGraph,
          include_content_clusters: payload.includeContentClusters,
          include_account_annex: payload.includeAccountAnnex,
          include_methodology: payload.includeMethodology,
          redact_analyst_names: payload.redactAnalystNames,
        },
      },
    );
    return mapReport(dto);
  },

  /**
   * `POST /networks/:id/evidence-bundle` — the US60 ZIP: PDF, network.json,
   * accounts.csv, posts.csv and a manifest whose hashes establish that the
   * bundle was not modified after generation. Same gate, same ordering.
   */
  async evidenceBundle(id: string): Promise<ReportView> {
    const dto = await apiClient.call<ReportViewDto>(
      ENDPOINTS.networks.evidenceBundle,
      { params: { id } },
    );
    return mapReport(dto);
  },

  /** `GET /networks/:id/reports` — every artefact, newest first, never overwritten. */
  async reports(id: string): Promise<ReportView[]> {
    const dto = await apiClient.call<ReportViewDto[]>(ENDPOINTS.networks.reports, {
      params: { id },
    });
    return (dto ?? []).map(mapReport);
  },

  /**
   * `POST /networks/:id/allowlist` — US56 at network level.
   *
   * Allowlisting is retroactive: it suppresses and relabels the accounts'
   * historical networks. The result names which were affected and which of
   * those were already exported — a PDF citing an account since allowlisted is
   * already in someone's inbox and cannot be recalled.
   */
  async allowlistNetwork(
    id: string,
    payload: AllowlistPayload,
  ): Promise<AllowlistActionResult> {
    const dto = await apiClient.call<AllowlistActionResultDto>(
      ENDPOINTS.networks.allowlistNetwork,
      { params: { id }, body: { category: payload.category, reason: payload.reason } },
    );
    return mapAllowlistResult(dto ?? {});
  },

  /** `POST /networks/:id/accounts/:accountId/allowlist` — US56, one member. */
  async allowlistAccount(
    id: string,
    accountId: string,
    payload: AllowlistPayload,
  ): Promise<AllowlistActionResult> {
    const dto = await apiClient.call<AllowlistActionResultDto>(
      ENDPOINTS.networks.allowlistAccount,
      {
        params: { id, accountId },
        body: { category: payload.category, reason: payload.reason },
      },
    );
    return mapAllowlistResult(dto ?? {});
  },
};

/**
 * A report's download URL, addressed by report id rather than nested under a
 * network — a report outlives the page it was generated from, and an audit
 * entry links to it directly.
 */
export function reportFileUrl(reportId: string): string {
  return (
    config.apiBaseUrl +
    config.apiPrefix +
    buildPath(ENDPOINTS.reports.file.path, { reportId })
  );
}

/** Status filter values as the list endpoint expects them. */
export function networkStatusQuery(
  status: NetworkStatusFilter,
): string | undefined {
  return status === "all" ? undefined : status;
}
