import type { ScoreBreakdown } from "@/types/claim";
import { clamp, round1 } from "./utils";

/**
 * Claim Scoring System reference implementation — PRD §6.
 * Kept here so mock data and any client-side display stay consistent with the spec.
 */

/** §6.3 — Composite Claim Score weights. */
export const CLAIM_SCORE_WEIGHTS = { r: 0.15, v: 0.15, f: 0.3, h: 0.3, ei: 0.1 };

/** §6.4.4 — dampening cap γ (gamma). */
export const NPR_GAMMA = 0.5;

/** §6.3 — ClaimScore = 0.15R + 0.15V + 0.30F + 0.30H + 0.10EI, bounded [0,100]. */
export function computeClaimScore(
  p: Pick<ScoreBreakdown, "r" | "v" | "f" | "h" | "ei">,
): number {
  const raw =
    CLAIM_SCORE_WEIGHTS.r * p.r +
    CLAIM_SCORE_WEIGHTS.v * p.v +
    CLAIM_SCORE_WEIGHTS.f * p.f +
    CLAIM_SCORE_WEIGHTS.h * p.h +
    CLAIM_SCORE_WEIGHTS.ei * p.ei;
  return round1(clamp(raw, 0, 100));
}

/** §6.4.4 — DiscountFactor = 1 − (γ × NPR), bounded [0.5, 1]. */
export function computeDiscountFactor(npr: number, dormant = false): number {
  if (dormant) return 1; // §6.4.7 — dormant claims are not discounted
  return round1(clamp(1 - NPR_GAMMA * npr, 0.5, 1) * 100) / 100;
}

/** §6.4.4 — FinalClaimScore = ClaimScore × DiscountFactor, bounded [0,100]. */
export function computeFinalClaimScore(
  claimScore: number,
  discountFactor: number,
): number {
  return round1(clamp(claimScore * discountFactor, 0, 100));
}

/** Build a fully consistent ScoreBreakdown from the five primary parameters. */
export function buildScoreBreakdown(input: {
  r: number;
  v: number;
  f: number;
  h: number;
  ei: number;
  eiOpposing: number;
  npr: number;
  dormant?: boolean;
}): ScoreBreakdown {
  const dormant = input.dormant ?? false;
  const claimScore = computeClaimScore(input);
  const discountFactor = computeDiscountFactor(input.npr, dormant);
  const finalClaimScore = computeFinalClaimScore(claimScore, discountFactor);
  return {
    r: round1(input.r),
    v: round1(input.v),
    f: round1(input.f),
    h: round1(input.h),
    ei: round1(input.ei),
    eiOpposing: round1(input.eiOpposing),
    npr: Math.round(input.npr * 100) / 100,
    claimScore,
    discountFactor,
    finalClaimScore,
    dormant,
  };
}

export type ScoreBand = "high" | "medium" | "low";

/** PRD §5.6 — Gold is reserved for genuinely high-severity scores only. */
export function scoreBand(score: number): ScoreBand {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/** Tailwind classes for a score badge, by band. */
export function scoreBadgeClasses(score: number): string {
  switch (scoreBand(score)) {
    case "high":
      return "bg-gold text-regal-navy";
    case "medium":
      return "bg-frosted-blue-soft text-regal-navy";
    case "low":
      return "bg-glaucous-soft text-regal-navy";
  }
}
