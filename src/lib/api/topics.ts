import type { Topic } from "@/types/common";
import { apiClient } from "./client";
import type { TopicDto } from "./dto";
import { ENDPOINTS } from "./endpoints";
import { mapTopic } from "./mappers";

/**
 * Topics power the filter chips shared by the claim repository's two
 * sections. They are owned
 * and written by the AI service — including new ones it creates during policy
 * matchmaking — so this backend exposes reads only: no create/update/delete.
 */
export const topicsApi = {
  /** `GET /topics` — every topic, alphabetical, with per-type claim counts. */
  async list(): Promise<Topic[]> {
    const dto = await apiClient.call<TopicDto[]>(ENDPOINTS.topics.list);
    return (dto ?? []).map(mapTopic);
  },

  /** `GET /topics/:id` — 400 on a malformed UUID, 404 when unknown. */
  async get(id: string): Promise<Topic> {
    const dto = await apiClient.call<TopicDto>(ENDPOINTS.topics.get, {
      params: { id },
    });
    return mapTopic(dto);
  },
};
