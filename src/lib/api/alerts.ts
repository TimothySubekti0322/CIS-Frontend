import type {
  AlertChart,
  AlertChartParams,
  AlertSubscription,
  WatchlistItem,
  WatchlistParams,
} from "@/types/alert";
import type { Paginated } from "@/types/common";
import { apiClient } from "./client";
import type { AlertChartDto, AlertSubscriptionDto, WatchlistItemDto } from "./dto";
import { ENDPOINTS } from "./endpoints";
import { mapAlertChart, mapAlertSubscription, mapMeta, mapWatchlistItem } from "./mappers";

export const alertsApi = {
  /**
   * `GET /alerts` — the watchlist table, most recently appended first.
   * `threshold_status` is derived at read time against the F4 global
   * threshold, so changing that threshold flips rows with no recomputation.
   */
  async list(params: WatchlistParams = {}): Promise<Paginated<WatchlistItem>> {
    const { data, meta } = await apiClient.callWithMeta<WatchlistItemDto[]>(
      ENDPOINTS.alerts.list,
      { query: { q: params.q, page: params.page, limit: params.limit } },
    );
    const items = (data ?? []).map(mapWatchlistItem);
    return { items, meta: mapMeta(meta, items.length) };
  },

  /**
   * `POST /alerts` — called after the bell-icon confirmation on an F1/F2 card.
   *
   * Adding an already-watched claim is not an error: it returns 201 with the
   * existing `added_at`, so a double-click leaves the bell filled.
   * Only Existing claims can be watched — a Synthetic claim is rejected 422.
   */
  async add(claimId: string): Promise<AlertSubscription> {
    const dto = await apiClient.call<AlertSubscriptionDto>(ENDPOINTS.alerts.add, {
      body: { claim_id: claimId },
    });
    return mapAlertSubscription(dto ?? {}, claimId);
  },

  /**
   * `DELETE /alerts/:claimId` — also clears the row's chart checkbox, so a
   * removal unticks the claim from the chart and legend in one step.
   */
  async remove(claimId: string): Promise<void> {
    await apiClient.call<unknown>(ENDPOINTS.alerts.remove, {
      params: { claimId },
    });
  },

  /** `PATCH /alerts/:claimId/chart` — the table's "Chart" checkbox. */
  async setChartVisible(claimId: string, visible: boolean): Promise<void> {
    await apiClient.call<unknown>(ENDPOINTS.alerts.setChartVisible, {
      params: { claimId },
      body: { visible },
    });
  },

  /**
   * `GET /alerts/chart` — chart + legend data for the ticked claims only.
   * With none ticked, `series` is `[]`: the documented empty state, not an error.
   */
  async chart(params: AlertChartParams = {}): Promise<AlertChart> {
    const dto = await apiClient.call<AlertChartDto>(ENDPOINTS.alerts.chart, {
      query: {
        granularity: params.granularity,
        from: params.from,
        to: params.to,
      },
    });
    return mapAlertChart(dto ?? {});
  },
};
