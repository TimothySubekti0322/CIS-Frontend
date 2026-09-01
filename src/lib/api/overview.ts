import type { Overview, OverviewParams, TopicOverview } from "@/types/overview";
import { apiClient } from "./client";
import type { OverviewDto, TopicOverviewDto } from "./dto.overview";
import { ENDPOINTS } from "./endpoints";
import { mapOverview, mapTopicOverview } from "./mappers.overview";

export const overviewApi = {
  /**
   * `GET /overview` — the whole F6 page: the O1a threshold ratio, the O1b
   * Climate Sentiment Index, the O2 treemap and the O3 leaderboard.
   *
   * A non-`ok` `sentiment.status` costs the gauge and nothing else: the other
   * three sections are computed from `claims`, not from the content stream, so
   * an unprovisioned AI column must not blank the page.
   */
  async get(params: OverviewParams = {}): Promise<Overview> {
    const dto = await apiClient.call<OverviewDto>(ENDPOINTS.overview.get, {
      query: { limit: params.limit },
    });
    return mapOverview(dto);
  },

  /**
   * `GET /overview/topics/:id` — the treemap's click-through. 404 when the
   * topic does not exist, or carries no Existing claims in the configured city.
   */
  async topic(id: string): Promise<TopicOverview> {
    const dto = await apiClient.call<TopicOverviewDto>(ENDPOINTS.overview.topic, {
      params: { id },
    });
    return mapTopicOverview(dto);
  },
};
