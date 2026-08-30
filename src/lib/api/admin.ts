import type { AdminSettings } from "@/types/alert";
import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export const adminApi = {
  getSettings(): Promise<AdminSettings> {
    return apiClient.call<AdminSettings>(ENDPOINTS.admin.getSettings, {});
  },

  updateSettings(settings: AdminSettings): Promise<AdminSettings> {
    return apiClient.call<AdminSettings>(ENDPOINTS.admin.updateSettings, {
      body: settings,
    });
  },
};
