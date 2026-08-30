import type { WatchlistItem } from "@/types/alert";
import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export const alertsApi = {
  listWatchlist(): Promise<WatchlistItem[]> {
    return apiClient.call<WatchlistItem[]>(ENDPOINTS.alerts.listWatchlist, {});
  },

  addToWatchlist(claimId: string): Promise<{ claimId: string; onWatchlist: boolean }> {
    return apiClient.call(ENDPOINTS.alerts.addToWatchlist, {
      body: { claimId },
    });
  },

  removeFromWatchlist(claimId: string): Promise<{ claimId: string; onWatchlist: boolean }> {
    return apiClient.call(ENDPOINTS.alerts.removeFromWatchlist, {
      params: { claimId },
    });
  },
};
