import type { GenericClaim, SyntheticClaim } from "./claim";

/** PRD §7 US41 — derived automatically from the rolled-out date. */
export type PolicyStatus = "rolled_out" | "not_rolled_out";

/** Background AI-matchmaking job state (PRD §7 US42, §5.5). */
export type PolicyProcessingState = "processing" | "ready";

export interface Policy {
  id: string;
  name: string;
  /** Uploaded source file (PDF/Word). */
  fileName: string;
  fileUrl: string;
  /** Date the policy is/was rolled out (drives status — PRD US41). */
  rolledOutDate: string;
  status: PolicyStatus;
  createdAt: string;
  processing: PolicyProcessingState;
  /** Latest created date among linked claims — drives F2 list sort (PRD US35). */
  lastClaimActivityAt: string | null;
  linkedGenericCount: number;
  linkedSyntheticCount: number;
}

/** Full detail payload for a policy (PRD US39). */
export interface PolicyDetail extends Policy {
  genericClaims: GenericClaim[];
  syntheticClaims: SyntheticClaim[];
}

export interface CreatePolicyPayload {
  name: string;
  rolledOutDate: string;
  fileName: string;
}

export interface PolicyListParams {
  years?: number[];
  search?: string;
  limit?: number;
}
