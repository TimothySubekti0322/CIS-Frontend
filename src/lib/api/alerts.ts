import type {
  AlertChart,
  AlertChartParams,
  AlertNotifications,
  AlertSubscription,
  WatchlistItem,
  WatchlistParams,
} from "@/types/alert";
import type { Paginated } from "@/types/common";
import { apiClient } from "./client";
import type {
  AlertChartDto,
  AlertNotificationsDto,
  AlertSubscriptionDto,
  WatchlistItemDto,
} from "./dto";
import { ENDPOINTS } from "./endpoints";
import {
  mapAlertChart,
  mapAlertNotifications,
  mapAlertSubscription,
  mapMeta,
  mapWatchlistItem,
} from "./mappers";

export const alertsApi = {
  /**
   * `GET /alerts` — the watchlist table, most recently appended first.
   * `threshold_status` is derived at read time against the global admin
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
   * `POST /alerts` — called after the bell-icon confirmation on a claim or
   * policy card.
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

  /**
   * `GET /alerts/notifications` — the sidebar notification badge.
   * `unacknowledgedCount` is the number; `crossings` names the claims behind
   * it so the badge can expand into something readable.
   */
  async notifications(): Promise<AlertNotifications> {
    const dto = await apiClient.call<AlertNotificationsDto>(
      ENDPOINTS.alerts.notifications,
    );
    return mapAlertNotifications(dto);
  },

  /**
   * `POST /alerts/notifications/acknowledge` — opening the alert watchlist is
   * the acknowledgment, so this runs on entering the page, **after** the
   * rows have rendered: acknowledging is what makes the next render
   * unhighlighted, and calling it first would clear the highlights the user
   * was just shown. Acknowledgment is per user — one operator clearing their
   * badge must not clear a colleague's.
   */
  async acknowledge(): Promise<AlertNotifications> {
    const dto = await apiClient.call<AlertNotificationsDto>(
      ENDPOINTS.alerts.acknowledge,
    );
    return mapAlertNotifications(dto);
  },
};
