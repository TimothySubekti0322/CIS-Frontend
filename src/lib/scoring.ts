import { clamp, round1 } from "./utils";

/**
 * Claim Scoring System reference implementation.
 *
 * The backend computes and serves every one of these values — the UI renders
 * `score_breakdown` as received and never recalculates it. This module exists
 * to (a) seed the mock dataset consistently and (b) document the formulas
 * beside the code that displays them. The weights the backend echoes in
 * `score_breakdown.weights` always win over the defaults here.
 */

/** Composite Claim Score weights. */
export const CLAIM_SCORE_WEIGHTS = {
  reach: 0.15,
  velocity: 0.15,
  falseness: 0.3,
  harm: 0.3,
  emotionalIntensity: 0.1,
} as const;

/** Harm sub-score weights rolled into `harm`. */
export const HARM_WEIGHTS = {
  publicSafety: 0.35,
  institutionalTrust: 0.3,
  economic: 0.2,
  policyDisruption: 0.15,
} as const;

/** Dampening cap γ (gamma) applied to the Net Pushback Ratio. */
export const NPR_GAMMA = 0.5;

export interface ScoreInputs {
  reach: number;
  velocity: number;
  falseness: number;
  harm: number;
  emotionalIntensity: number;
}

/** ClaimScore = 0.15R + 0.15V + 0.30F + 0.30H + 0.10EI, bounded [0,100]. */
export function computeClaimScore(p: ScoreInputs): number {
  const raw =
    CLAIM_SCORE_WEIGHTS.reach * p.reach +
    CLAIM_SCORE_WEIGHTS.velocity * p.velocity +
    CLAIM_SCORE_WEIGHTS.falseness * p.falseness +
    CLAIM_SCORE_WEIGHTS.harm * p.harm +
    CLAIM_SCORE_WEIGHTS.emotionalIntensity * p.emotionalIntensity;
  return round1(clamp(raw, 0, 100));
}

/** Harm = 0.35 public safety + 0.30 institutional trust + 0.20 economic + 0.15 policy disruption. */
export function computeHarm(p: {
  publicSafety: number;
  institutionalTrust: number;
  economic: number;
  policyDisruption: number;
}): number {
  const raw =
    HARM_WEIGHTS.publicSafety * p.publicSafety +
    HARM_WEIGHTS.institutionalTrust * p.institutionalTrust +
    HARM_WEIGHTS.economic * p.economic +
    HARM_WEIGHTS.policyDisruption * p.policyDisruption;
  return round1(clamp(raw, 0, 100));
}

/**
 * DiscountFactor = 1 − (γ × NPR), bounded [0.5, 1].
 * A dormant claim is never discounted — its priority must not drop on
 * statistically unreliable data — so the backend sends `null` instead.
 */
export function computeDiscountFactor(npr: number): number {
  return Math.round(clamp(1 - NPR_GAMMA * npr, 0.5, 1) * 100) / 100;
}

/** FinalClaimScore = ClaimScore × DiscountFactor, bounded [0,100]. */
export function computeFinalClaimScore(
  claimScore: number,
  discountFactor: number,
): number {
  return round1(clamp(claimScore * discountFactor, 0, 100));
}

export type ScoreBand = "high" | "medium" | "low";

/** Gold is reserved for genuinely high-severity scores only. */
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

/**
 * Text colour for a score rendered as a large bare number rather than a filled
 * badge. Gold is unreadable as text on white, so the high band uses the
 * functional negative colour — the same one the signal meters already use for
 * scores at or above 70.
 */
export function scoreTextClasses(score: number): string {
  switch (scoreBand(score)) {
    case "high":
      return "text-danger";
    case "medium":
      return "text-regal-navy";
    case "low":
      return "text-regal-navy/50";
  }
}
