import type { Paginated } from "@/types/common";
import type {
  CreatePolicyPayload,
  Policy,
  PolicyDetail,
  PolicyListParams,
  PolicyProcessing,
  ReplacePolicyFilePayload,
  UpdatePolicyPayload,
} from "@/types/policy";
import { apiClient } from "./client";
import type {
  PolicyDetailDto,
  PolicyDto,
  PolicyProcessingDto,
  PolicyYearsDto,
} from "./dto";
import { ENDPOINTS } from "./endpoints";
import { mapMeta, mapPolicy, mapPolicyDetail, mapPolicyProcessing } from "./mappers";

export const policiesApi = {
  /**
   * `GET /policies` — ordered by the newest `created_at` among any linked
   * claim, not the policy's own date; policies with no linked claims fall back
   * to their own date and sort last. The ordering is the server's, so never
   * re-sort the returned page client-side.
   */
  async list(params: PolicyListParams = {}): Promise<Paginated<Policy>> {
    const { data, meta } = await apiClient.callWithMeta<PolicyDto[]>(
      ENDPOINTS.policies.list,
      {
        query: {
          years: params.years,
          q: params.q,
          status: params.status,
          page: params.page,
          limit: params.limit,
        },
      },
    );
    const items = (data ?? []).map(mapPolicy);
    return { items, meta: mapMeta(meta, items.length) };
  },

  /** `GET /policies/years` — distinct rolled-out years, descending. */
  async years(): Promise<number[]> {
    const dto = await apiClient.call<PolicyYearsDto>(ENDPOINTS.policies.years);
    return dto?.years ?? [];
  },

  /**
   * `POST /policies` — the "Add Public Policy" modal. multipart/form-data.
   *
   * `status` is derived server-side from `rolled_out_date` and is never sent
   * by the caller. Returns immediately with `processing_status: "pending"`;
   * matchmaking runs in the background and reports back via the AI callback.
   */
  async create(payload: CreatePolicyPayload): Promise<Policy> {
    const form = new FormData();
    form.append("file", payload.file);
    form.append("name", payload.name);
    form.append("rolled_out_date", payload.rolledOutDate);
    if (payload.description) form.append("description", payload.description);

    const dto = await apiClient.call<PolicyDto>(ENDPOINTS.policies.create, {
      form,
    });
    return mapPolicy(dto);
  },

  /**
   * `GET /policies/:id` — detail plus the two correlated claim lists, in the
   * same claim-card shape as the claim repository. Both lists are empty while
   * `aiPolicyId` is null: correlations do not exist until matchmaking reports
   * back.
   */
  async get(id: string): Promise<PolicyDetail> {
    const dto = await apiClient.call<PolicyDetailDto>(ENDPOINTS.policies.get, {
      params: { id },
    });
    return mapPolicyDetail(dto);
  },

  /**
   * `GET /policies/:id/processing` — the lightweight polling payload behind
   * the "Processing" badge. Poll every 3–5s while `isProcessing` is true.
   */
  async processing(id: string): Promise<PolicyProcessing> {
    const dto = await apiClient.call<PolicyProcessingDto>(
      ENDPOINTS.policies.processing,
      { params: { id } },
    );
    return mapPolicyProcessing(dto, id);
  },

  /**
   * `POST /policies/:id/rematch` — re-queues matchmaking and resets the
   * attempt counter. 409 if already running, 503 with no AI service configured.
   */
  async rematch(id: string): Promise<PolicyProcessing> {
    const dto = await apiClient.call<PolicyProcessingDto>(
      ENDPOINTS.policies.rematch,
      { params: { id } },
    );
    return mapPolicyProcessing(dto ?? {}, id);
  },

  /**
   * `PATCH /policies/:id` — all fields optional, at least one required
   * (400 BAD_REQUEST otherwise). Changing `rolledOutDate` re-derives `status`.
   */
  async update(id: string, payload: UpdatePolicyPayload): Promise<Policy> {
    const body: Record<string, string> = {};
    if (payload.name !== undefined) body.name = payload.name;
    if (payload.rolledOutDate !== undefined) {
      body.rolled_out_date = payload.rolledOutDate;
    }
    if (payload.description !== undefined) body.description = payload.description;

    const dto = await apiClient.call<PolicyDto>(ENDPOINTS.policies.update, {
      params: { id },
      body,
    });
    return mapPolicy(dto);
  },

  /**
   * `PUT /policies/:id/file` — swaps the document in place.
   *
   * The policy id, its `aiPolicyId` and every existing claim correlation are
   * preserved, unlike DELETE + re-create which loses all three. When an AI
   * service is configured this also resets `processingStatus` to `pending` and
   * re-queues matchmaking against the new document; existing correlations stay
   * until that job reports back. 409 if matchmaking is already running.
   */
  async replaceFile(
    id: string,
    payload: ReplacePolicyFilePayload,
  ): Promise<Policy> {
    const form = new FormData();
    form.append("file", payload.file);
    const dto = await apiClient.call<PolicyDto>(ENDPOINTS.policies.replaceFile, {
      params: { id },
      form,
    });
    return mapPolicy(dto);
  },

  /**
   * `DELETE /policies/:id` — removes the record and its stored document.
   * Claims the AI service linked to this policy are NOT deleted; they live in
   * AI-owned tables this backend never writes.
   */
  async remove(id: string): Promise<void> {
    await apiClient.call<unknown>(ENDPOINTS.policies.remove, { params: { id } });
  },

  /**
   * `GET /policies/:id/file` — the document itself.
   *
   * The route needs the Bearer header, so a plain `<a href>` cannot fetch it:
   * pull the bytes here (following the 307 to a signed URL when the storage
   * driver provides one) and hand the browser an object URL.
   */
  async download(id: string, fallbackName?: string | null): Promise<void> {
    const { blob, fileName } = await apiClient.download(ENDPOINTS.policies.file, {
      params: { id },
    });
    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName ?? fallbackName ?? "policy";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      // Revoke on the next tick so the click has taken the URL.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  },
};
