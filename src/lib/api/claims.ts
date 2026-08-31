import type {
  ClaimDetail,
  ClaimListParams,
  ClaimPolicyRef,
  ClaimRepository,
  ClaimRepositoryParams,
  ClaimSummary,
  ScoreHistory,
  ScoreHistoryParams,
  Statement,
  StatementListParams,
  TopAccount,
  UpdateClaimStatusPayload,
} from "@/types/claim";
import type { Paginated } from "@/types/common";
import { apiClient } from "./client";
import type {
  ClaimDetailDto,
  ClaimDto,
  ClaimPolicyRefDto,
  ClaimRepositoryDto,
  ScoreHistoryDto,
  StatementDto,
  TopAccountDto,
} from "./dto";
import { ENDPOINTS } from "./endpoints";
import {
  mapClaimDetail,
  mapClaimPolicyRef,
  mapClaimRepository,
  mapClaimSummary,
  mapMeta,
  mapScoreHistory,
  mapStatement,
  mapTopAccount,
} from "./mappers";

export const claimsApi = {
  /**
   * `GET /claims/repository` — the whole F1 page in one call.
   *
   * Both sections always return regardless of the status tab: the filter
   * narrows claims *within* a section, it never hides one outright. Each
   * section caps at 10 claims with `totalInPool` behind "See all".
   *
   * `q` is a single value applied to both sections — there is no per-section
   * search parameter, so the page has one search box.
   */
  async repository(params: ClaimRepositoryParams = {}): Promise<ClaimRepository> {
    const dto = await apiClient.call<ClaimRepositoryDto>(
      ENDPOINTS.claims.repository,
      {
        query: {
          status: params.status ?? "all",
          topic_ids: params.topicIds,
          q: params.q,
        },
      },
    );
    return mapClaimRepository(dto);
  },

  /**
   * `GET /claims` — the paginated "See all" list.
   * `sort` defaults server-side: `score` for Existing, `created_at` for
   * Non-Existing, so leave it unset unless the user picked one.
   */
  async list(params: ClaimListParams = {}): Promise<Paginated<ClaimSummary>> {
    const { data, meta } = await apiClient.callWithMeta<ClaimDto[]>(
      ENDPOINTS.claims.list,
      {
        query: {
          type: params.type,
          status: params.status,
          topic_ids: params.topicIds,
          q: params.q,
          sort: params.sort,
          page: params.page,
          limit: params.limit,
        },
      },
    );
    const items = (data ?? []).map(mapClaimSummary);
    return { items, meta: mapMeta(meta, items.length) };
  },

  /**
   * `GET /claims/:id` — full detail. Existing claims carry `score_breakdown`
   * with every component; a Synthetic claim omits the score, top accounts,
   * statement counts and alert state. Viewing never triggers AI generation.
   */
  async get(id: string): Promise<ClaimDetail> {
    const dto = await apiClient.call<ClaimDetailDto>(ENDPOINTS.claims.get, {
      params: { id },
    });
    return mapClaimDetail(dto);
  },

  /** `GET /claims/:id/statements` — paginated source posts behind a claim. */
  async statements(
    id: string,
    params: StatementListParams = {},
  ): Promise<Paginated<Statement>> {
    const { data, meta } = await apiClient.callWithMeta<StatementDto[]>(
      ENDPOINTS.claims.statements,
      {
        params: { id },
        query: {
          stance: params.stance,
          page: params.page,
          limit: params.limit,
        },
      },
    );
    const items = (data ?? []).map(mapStatement);
    return { items, meta: mapMeta(meta, items.length) };
  },

  /**
   * `GET /claims/:id/top-accounts` — ranked over supporting-side content only,
   * by contributed impressions with post count as the tiebreaker.
   */
  async topAccounts(id: string, limit = 5): Promise<TopAccount[]> {
    const dto = await apiClient.call<TopAccountDto[]>(
      ENDPOINTS.claims.topAccounts,
      { params: { id }, query: { limit } },
    );
    return (dto ?? []).map(mapTopAccount);
  },

  /**
   * `GET /claims/:id/policies` — correlated policies. `source` says where the
   * record came from: `cis` (registered through F2) or `ai` (created by the
   * AI service, with no F2 upload behind it).
   */
  async policies(id: string): Promise<ClaimPolicyRef[]> {
    const dto = await apiClient.call<ClaimPolicyRefDto[]>(
      ENDPOINTS.claims.policies,
      { params: { id } },
    );
    return (dto ?? []).map(mapClaimPolicyRef);
  },

  /**
   * `GET /claims/:id/score-history` — history exists only from the moment a
   * claim joins the F3 watchlist; the snapshot job captures watched claims only.
   */
  async scoreHistory(
    id: string,
    params: ScoreHistoryParams = {},
  ): Promise<ScoreHistory> {
    const dto = await apiClient.call<ScoreHistoryDto>(
      ENDPOINTS.claims.scoreHistory,
      {
        params: { id },
        query: {
          granularity: params.granularity,
          from: params.from,
          to: params.to,
        },
      },
    );
    return mapScoreHistory(dto, id);
  },

  /**
   * `PUT /claims/:id/status` — records a reviewer's decision in
   * `cis_claim_reviews`. The AI service's own pipeline state is untouched, so
   * re-running detection can never silently overwrite a human decision.
   */
  async updateStatus(
    id: string,
    payload: UpdateClaimStatusPayload,
  ): Promise<ClaimSummary | null> {
    const dto = await apiClient.call<ClaimDto | null>(
      ENDPOINTS.claims.updateStatus,
      {
        params: { id },
        body: { status: payload.status, notes: payload.notes },
      },
    );
    return dto ? mapClaimSummary(dto) : null;
  },
};
