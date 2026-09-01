import type {
  ClaimDetailDto,
  PolicyDetailDto,
  ScoreBreakdownDto,
  SettingDto,
  StatementDto,
  TopAccountDto,
  TopicDto,
} from "../dto";
import {
  CLAIM_SCORE_WEIGHTS,
  HARM_WEIGHTS,
  computeClaimScore,
  computeDiscountFactor,
  computeFinalClaimScore,
  computeHarm,
} from "@/lib/scoring";

/**
 * Deterministic seed dataset for mock mode.
 *
 * Everything here is shaped exactly like the backend's wire format (snake_case
 * DTOs inside the standard envelope), so mock mode exercises the same unwrap
 * and mapping code paths as live mode. If a screen renders in mock, the
 * mapping it relies on is real.
 */

const DAY = 86_400_000;
export const MOCK_NOW = Date.parse("2026-08-30T09:00:00Z");

/** Matches the backend's fresh-database default (US32). */
export const DEFAULT_THRESHOLD = 70;
const daysAgo = (n: number) => new Date(MOCK_NOW - n * DAY).toISOString();

/* ------------------------------- topics ------------------------------- */

const TOPIC_SEED: { id: string; name: string; description: string }[] = [
  { id: "a0000000-0000-0000-0000-000000000001", name: "Congestion & Road Pricing", description: "Road pricing policy" },
  { id: "a0000000-0000-0000-0000-000000000002", name: "Rezoning & Housing Density", description: "Land use and density" },
  { id: "a0000000-0000-0000-0000-000000000003", name: "Emissions & Air Quality Rules", description: "Emissions standards" },
  { id: "a0000000-0000-0000-0000-000000000004", name: "Flooding & Drainage", description: "Flooding and drainage" },
  { id: "a0000000-0000-0000-0000-000000000005", name: "Extreme Heat", description: "Heat resilience" },
  { id: "a0000000-0000-0000-0000-000000000006", name: "Wildfire", description: "Wildfire risk and zoning" },
  { id: "a0000000-0000-0000-0000-000000000007", name: "Public Transit Investment", description: "Transit funding" },
];

function topicRef(i: number) {
  const t = TOPIC_SEED[i % TOPIC_SEED.length];
  return { id: t.id, name: t.name };
}

/* ----------------------------- score builder ---------------------------- */

interface ScoreSeed {
  reach: number;
  velocity: number;
  falseness: number;
  emotionalIntensity: number;
  emotionalIntensityOpposing: number;
  harmParts: {
    publicSafety: number;
    institutionalTrust: number;
    economic: number;
    policyDisruption: number;
  };
  npr: number;
  dormant?: boolean;
}

/**
 * Builds an internally consistent `score_breakdown`: harm rolls up from its
 * four sub-scores, claim_score from the five weighted components, and
 * final = claim_score x discount. A dormant claim carries `npr` and
 * `discount_factor` as `null` with an explanatory `note`.
 */
function buildScore(seed: ScoreSeed): ScoreBreakdownDto {
  const harm = computeHarm(seed.harmParts);
  const claimScore = computeClaimScore({
    reach: seed.reach,
    velocity: seed.velocity,
    falseness: seed.falseness,
    harm,
    emotionalIntensity: seed.emotionalIntensity,
  });
  const dormant = seed.dormant ?? false;
  const discountFactor = dormant ? null : computeDiscountFactor(seed.npr);
  return {
    reach: seed.reach,
    velocity: seed.velocity,
    falseness: seed.falseness,
    harm,
    emotional_intensity: seed.emotionalIntensity,
    emotional_intensity_opposing: seed.emotionalIntensityOpposing,
    harm_breakdown: {
      public_safety: seed.harmParts.publicSafety,
      institutional_trust: seed.harmParts.institutionalTrust,
      economic: seed.harmParts.economic,
      policy_disruption: seed.harmParts.policyDisruption,
      human_confirmed: false,
      weights: {
        public_safety: HARM_WEIGHTS.publicSafety,
        institutional_trust: HARM_WEIGHTS.institutionalTrust,
        economic: HARM_WEIGHTS.economic,
        policy_disruption: HARM_WEIGHTS.policyDisruption,
      },
    },
    claim_score: claimScore,
    npr: dormant ? null : Math.round(seed.npr * 100) / 100,
    discount_factor: discountFactor,
    final_claim_score: dormant
      ? claimScore
      : computeFinalClaimScore(claimScore, discountFactor ?? 1),
    is_dormant: dormant,
    weights: {
      reach: CLAIM_SCORE_WEIGHTS.reach,
      velocity: CLAIM_SCORE_WEIGHTS.velocity,
      falseness: CLAIM_SCORE_WEIGHTS.falseness,
      harm: CLAIM_SCORE_WEIGHTS.harm,
      emotional_intensity: CLAIM_SCORE_WEIGHTS.emotionalIntensity,
    },
    note: dormant
      ? "No supporting or opposing volume — the claim is flagged as dormant and its score is not discounted."
      : null,
    formula: formulaSentence(dormant),
  };
}

/**
 * US23's tooltip sentence (v1.5).
 *
 * Generated from the same weight constants the score is computed from, for
 * the reason the backend generates it rather than letting the frontend write
 * it: the explanation and the arithmetic have exactly one source, so they
 * cannot drift apart.
 */
function formulaSentence(dormant: boolean): string {
  const w = CLAIM_SCORE_WEIGHTS;
  const parts = [
    `Reach ×${w.reach}`,
    `Velocity ×${w.velocity}`,
    `Falseness Confidence ×${w.falseness}`,
    `Harm Severity ×${w.harm}`,
    `Emotional Intensity ×${w.emotionalIntensity}`,
  ].join(", ");
  const base = `ClaimScore is the weighted sum of five parameters (${parts}), each on 0–100.`;
  return dormant
    ? `${base} This claim is dormant — it has no supporting or opposing volume in the window — so the pushback discount is not applied and FinalClaimScore equals ClaimScore.`
    : `${base} FinalClaimScore then discounts it by the Net Pushback Ratio, which lowers the score of a claim the public is already visibly pushing back on.`;
}

/* ---------------------------- statements/accounts ----------------------- */

const NEGATIVE_SAMPLES = [
  "This policy is just a stealth tax on working families — nothing to do with the climate.",
  "They never consulted residents. This will kill small businesses in the zone.",
  "The 'science' behind this was written by the same consultants who profit from it.",
  "Emergency vehicles will be stuck in the new restrictions. People will die.",
  "Watch the fees creep up every year once they've got the cameras installed.",
];

const POSITIVE_SAMPLES = [
  "Cities that did this saw measurable drops in roadside pollution within a year.",
  "The exemption list actually covers most of the cases people are worried about.",
  "Revenue is ring-fenced for bus and cycle upgrades — that's in the published plan.",
  "Air quality monitors near schools are the real story here.",
  "Independent review board signed off on the modelling last month.",
];

const NEUTRAL_SAMPLES = [
  "Does anyone have the actual text of the regulation? Link please.",
  "Council meeting on this is Thursday if anyone wants to attend.",
];

const NEGATIVE_AUTHORS = ["@urbanwatch", "@citizenvoice", "@realtalk_jkt", "@commute_daily", "@driver_jkt"];
const POSITIVE_AUTHORS = ["@cleanair_now", "@transit_forward", "@greencity", "@policywonk", "@data_driven"];

function makeStatements(claimId: string, positive: number, negative: number): StatementDto[] {
  const out: StatementDto[] = [];
  for (let i = 0; i < negative; i++) {
    out.push({
      id: `${claimId}-n${i}`,
      content: NEGATIVE_SAMPLES[i % NEGATIVE_SAMPLES.length],
      stance: "negative",
      author_id: NEGATIVE_AUTHORS[i % NEGATIVE_AUTHORS.length],
      posted_at: daysAgo(2 + i),
      impressions: 4200 - i * 130,
      source_url: null,
    });
  }
  for (let i = 0; i < positive; i++) {
    out.push({
      id: `${claimId}-p${i}`,
      content: POSITIVE_SAMPLES[i % POSITIVE_SAMPLES.length],
      stance: "positive",
      author_id: POSITIVE_AUTHORS[i % POSITIVE_AUTHORS.length],
      posted_at: daysAgo(1 + i),
      impressions: 2600 - i * 90,
      source_url: null,
    });
  }
  out.push({
    id: `${claimId}-u0`,
    content: NEUTRAL_SAMPLES[0],
    stance: "neutral",
    author_id: "@local_reader",
    posted_at: daysAgo(1),
    impressions: 310,
    source_url: null,
  });
  return out;
}

const TOP_ACCOUNT_HANDLES = [
  "@metro_truths",
  "@thedailyskeptic_id",
  "@jakarta_uncut",
  "@roadfreedom",
  "@taxpayer_union",
  "@localvoices_now",
  "@commuter_rage",
];

function makeTopAccounts(seed: number): TopAccountDto[] {
  return Array.from({ length: 5 }, (_, i) => ({
    rank: i + 1,
    author_id: TOP_ACCOUNT_HANDLES[(seed + i) % TOP_ACCOUNT_HANDLES.length],
    content_count: Math.max(1, 9 - i + (seed % 3)),
    total_impressions: Math.round(41000 / (i + 1) + ((seed * 370) % 4000)),
  }));
}

/* ------------------------------- statements ----------------------------- */

const EXISTING_STATEMENTS = [
  "The new congestion charge is a hidden tax that won't reduce emissions at all.",
  "Rezoning for density will flood the area and overwhelm the drains.",
  "Low-emission zone cameras are really mass surveillance of ordinary drivers.",
  "The flood maps were doctored to justify building on protected wetland.",
  "Heat-action cooling centres are a waste of money — the heatwave data is exaggerated.",
  "Wildfire risk zoning is a land grab to push families off their property.",
  "The transit levy money disappears into consultant fees, not buses.",
  "Emission rules will force everyone to buy an expensive new car by 2027.",
  "The congestion charge exemption list was written to protect officials' own cars.",
  "New building codes for flooding will make home insurance unaffordable.",
  "The city's air quality sensors are calibrated to always show a crisis.",
  "Density rezoning is being pushed through with no environmental review.",
  "Cooling-centre contracts went to a company linked to a council member.",
  "The wildfire evacuation plan deliberately leaves out the eastern suburbs.",
];

const NON_EXISTING_STATEMENTS = [
  "The upcoming parking reform will secretly ban all street parking downtown.",
  "The new stormwater fee is calculated from satellite photos of your roof.",
  "Planned bus-lane expansion will cut off ambulance routes to the hospital.",
  "The retrofit subsidy requires signing over your property data to a foreign firm.",
  "The heat-resilience bond is a pretext to raise property taxes citywide.",
  "New tree-canopy rules will let the city enter private gardens without notice.",
  "The EV charging mandate forces landlords to pay for chargers or face fines.",
  "Coastal setback rules will make waterfront homes legally unsellable.",
  "The congestion zone will be quietly expanded to the whole city within a year.",
  "Air-quality alerts will be used to justify mandatory work-from-home orders.",
];

/** A claim as the mock stores it: the detail DTO plus its source posts. */
export interface MockClaim extends ClaimDetailDto {
  claim_type: "existing" | "non_existing";
  created_at: string;
  statements: StatementDto[];
  /** `cis_policies.id` values this claim correlates with. */
  policy_ids: string[];
}

/** A policy as the mock stores it. Claim lists are derived, not stored. */
export interface MockPolicy extends Omit<PolicyDetailDto, "existing_claims" | "non_existing_claims"> {
  created_at: string;
  attempts: number;
  processed_at: string | null;
}

export interface WatchEntry {
  claim_id: string;
  alert_id: string;
  added_at: string;
  chart_visible: boolean;
  /**
   * v1.5 (US71). A crossing is a transition between two evaluations, not a
   * state, so the previous Over/Under status has to be stored: the score alone
   * says where a claim is now, never that it just moved.
   *
   * A claim added to the watchlist records its current status as a baseline
   * without notifying — a first sighting is not a transition.
   */
  last_threshold_status?: "over_threshold" | "under_threshold";
  crossed_at?: string | null;
  crossed_direction?: "up" | "down" | null;
}

/** The 27-city catalog US65 selects from, as the backend holds it in code. */
export interface CityRecord {
  name: string;
  province: string;
  timezone: string;
}

export const CITY_CATALOG: CityRecord[] = [
  { name: "Jakarta", province: "DKI Jakarta", timezone: "Asia/Jakarta" },
  { name: "Surabaya", province: "Jawa Timur", timezone: "Asia/Jakarta" },
  { name: "Bandung", province: "Jawa Barat", timezone: "Asia/Jakarta" },
  { name: "Medan", province: "Sumatera Utara", timezone: "Asia/Jakarta" },
  { name: "Semarang", province: "Jawa Tengah", timezone: "Asia/Jakarta" },
  { name: "Palembang", province: "Sumatera Selatan", timezone: "Asia/Jakarta" },
  { name: "Makassar", province: "Sulawesi Selatan", timezone: "Asia/Makassar" },
  { name: "Denpasar", province: "Bali", timezone: "Asia/Makassar" },
  { name: "Balikpapan", province: "Kalimantan Timur", timezone: "Asia/Makassar" },
  { name: "Samarinda", province: "Kalimantan Timur", timezone: "Asia/Makassar" },
  { name: "Manado", province: "Sulawesi Utara", timezone: "Asia/Makassar" },
  { name: "Banjarmasin", province: "Kalimantan Selatan", timezone: "Asia/Makassar" },
  { name: "Pontianak", province: "Kalimantan Barat", timezone: "Asia/Jakarta" },
  { name: "Padang", province: "Sumatera Barat", timezone: "Asia/Jakarta" },
  { name: "Pekanbaru", province: "Riau", timezone: "Asia/Jakarta" },
  { name: "Bandar Lampung", province: "Lampung", timezone: "Asia/Jakarta" },
  { name: "Malang", province: "Jawa Timur", timezone: "Asia/Jakarta" },
  { name: "Bogor", province: "Jawa Barat", timezone: "Asia/Jakarta" },
  { name: "Bekasi", province: "Jawa Barat", timezone: "Asia/Jakarta" },
  { name: "Depok", province: "Jawa Barat", timezone: "Asia/Jakarta" },
  { name: "Tangerang", province: "Banten", timezone: "Asia/Jakarta" },
  { name: "Yogyakarta", province: "DI Yogyakarta", timezone: "Asia/Jakarta" },
  { name: "Surakarta", province: "Jawa Tengah", timezone: "Asia/Jakarta" },
  { name: "Cirebon", province: "Jawa Barat", timezone: "Asia/Jakarta" },
  { name: "Ambon", province: "Maluku", timezone: "Asia/Jayapura" },
  { name: "Jayapura", province: "Papua", timezone: "Asia/Jayapura" },
  { name: "Kupang", province: "Nusa Tenggara Timur", timezone: "Asia/Makassar" },
];

export interface Snapshot {
  claim_id: string;
  captured_at: string;
  final_claim_score: number;
  claim_score: number;
}

/**
 * The AI service's content stream, as far as the Climate Sentiment Index needs
 * it: the 7-day window's sentiment split, plus each claim's own conversation
 * volume for the RiskLoad weighting.
 *
 * PRD 6.6.1 is explicit that the denominator is *all* climate-related content,
 * independent of the claim repository — so `total` is larger than the sum of
 * the per-claim volumes, and unclustered content is what makes up the
 * difference. Getting this wrong in the mock would make the index look
 * plausible while exercising the wrong arithmetic.
 */
export interface ContentVolume {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  /** Supporting + opposing volume per claim — a weight, never a score. */
  perClaim: Record<string, number>;
}

export interface Seed {
  topics: TopicDto[];
  claims: MockClaim[];
  policies: MockPolicy[];
  watchlist: WatchEntry[];
  settings: SettingDto[];
  snapshots: Snapshot[];
  aiSnapshots: Snapshot[];
  contentVolume: ContentVolume;
}

/**
 * The AI service's own score history — a row per rescore for **every** claim,
 * not just watched ones.
 *
 * This is deliberately a second store rather than more rows in `snapshots`.
 * The two answer different questions and the product depends on the
 * difference: the backend's watchlist-only snapshots drive the F3 chart and
 * the per-claim Score History Chart, so an unwatched claim must show no
 * history there. The AI service's history is what the Overview's topic
 * month-on-month reads, precisely because a MoM figure computed over the
 * watchlist would describe the team's attention rather than the topic.
 *
 * Merging them would make the mock teach the wrong rule in both directions.
 */
function buildAiSnapshots(claims: MockClaim[]): Snapshot[] {
  const out: Snapshot[] = [];
  for (const claim of claims) {
    if (claim.claim_type !== "existing" || !claim.score_breakdown) continue;
    const final = claim.score_breakdown.final_claim_score ?? 0;
    const composite = claim.score_breakdown.claim_score ?? 0;
    // Ten fortnightly points, ending at today's score — enough to populate
    // both sides of a month-on-month comparison.
    for (let i = 9; i >= 0; i--) {
      const drift = i === 0 ? 0 : Math.sin((i + final) / 3) * 6 - i * 0.9;
      const clampScore = (n: number) => Math.max(0, Math.min(100, Math.round(n * 10) / 10));
      out.push({
        claim_id: claim.id,
        captured_at: new Date(MOCK_NOW - i * 14 * DAY).toISOString(),
        final_claim_score: clampScore(final + drift),
        claim_score: clampScore(composite + drift),
      });
    }
  }
  return out;
}

/**
 * Deterministic content volumes derived from the claims themselves, so the
 * index moves when the repository does — a rescore or a Harm edit changes
 * RiskLoad, which is the behaviour the real pipeline has.
 */
export function buildContentVolume(claims: MockClaim[]): ContentVolume {
  const perClaim: Record<string, number> = {};
  let clustered = 0;

  for (const claim of claims) {
    if (claim.claim_type !== "existing") continue;
    const positive = claim.positive_statement_count ?? 0;
    const negative = claim.negative_statement_count ?? 0;
    // Statement counts are a sample of the cluster, not the cluster itself.
    const volume = (positive + negative) * 12;
    perClaim[claim.id] = volume;
    clustered += volume;
  }

  // Unclustered climate conversation — neutral chatter, general coverage, and
  // content the pipeline never grouped into a claim. Roughly 45% of the whole.
  const total = Math.round(clustered / 0.55);
  const neutral = total - clustered;
  // Opposing content outweighs supporting on flagged claims, but the wider
  // conversation is not as negative as the claim repository alone suggests.
  const negative = Math.round(clustered * 0.62);
  const positive = clustered - negative;

  return { total, positive, negative, neutral, perClaim };
}

export function buildSeed(): Seed {
  const claims: MockClaim[] = [];

  EXISTING_STATEMENTS.forEach((statement, i) => {
    const id = `c0000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`;
    const dormant = i === 11;
    const positive = dormant ? 0 : 8 + ((i * 5) % 40);
    const negative = dormant ? 0 : 40 + ((i * 11) % 120);
    /* The spread is chosen so that roughly a third of the seeded claims land
       above the default threshold of 70. Below that, mock mode would show an
       all-clear Overview, an empty Over-Threshold column on F3 and a treemap
       whose count half is uniformly zero — and none of those paths would ever
       be exercised by anyone developing against it. */
    const score = buildScore({
      reach: dormant ? 8 : 48 + ((i * 13) % 48),
      velocity: dormant ? 4 : 38 + ((i * 29) % 58),
      falseness: 60 + ((i * 7) % 40),
      emotionalIntensity: 42 + ((i * 23) % 50),
      emotionalIntensityOpposing: 20 + ((i * 19) % 50),
      harmParts: {
        publicSafety: 55 + ((i * 17) % 45),
        institutionalTrust: 50 + ((i * 23) % 48),
        economic: 46 + ((i * 29) % 48),
        policyDisruption: 40 + ((i * 31) % 55),
      },
      npr: (i % 5) * 0.07,
      dormant,
    });
    claims.push({
      id,
      claim_type: "existing",
      claim_statement: statement,
      topic: topicRef(i),
      review_status: (["unreviewed", "active", "inactive", "action_taken"] as const)[i % 4],
      final_claim_score: score.final_claim_score,
      is_dormant: dormant,
      is_on_alert: i < 3,
      positive_statement_count: positive,
      negative_statement_count: negative,
      created_at: daysAgo(3 + i * 2),
      // Distinct from created_at: when the AI first caught it in the wild.
      first_caught_at: daysAgo(5 + i * 2),
      review: null,
      activity: {
        type: "debunk",
        content: debunkDraft(statement),
        generated_at: daysAgo(2 + i),
        available: true,
        // Every fourth claim is left unsegmented, so the single-draft
        // fallback stays reachable without touching the code.
        segments: debunkSegments(statement, i % 4 === 3 ? 0 : 1 + (i % 3)),
      },
      policies: [],
      score_breakdown: score,
      top_accounts: makeTopAccounts(i),
      statements: makeStatements(id, Math.min(positive, 6), Math.min(negative, 8)),
      policy_ids: [],
    });
  });

  NON_EXISTING_STATEMENTS.forEach((statement, i) => {
    const id = `c1000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`;
    claims.push({
      id,
      claim_type: "non_existing",
      claim_statement: statement,
      topic: topicRef(i + 2),
      review_status: (["unreviewed", "active", "inactive", "action_taken"] as const)[i % 4],
      created_at: daysAgo(i),
      review: null,
      activity: {
        type: "prebunk",
        content: prebunkDraft(statement),
        generated_at: daysAgo(i),
        available: true,
        // Synthetic claims are never segmented — their prebunk stays flat.
        segments: [],
      },
      policies: [],
      statements: [],
      policy_ids: [],
    });
  });

  const policies: MockPolicy[] = [
    mockPolicy("b0000000-0000-0000-0000-000000000001", "Central Business District Congestion Charge", 420, -30),
    mockPolicy("b0000000-0000-0000-0000-000000000002", "Inner-Ring Low-Emission Zone", 260, -14),
    mockPolicy("b0000000-0000-0000-0000-000000000003", "Transit-Oriented Density Rezoning (Phase 2)", 140, -3),
    mockPolicy("b0000000-0000-0000-0000-000000000004", "Stormwater Utility Fee", 95, 40),
    mockPolicy("b0000000-0000-0000-0000-000000000005", "Extreme-Heat Resilience Program", 60, -1),
    mockPolicy("b0000000-0000-0000-0000-000000000006", "Wildland-Urban Interface Building Code", 30, 120),
    mockPolicy("b0000000-0000-0000-0000-000000000007", "Public Transit Investment Levy", 12, 210),
  ];

  // Correlations. Existing claims are many-to-many; Non-Existing are one-to-many.
  const links: [number, number][] = [
    [0, 0], [8, 0], [2, 1], [10, 1], [1, 2], [11, 2],
    [3, 3], [9, 3], [4, 4], [12, 4], [5, 5], [13, 5], [6, 6],
  ];
  links.forEach(([claimIndex, policyIndex]) => {
    claims[claimIndex].policy_ids.push(policies[policyIndex].id);
  });

  const synLinks: [number, number][] = [
    [0, 0], [8, 0], [1, 3], [2, 6], [3, 2], [4, 4], [5, 5], [7, 5], [9, 1],
  ];
  const firstSynthetic = EXISTING_STATEMENTS.length;
  synLinks.forEach(([claimIndex, policyIndex]) => {
    claims[firstSynthetic + claimIndex].policy_ids.push(policies[policyIndex].id);
  });

  const watchlist: WatchEntry[] = claims
    .filter((c) => c.is_on_alert)
    .map((c, i) => {
      const score = c.score_breakdown?.final_claim_score ?? null;
      const status =
        score !== null && score >= DEFAULT_THRESHOLD
          ? ("over_threshold" as const)
          : ("under_threshold" as const);
      // The first row is seeded as having *just* crossed, so the US29 row
      // highlight and the US71 badge are both visible on a fresh mock. Its
      // stored previous status is the opposite of where it now sits, which is
      // exactly the shape a real transition leaves behind.
      const justCrossed = i === 0;
      return {
        claim_id: c.id,
        alert_id: `d0000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
        added_at: new Date(MOCK_NOW - (i + 1) * 3_600_000).toISOString(),
        chart_visible: i < 2,
        last_threshold_status: status,
        crossed_at: justCrossed
          ? new Date(MOCK_NOW - 30 * 60_000).toISOString()
          : null,
        crossed_direction: justCrossed
          ? status === "over_threshold"
            ? ("up" as const)
            : ("down" as const)
          : null,
      };
    });

  const snapshots: Snapshot[] = [];
  watchlist.forEach((entry, seedIndex) => {
    const claim = claims.find((c) => c.id === entry.claim_id);
    if (!claim?.score_breakdown) return;
    snapshots.push(
      ...historyFor(
        entry.claim_id,
        claim.score_breakdown.final_claim_score ?? 0,
        claim.score_breakdown.claim_score ?? 0,
        seedIndex,
      ),
    );
  });

  return {
    topics: TOPIC_SEED.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      existing_claim_count: 0,
      non_existing_claim_count: 0,
    })),
    claims,
    policies,
    watchlist,
    aiSnapshots: buildAiSnapshots(claims),
    contentVolume: buildContentVolume(claims),
    settings: [
      {
        key: "alert_threshold",
        value: "70",
        value_type: "number",
        description:
          "Global FinalClaimScore threshold (0-100) deciding Over/Under Threshold.",
        updated_at: daysAgo(9),
        updated_by: null,
      },
      {
        key: "city",
        value: CITY_CATALOG[0].name,
        value_type: "string",
        description:
          "The single Indonesian city this instance monitors (PRD US65). Scopes every figure on the Overview page.",
        updated_at: daysAgo(9),
        updated_by: null,
      },
      {
        key: "city_timezone",
        value: CITY_CATALOG[0].timezone,
        value_type: "string",
        description:
          "IANA zone, written by the city selection so detector report footers and the Overview cannot disagree.",
        updated_at: daysAgo(9),
        updated_by: null,
      },
      {
        key: "claims_last_fetched_at",
        value: new Date(MOCK_NOW).toISOString(),
        value_type: "timestamp",
        description:
          "Timestamp shown as 'last fetched' on the Existing Claim section.",
        updated_at: new Date(MOCK_NOW).toISOString(),
        updated_by: null,
      },
    ],
    snapshots,
  };
}

function mockPolicy(
  id: string,
  name: string,
  createdDaysAgo: number,
  rolledOutOffsetDays: number,
): MockPolicy {
  const rolledOutDate = daysAgo(-rolledOutOffsetDays);
  const fileName = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
  return {
    id,
    name,
    description: `Official policy document for "${name}", published by the city climate team.`,
    month_year: new Date(rolledOutDate).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    }),
    rolled_out_date: rolledOutDate,
    status: Date.parse(rolledOutDate) <= MOCK_NOW ? "rolled_out" : "not_rolled_out",
    file_name: fileName,
    download_url: `/api/v1/policies/${id}/file`,
    processing_status: "completed",
    is_processing: false,
    processing_error: null,
    linked_claim_count: 0,
    ai_policy_id: id.replace("b0000000", "e0000000"),
    created_at: daysAgo(createdDaysAgo),
    last_claim_activity_at: null,
    attempts: 1,
    processed_at: daysAgo(createdDaysAgo - 1),
  };
}

/** Eight weekly snapshots ending at the claim's current score. */
export function historyFor(
  claimId: string,
  finalScore: number,
  claimScore: number,
  seed: number,
): Snapshot[] {
  return Array.from({ length: 8 }, (_, i) => {
    const drift = i === 7 ? 0 : Math.sin((i + seed) / 2) * 9 + (i - 7) * 1.4;
    const clampScore = (n: number) => Math.max(0, Math.min(100, Math.round(n * 10) / 10));
    return {
      claim_id: claimId,
      captured_at: new Date(MOCK_NOW - (7 - i) * 7 * DAY).toISOString(),
      final_claim_score: clampScore(finalScore + drift),
      claim_score: clampScore(claimScore + drift),
    };
  });
}

/* ------------------------- generated-on-demand -------------------------- */

let generatedCount = 0;

/** The F4 "Generate Generic Claim" utility's output (US33). */
export function createGeneratedClaim(topicId?: string): MockClaim {
  generatedCount += 1;
  const i = generatedCount;
  const id = `c2000000-0000-0000-0000-${String(i).padStart(12, "0")}`;
  const statement = `${EXISTING_STATEMENTS[i % EXISTING_STATEMENTS.length]} (sample #${i})`;
  const topic =
    TOPIC_SEED.find((t) => t.id === topicId) ?? TOPIC_SEED[i % TOPIC_SEED.length];
  const positive = 6 + ((i * 5) % 30);
  const negative = 30 + ((i * 11) % 90);
  const score = buildScore({
    reach: 30 + ((i * 13) % 55),
    velocity: 40 + ((i * 29) % 55),
    falseness: 60 + ((i * 7) % 35),
    emotionalIntensity: 35 + ((i * 23) % 55),
    emotionalIntensityOpposing: 25 + ((i * 19) % 45),
    harmParts: {
      publicSafety: 50 + ((i * 17) % 45),
      institutionalTrust: 45 + ((i * 13) % 50),
      economic: 40 + ((i * 19) % 55),
      policyDisruption: 35 + ((i * 23) % 60),
    },
    npr: (i % 4) * 0.1,
  });
  return {
    id,
    claim_type: "existing",
    claim_statement: statement,
    topic: { id: topic.id, name: topic.name },
    review_status: "unreviewed",
    final_claim_score: score.final_claim_score,
    is_dormant: false,
    is_on_alert: false,
    positive_statement_count: positive,
    negative_statement_count: negative,
    created_at: new Date().toISOString(),
    first_caught_at: new Date(Date.now() - 2 * DAY).toISOString(),
    review: null,
    activity: {
      type: "debunk",
      content: debunkDraft(statement),
      generated_at: new Date().toISOString(),
      available: true,
      // PRD v1.5 §8.2 — the demo claim must exercise both v1.5 changes, so it
      // always carries at least one segment as well as its harm sub-scores.
      segments: debunkSegments(statement, 2),
    },
    policies: [],
    score_breakdown: score,
    top_accounts: makeTopAccounts(i),
    statements: makeStatements(id, Math.min(positive, 6), Math.min(negative, 8)),
    policy_ids: [],
  };
}

let matchmakingCount = 0;

/** A predicted claim the AI service generates for a newly uploaded policy. */
export function createPredictedClaim(policyId: string, policyName: string): MockClaim {
  matchmakingCount += 1;
  const i = matchmakingCount;
  const id = `c3000000-0000-0000-0000-${String(i).padStart(12, "0")}`;
  const statement = `Rules introduced under "${policyName}" will quietly be expanded citywide with no further consultation.`;
  const topic = TOPIC_SEED[i % TOPIC_SEED.length];
  return {
    id,
    claim_type: "non_existing",
    claim_statement: statement,
    topic: { id: topic.id, name: topic.name },
    review_status: "unreviewed",
    created_at: new Date().toISOString(),
    review: null,
    activity: {
      type: "prebunk",
      content: prebunkDraft(statement),
      generated_at: new Date().toISOString(),
      available: true,
      segments: [],
    },
    policies: [],
    statements: [],
    policy_ids: [policyId],
  };
}

/**
 * The audience segments US12 (v1.5) asks the AI to identify, most-exposed
 * first. Deterministic per claim so the mock is stable across reloads.
 *
 * Deliberately not generated for every claim: a deployment whose AI service
 * has not shipped segmentation returns an empty array and the page falls back
 * to the single draft, and that path has to be exercisable in mock mode too.
 */
const SEGMENT_SEEDS: { segment: string; rationale: string; angle: string }[] = [
  {
    segment: "Kampung residents in flood-prone kelurahan",
    rationale:
      "Highest exposure, and the strongest distrust signal in the supporting cluster.",
    angle:
      "Lead with the safeguard that touches their street directly, and name the drainage works already funded. Abstract reassurance reads as evasion to a household that has been flooded twice.",
  },
  {
    segment: "Commuters on the affected corridor",
    rationale:
      "Second-largest share of engagement; their concern is journey time, not safety.",
    angle:
      "Answer the travel-time question first with the published modelling, then the exemption schedule. Safety framing does not land with an audience that is not worried about safety.",
  },
  {
    segment: "Small business owners inside the zone",
    rationale:
      "Smaller volume, but the highest share of content that other accounts quote.",
    angle:
      "Open with the delivery and trade-vehicle exemptions and the rebate window. This segment amplifies whatever it reads, so what it reads should be the specific rule.",
  },
];

/** One tailored draft per segment. `count` of 0 is the unsegmented case. */
function debunkSegments(statement: string, count: number) {
  return SEGMENT_SEEDS.slice(0, count).map((seed, i) => ({
    segment: seed.segment,
    rationale: seed.rationale,
    content: [
      `**For ${seed.segment.toLowerCase()}:**`,
      "",
      seed.angle,
      "",
      `**The claim being addressed:** "${statement}"`,
      "",
      "_AI-generated draft — review before use._",
    ].join("\n"),
    generated_at: daysAgo(2 + i),
  }));
}

function debunkDraft(statement: string): string {
  return [
    `**Claim:** "${statement}"`,
    "",
    "**What's accurate:** The policy exists and is on the public record, including its published impact assessment and consultation timeline.",
    "",
    "**What's misleading:** The claim omits the exemption schedule and the ring-fenced use of any revenue, both of which are documented in the official plan.",
    "",
    "**Suggested response:** Link directly to the published policy document and the independent review. Lead with the concrete safeguard most relevant to the audience (e.g. emergency-vehicle exemptions, revenue ring-fencing), then invite questions.",
    "",
    "_AI-generated draft — review before use._",
  ].join("\n");
}

function prebunkDraft(statement: string): string {
  return [
    `**Predicted narrative:** "${statement}"`,
    "",
    "**Why it may emerge:** The policy touches a sensitive cost/enforcement question that similar narratives have exploited elsewhere.",
    "",
    "**Pre-emptive message:** State the scope limits and safeguards plainly *before* the narrative spreads. Publish an FAQ that names the fear directly and answers it with the specific rule text.",
    "",
    "**Channels:** Neighbourhood associations, local press briefing, pinned post on official channels.",
    "",
    "_AI-generated draft — review before use._",
  ].join("\n");
}
