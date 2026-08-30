import type {
  ClaimListParams,
  ClaimStatus,
  GenericClaim,
  GenericClaimDetail,
  SyntheticClaim,
  SyntheticClaimDetail,
} from "@/types/claim";
import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";

export interface GenericListResponse {
  items: GenericClaim[];
  total: number;
  lastFetchedAt: string;
}

export interface SyntheticListResponse {
  items: SyntheticClaim[];
  total: number;
}

function listQuery(params: ClaimListParams = {}) {
  return {
    topicIds: params.topicIds,
    status: params.status,
    search: params.search,
    limit: params.limit,
  };
}

export const claimsApi = {
  listGeneric(params?: ClaimListParams): Promise<GenericListResponse> {
    return apiClient.call<GenericListResponse>(ENDPOINTS.claims.listGeneric, {
      query: listQuery(params),
    });
  },

  listSynthetic(params?: ClaimListParams): Promise<SyntheticListResponse> {
    return apiClient.call<SyntheticListResponse>(ENDPOINTS.claims.listSynthetic, {
      query: listQuery(params),
    });
  },

  getGeneric(id: string): Promise<GenericClaimDetail> {
    return apiClient.call<GenericClaimDetail>(ENDPOINTS.claims.getGeneric, {
      params: { id },
    });
  },

  getSynthetic(id: string): Promise<SyntheticClaimDetail> {
    return apiClient.call<SyntheticClaimDetail>(ENDPOINTS.claims.getSynthetic, {
      params: { id },
    });
  },

  updateStatus(id: string, status: ClaimStatus): Promise<{ id: string; status: ClaimStatus }> {
    return apiClient.call(ENDPOINTS.claims.updateStatus, {
      params: { id },
      body: { status },
    });
  },

  generateGeneric(): Promise<GenericClaim> {
    return apiClient.call<GenericClaim>(ENDPOINTS.claims.generateGeneric, {});
  },
};
