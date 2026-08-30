import type {
  CreatePolicyPayload,
  Policy,
  PolicyDetail,
  PolicyListParams,
  PolicyProcessingState,
} from "@/types/policy";
import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export interface PolicyListResponse {
  items: Policy[];
  total: number;
}

export const policiesApi = {
  list(params?: PolicyListParams): Promise<PolicyListResponse> {
    return apiClient.call<PolicyListResponse>(ENDPOINTS.policies.list, {
      query: {
        years: params?.years,
        search: params?.search,
        limit: params?.limit,
      },
    });
  },

  get(id: string): Promise<PolicyDetail> {
    return apiClient.call<PolicyDetail>(ENDPOINTS.policies.get, {
      params: { id },
    });
  },

  create(payload: CreatePolicyPayload): Promise<Policy> {
    return apiClient.call<Policy>(ENDPOINTS.policies.create, { body: payload });
  },

  matchmakingStatus(id: string): Promise<{ processing: PolicyProcessingState }> {
    return apiClient.call(ENDPOINTS.policies.matchmakingStatus, {
      params: { id },
    });
  },
};
