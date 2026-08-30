"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminSettings } from "@/types/alert";
import { adminApi } from "@/lib/api/admin";
import { queryKeys } from "@/lib/query/keys";

export function useAdminSettings() {
  return useQuery({
    queryKey: queryKeys.admin.settings,
    queryFn: () => adminApi.getSettings(),
  });
}

export function useUpdateAdminSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: AdminSettings) => adminApi.updateSettings(settings),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.admin.settings, data);
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}
