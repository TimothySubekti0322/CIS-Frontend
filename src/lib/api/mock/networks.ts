import type {
  AccountAnnexRowDto,
  AllowlistEntryDto,
  AuditLogEntryDto,
  BurstTimelineDto,
  CommonPhraseDto,
  DetectionRunDto,
  DetectorSettingsDto,
  DismissalDto,
  EvidencePostDto,
  GraphEdgeDto,
  GraphNodeDto,
  NetworkCardDto,
  NetworkClaimRefDto,
  NetworkReviewDto,
  NetworkReviewLogEntryDto,
  OfftopicClusterDto,
  ReportViewDto,
  RepresentativeContentDto,
  RunContextDto,
  SettingHistoryEntryDto,
  SignalDetailDto,
  WhyFlaggedDto,
} from "../dto.networks";
import { MOCK_NOW } from "./data";

/**
 * Deterministic coordinated-network seed data for mock mode.
 *
 * Shaped exactly like `internal/dto/network.go` sends it, so mock mode
 * exercises the same mapping code as live mode. Nothing here asserts that an
 * account is automated or inauthentic — the fixtures obey the same rule the
 * real payloads do, because a fixture that says "is_bot" would end up
 * rendered by a component someone then ships.
 */

const HOUR = 3_600_000;
const DAY = 86_400_000;
const hoursAgo = (n: number) => new Date(MOCK_NOW - n * HOUR).toISOString();
const daysAgo = (n: number) => new Date(MOCK_NOW - n * DAY).toISOString();

/** Claim ids from the claim seed, so the cross-link resolves both ways. */
const CLAIM_FLOOD = "c0000000-0000-0000-0000-000000000004";
const CLAIM_CONGESTION = "c0000000-0000-0000-0000-000000000001";
const CLAIM_REZONING = "c0000000-0000-0000-0000-000000000002";

const TOPIC_FLOOD = {
  id: "a0000000-0000-0000-0000-000000000004",
  name: "Flooding & Drainage",
};
const TOPIC_CONGESTION = {
  id: "a0000000-0000-0000-0000-000000000001",
  name: "Congestion & Road Pricing",
};
const TOPIC_REZONING = {
  id: "a0000000-0000-0000-0000-000000000002",
  name: "Rezoning & Housing Density",
};

export const RUN_SCHEDULED = "e0000000-0000-0000-0000-000000000001";
export const RUN_VELOCITY = "e0000000-0000-0000-0000-000000000002";
export const RUN_TRUNCATED = "e0000000-0000-0000-0000-000000000003";

const DISCLAIMER =
  "This report identifies statistical patterns in publicly available account behaviour, including posting times, content duplication, and content provenance. These patterns do not prove that an account is automated, inauthentic, or acting in bad faith. They also do not reveal an account holder's identity, affiliation, or intent. Coordinated behaviour can have legitimate explanations, such as civic campaigns, news syndication, or community mobilisation. Findings are indicators, not conclusions, and require human review before action is taken.";

const SIGNAL_METHODS: Record<string, { name: string; method: string }> = {
  SY: {
    name: "Synchrony",
    method:
      "Measures how often pairs of accounts posted inside the same short time bin more frequently than chance would produce.",
  },
  DU: {
    name: "Duplication",
    method:
      "Measures how much of the text these accounts posted is identical or near-identical, after excluding common slogans and civic boilerplate.",
  },
  CO: {
    name: "Cohesion",
    method:
      "Measures how tightly connected the group is compared with the ordinary conversation around the same claim.",
  },
  PR: {
    name: "Provenance anomaly",
    method:
      "Measures how unusually clustered the accounts' creation dates and profile metadata are relative to the wider population.",
  },
  AU: {
    name: "Automation & behavioural anomaly",
    method:
      "Measures posting-rhythm regularity: how evenly spaced the posts are and how much of the 24-hour clock the accounts cover.",
  },
};

function signal(
  code: string,
  score: number,
  weight: number,
  rawCounts: Record<string, unknown>,
  available = true,
): SignalDetailDto {
  return {
    code,
    name: SIGNAL_METHODS[code].name,
    score,
    method: SIGNAL_METHODS[code].method,
    raw_counts: rawCounts,
    weight,
    available,
  };
}

/* -------------------------------- runs --------------------------------- */

export const MOCK_RUNS: DetectionRunDto[] = [
  {
    run_id: RUN_SCHEDULED,
    status: "completed",
    trigger_source: "scheduled",
    scope_claim_ids: [CLAIM_FLOOD, CLAIM_CONGESTION],
    window_start: daysAgo(8),
    window_end: daysAgo(1),
    truncated: false,
    candidates_count: 2140,
    signals_unavailable: [],
    confidence_capped_at_medium: false,
    network_count: 2,
    offtopic_count: 3,
    random_seed: 20260829,
    started_at: daysAgo(1),
    completed_at: daysAgo(1),
    parameters: { window_days: 7, edge_threshold: 0.35, k_core: 3 },
  },
  {
    run_id: RUN_VELOCITY,
    status: "completed",
    trigger_source: "velocity",
    scope_claim_ids: [CLAIM_REZONING],
    window_start: daysAgo(5),
    window_end: hoursAgo(30),
    truncated: false,
    candidates_count: 860,
    signals_unavailable: ["PR"],
    confidence_capped_at_medium: false,
    network_count: 1,
    offtopic_count: 1,
    random_seed: 20260828,
    started_at: hoursAgo(30),
    completed_at: hoursAgo(29),
    parameters: { window_days: 7, edge_threshold: 0.35, k_core: 3 },
  },
  {
    run_id: RUN_TRUNCATED,
    status: "completed",
    trigger_source: "on_demand",
    scope_claim_ids: [CLAIM_CONGESTION],
    window_start: daysAgo(14),
    window_end: daysAgo(7),
    truncated: true,
    candidates_count: 5000,
    // Two signal families are unavailable, which caps every network from
    // this run at Medium confidence.
    signals_unavailable: ["PR", "AU"],
    confidence_capped_at_medium: true,
    network_count: 1,
    offtopic_count: 2,
    random_seed: 20260822,
    started_at: daysAgo(7),
    completed_at: daysAgo(7),
    parameters: { window_days: 7, edge_threshold: 0.35, k_core: 3 },
  },
];

function runContext(runId: string): RunContextDto {
  const run = MOCK_RUNS.find((r) => r.run_id === runId) ?? MOCK_RUNS[0];
  return {
    run_id: run.run_id,
    trigger_source: run.trigger_source,
    window_start: run.window_start as string,
    window_end: run.window_end as string,
    completed_at: run.completed_at,
    truncated: run.truncated,
    candidates_count: run.candidates_count,
    signals_unavailable: run.signals_unavailable ?? [],
    confidence_capped_at_medium: run.confidence_capped_at_medium,
    truncation_note: run.truncated
      ? "This run's candidate set hit the cap of 5,000 accounts, so recall is known to be incomplete. Networks from it are held at Medium confidence regardless of score."
      : undefined,
  };
}

/* ------------------------------ networks ------------------------------- */

function claimRef(
  claimId: string,
  statement: string,
  topic: { id: string; name: string },
  overlap: number,
  anchoring: number,
  posts: number,
  isPrimary = true,
  passed = true,
): NetworkClaimRefDto {
  return {
    claim_id: claimId,
    claim_statement: statement,
    claim_type: "existing",
    topic,
    is_primary: isPrimary,
    overlap_ratio: overlap,
    anchoring_share: anchoring,
    claim_cluster_post_count: posts,
    passed_relevance_gate: passed,
  };
}

const FLOOD_CLAIM = claimRef(
  CLAIM_FLOOD,
  "The flood maps were doctored to justify building on protected wetland.",
  TOPIC_FLOOD,
  0.71,
  0.83,
  612,
);

const CONGESTION_CLAIM = claimRef(
  CLAIM_CONGESTION,
  "The new congestion charge is a hidden tax that won't reduce emissions at all.",
  TOPIC_CONGESTION,
  0.58,
  0.64,
  244,
);

const REZONING_CLAIM = claimRef(
  CLAIM_REZONING,
  "Rezoning for density will flood the area and overwhelm the drains.",
  TOPIC_REZONING,
  0.44,
  0.51,
  118,
);

export interface MockNetwork extends NetworkCardDto {
  run_id: string;
  why_flagged: WhyFlaggedDto;
  linked_claims: NetworkClaimRefDto[];
  review: NetworkReviewDto | null;
  review_log: NetworkReviewLogEntryDto[];
  reports: ReportViewDto[];
}

export const NETWORK_FLOOD = "f0000000-0000-0000-0000-000000000001";
export const NETWORK_CONGESTION = "f0000000-0000-0000-0000-000000000002";
export const NETWORK_REZONING = "f0000000-0000-0000-0000-000000000003";
export const NETWORK_LOW = "f0000000-0000-0000-0000-000000000004";

export function buildNetworks(): MockNetwork[] {
  return [
    {
      id: NETWORK_FLOOD,
      run_id: RUN_SCHEDULED,
      label: "Flood-gate amplification cluster",
      coordination_score: 78.4,
      confidence_band: "high",
      signal_breadth: 3,
      review_status: "unreviewed",
      account_count: 47,
      post_count: 612,
      platforms: ["x", "facebook"],
      detected_at: daysAgo(1),
      primary_claim: FLOOD_CLAIM,
      recurrence: { count: 1, is_recurrence: false, first_seen_at: daysAgo(1) },
      low_confidence: false,
      from_truncated_run: false,
      linked_claims: [FLOOD_CLAIM],
      review: null,
      review_log: [],
      reports: [],
      why_flagged: {
        coordination_score: 78.4,
        signals: [
          signal("SY", 84, 0.3, {
            accounts_in_shared_bin: 43,
            total_accounts: 47,
            bin_width_seconds: 360,
            repeated_occurrences_24h: 3,
          }),
          signal("DU", 76, 0.25, {
            near_duplicate_posts: 188,
            total_posts: 612,
            distinct_duplicate_groups: 9,
            common_phrases_excluded: 4,
          }),
          signal("CO", 71, 0.2, {
            internal_edges: 402,
            possible_edges: 1081,
            boundary_edges: 96,
          }),
          signal("PR", 41, 0.15, {
            accounts_created_within_36h: 12,
            median_account_age_days: 214,
          }),
          signal("AU", 52, 0.1, {
            median_interpost_seconds: 1840,
            accounts_with_full_circadian_coverage: 6,
          }),
        ],
        confidence: {
          band: "high",
          signal_breadth: 3,
          rule: "High requires a Coordination Score of at least 70 and at least 3 signal families independently scoring 50 or above. Both held: 78.4 with SY, DU and CO above 50.",
          capped_by_run: false,
          note: "A high composite with only one family agreeing can never reach High — that shape is characteristic of a false positive, not of a campaign.",
        },
        signals_unavailable: [],
        internal_density: 0.37,
        conductance: 0.19,
        comparison_account_count: 120,
        claim_relevance: {
          primary_claim: FLOOD_CLAIM,
          secondary_claims: [
            claimRef(
              CLAIM_REZONING,
              "Rezoning for density will flood the area and overwhelm the drains.",
              TOPIC_REZONING,
              0.22,
              0.31,
              47,
              false,
            ),
          ],
          anchor_share_threshold: 0.6,
          min_claim_posts_threshold: 50,
          min_link_strength_threshold: 0.4,
        },
        known_limitations: [
          "Synchrony cannot distinguish coordination from a shared timezone and a shared working day. Accounts in one city will always look more synchronous than a global sample.",
          "Duplication is measured on text only. A campaign that paraphrases rather than copies will score lower here without being less coordinated.",
          "Account creation dates are self-reported by the platform and are missing for some accounts in this window.",
        ],
      },
    },
    {
      id: NETWORK_CONGESTION,
      run_id: RUN_SCHEDULED,
      label: "Congestion-charge repost ring",
      coordination_score: 61.2,
      confidence_band: "medium",
      signal_breadth: 2,
      review_status: "under_review",
      account_count: 23,
      post_count: 244,
      platforms: ["x"],
      detected_at: daysAgo(1),
      primary_claim: CONGESTION_CLAIM,
      recurrence: {
        count: 3,
        is_recurrence: true,
        first_seen_at: daysAgo(62),
        prior_claims: [
          {
            network_id: "f0000000-0000-0000-0000-0000000000f1",
            label: "Congestion-charge repost ring",
            detected_at: daysAgo(62),
            confidence_band: "medium",
            coordination_score: 58.1,
            claim_id: CLAIM_CONGESTION,
            claim_statement:
              "Low-emission zone cameras are really mass surveillance of ordinary drivers.",
          },
        ],
      },
      low_confidence: false,
      from_truncated_run: false,
      linked_claims: [CONGESTION_CLAIM],
      review: {
        status: "under_review",
        reason:
          "Opened for review after the third recurrence. Checking whether the overlap with the taxi drivers' association accounts is declared coordination.",
        reviewed_by: "d0000000-0000-0000-0000-000000000001",
        reviewed_at: hoursAgo(20),
      },
      review_log: [
        {
          id: "f1000000-0000-0000-0000-000000000001",
          from_status: "unreviewed",
          to_status: "under_review",
          reason:
            "Opened for review after the third recurrence. Checking whether the overlap with the taxi drivers' association accounts is declared coordination.",
          user_id: "d0000000-0000-0000-0000-000000000001",
          created_at: hoursAgo(20),
          signal_profile: { SY: 68, DU: 59, CO: 44, PR: 31, AU: 38 },
        },
      ],
      reports: [],
      why_flagged: {
        coordination_score: 61.2,
        signals: [
          signal("SY", 68, 0.3, {
            accounts_in_shared_bin: 19,
            total_accounts: 23,
            bin_width_seconds: 60,
            repeated_occurrences_24h: 2,
          }),
          signal("DU", 59, 0.25, {
            near_duplicate_posts: 71,
            total_posts: 244,
            distinct_duplicate_groups: 4,
            common_phrases_excluded: 2,
          }),
          signal("CO", 44, 0.2, {
            internal_edges: 96,
            possible_edges: 253,
            boundary_edges: 61,
          }),
          signal("PR", 31, 0.15, {
            accounts_created_within_36h: 3,
            median_account_age_days: 902,
          }),
          signal("AU", 38, 0.1, {
            median_interpost_seconds: 5400,
            accounts_with_full_circadian_coverage: 1,
          }),
        ],
        confidence: {
          band: "medium",
          signal_breadth: 2,
          rule: "Medium requires a Coordination Score of at least 55 and at least 2 signal families scoring 50 or above. Both held: 61.2 with SY and DU above 50.",
          capped_by_run: false,
        },
        signals_unavailable: [],
        internal_density: 0.38,
        conductance: 0.39,
        comparison_account_count: 88,
        claim_relevance: {
          primary_claim: CONGESTION_CLAIM,
          secondary_claims: [],
          anchor_share_threshold: 0.6,
          min_claim_posts_threshold: 50,
          min_link_strength_threshold: 0.4,
        },
        known_limitations: [
          "Synchrony cannot distinguish coordination from a shared timezone and a shared commuting schedule.",
          "This is the third detection of an overlapping account set. A recurrence inherits history but not relevance — the prior anchoring claims are stated above.",
        ],
      },
    },
    {
      id: NETWORK_REZONING,
      run_id: RUN_VELOCITY,
      label: "Rezoning drainage-claim cluster",
      coordination_score: 57.9,
      confidence_band: "medium",
      signal_breadth: 2,
      review_status: "dismissed_false_positive",
      account_count: 14,
      post_count: 118,
      platforms: ["facebook"],
      detected_at: hoursAgo(29),
      primary_claim: REZONING_CLAIM,
      recurrence: { count: 1, is_recurrence: false, first_seen_at: hoursAgo(29) },
      low_confidence: false,
      from_truncated_run: false,
      linked_claims: [REZONING_CLAIM],
      review: {
        status: "dismissed_false_positive",
        reason:
          "These are the Kampung Melayu flood-response volunteer network. The synchrony is their shift rota — they post drainage updates at handover. Organic, and now allowlisted.",
        reviewed_by: "d0000000-0000-0000-0000-000000000001",
        reviewed_at: hoursAgo(6),
      },
      review_log: [
        {
          id: "f1000000-0000-0000-0000-000000000002",
          from_status: "unreviewed",
          to_status: "dismissed_false_positive",
          reason:
            "These are the Kampung Melayu flood-response volunteer network. The synchrony is their shift rota — they post drainage updates at handover. Organic, and now allowlisted.",
          user_id: "d0000000-0000-0000-0000-000000000001",
          created_at: hoursAgo(6),
          signal_profile: { SY: 79, DU: 52, CO: 41, PR: 0, AU: 33 },
        },
      ],
      reports: [],
      why_flagged: {
        coordination_score: 57.9,
        signals: [
          signal("SY", 79, 0.3, {
            accounts_in_shared_bin: 12,
            total_accounts: 14,
            bin_width_seconds: 60,
            repeated_occurrences_24h: 4,
          }),
          signal("DU", 52, 0.25, {
            near_duplicate_posts: 29,
            total_posts: 118,
            distinct_duplicate_groups: 2,
            common_phrases_excluded: 6,
          }),
          signal("CO", 41, 0.2, {
            internal_edges: 38,
            possible_edges: 91,
            boundary_edges: 30,
          }),
          // The run had no provenance data at all: unavailable, not zero.
          signal("PR", 0, 0.15, {}, false),
          signal("AU", 33, 0.1, {
            median_interpost_seconds: 7200,
            accounts_with_full_circadian_coverage: 0,
          }),
        ],
        confidence: {
          band: "medium",
          signal_breadth: 2,
          rule: "Medium requires a Coordination Score of at least 55 and at least 2 signal families scoring 50 or above. Both held: 57.9 with SY and DU above 50.",
          capped_by_run: false,
          note: "Provenance could not be measured this run, so the composite is computed over four families rather than five.",
        },
        signals_unavailable: ["PR"],
        internal_density: 0.42,
        conductance: 0.44,
        comparison_account_count: 61,
        claim_relevance: {
          primary_claim: REZONING_CLAIM,
          secondary_claims: [],
          anchor_share_threshold: 0.6,
          min_claim_posts_threshold: 50,
          min_link_strength_threshold: 0.4,
        },
        known_limitations: [
          "Provenance was unavailable for this run — account creation dates could not be read from the platform.",
          "Synchrony cannot distinguish coordination from a shared rota. A volunteer group posting at shift handover produces the same signature as a scheduled campaign.",
        ],
      },
    },
    {
      id: NETWORK_LOW,
      run_id: RUN_TRUNCATED,
      label: "Emissions-rule reply cluster",
      coordination_score: 72.6,
      // High score, breadth 1 — the characteristic shape of a false positive,
      // which is exactly why it cannot reach High.
      confidence_band: "low",
      signal_breadth: 1,
      review_status: "unreviewed",
      account_count: 9,
      post_count: 74,
      platforms: ["x"],
      detected_at: daysAgo(7),
      primary_claim: CONGESTION_CLAIM,
      recurrence: { count: 1, is_recurrence: false, first_seen_at: daysAgo(7) },
      low_confidence: true,
      from_truncated_run: true,
      linked_claims: [CONGESTION_CLAIM],
      review: null,
      review_log: [],
      reports: [],
      why_flagged: {
        coordination_score: 72.6,
        signals: [
          signal("SY", 91, 0.3, {
            accounts_in_shared_bin: 9,
            total_accounts: 9,
            bin_width_seconds: 60,
            repeated_occurrences_24h: 5,
          }),
          signal("DU", 34, 0.25, {
            near_duplicate_posts: 8,
            total_posts: 74,
            distinct_duplicate_groups: 1,
            common_phrases_excluded: 1,
          }),
          signal("CO", 28, 0.2, {
            internal_edges: 14,
            possible_edges: 36,
            boundary_edges: 22,
          }),
          signal("PR", 0, 0.15, {}, false),
          signal("AU", 0, 0.1, {}, false),
        ],
        confidence: {
          band: "low",
          signal_breadth: 1,
          rule: "Neither High nor Medium was reached: only 1 signal family scored 50 or above, and both bands require at least 2. The composite of 72.6 does not change this.",
          capped_by_run: true,
          note: "A high composite driven by a single family is the characteristic shape of a false positive, not of a campaign. Two families were also unavailable this run, which caps the whole run at Medium in any case.",
        },
        signals_unavailable: ["PR", "AU"],
        internal_density: 0.39,
        conductance: 0.61,
        comparison_account_count: 44,
        claim_relevance: {
          primary_claim: CONGESTION_CLAIM,
          secondary_claims: [],
          anchor_share_threshold: 0.6,
          min_claim_posts_threshold: 50,
          min_link_strength_threshold: 0.4,
        },
        known_limitations: [
          "Two signal families were unavailable and the candidate set was truncated. Recall for this run is known to be incomplete.",
          "Nine accounts is close to the minimum cluster size; small clusters produce unstable density estimates.",
        ],
      },
    },
  ];
}

/* ------------------------------- accounts ------------------------------ */

const HANDLE_POOL = [
  "@warga_kali",
  "@banjir_watch",
  "@jakarta_drains",
  "@kanal_timur",
  "@relawan_air",
  "@peta_banjir",
  "@rt05_update",
  "@sungai_kita",
  "@drainase_now",
  "@air_naik",
  "@commuter_rage",
  "@roadfreedom",
  "@taxpayer_union",
  "@metro_truths",
  "@jakarta_uncut",
];

/** Behaviours and graph positions only — no verdict columns, by design. */
export function accountsFor(network: MockNetwork): AccountAnnexRowDto[] {
  const members = Math.min(network.account_count ?? 10, 18);
  const rows: AccountAnnexRowDto[] = [];
  for (let i = 0; i < members; i++) {
    const seed = (i * 37 + (network.post_count ?? 100)) % 100;
    rows.push({
      account_id: `${network.id}-a${i}`,
      handle: `${HANDLE_POOL[i % HANDLE_POOL.length]}${i > HANDLE_POOL.length - 1 ? i : ""}`,
      platform: (network.platforms ?? ["x"])[i % (network.platforms?.length ?? 1)],
      platform_account_id: `plat_${network.id.slice(-4)}_${i}`,
      created_at_platform: daysAgo(30 + ((seed * 7) % 900)),
      posts_in_cluster: 4 + (seed % 28),
      duplication_rate: Math.round((0.2 + (seed % 70) / 100) * 100) / 100,
      median_interpost_interval_seconds: i % 7 === 0 ? null : 600 + seed * 40,
      circadian_coverage: Math.round((0.4 + (seed % 55) / 100) * 100) / 100,
      degree_centrality: Math.round((0.1 + (seed % 80) / 100) * 1000) / 1000,
      eigenvector_centrality: Math.round((0.05 + (seed % 60) / 100) * 1000) / 1000,
      score_contribution: {
        synchrony: Math.round((seed % 90) * 10) / 10,
        duplication: Math.round(((seed * 3) % 90) * 10) / 10,
      },
      role: "member",
      allowlisted: network.id === NETWORK_REZONING && i < 9,
    });
  }
  // Comparison accounts: genuine unclustered participants on the same claim.
  for (let i = 0; i < 6; i++) {
    rows.push({
      account_id: `${network.id}-c${i}`,
      handle: `@resident_${i + 1}`,
      platform: (network.platforms ?? ["x"])[0],
      platform_account_id: `plat_cmp_${i}`,
      created_at_platform: daysAgo(400 + i * 90),
      posts_in_cluster: 1 + (i % 3),
      duplication_rate: 0.02 + i / 100,
      median_interpost_interval_seconds: 43200 + i * 3600,
      circadian_coverage: 0.28 + i / 50,
      degree_centrality: 0.02 + i / 200,
      eigenvector_centrality: 0.01 + i / 300,
      role: "comparison",
      allowlisted: false,
    });
  }
  return rows;
}

export function graphFor(network: MockNetwork) {
  const accounts = accountsFor(network);
  const members = accounts.filter((a) => a.role === "member");
  const comparison = accounts.filter((a) => a.role === "comparison");

  // Deterministic pseudo-ForceAtlas2 coordinates: members drawn into a tight
  // core, comparison accounts scattered on a wide ring, so the cluster looks
  // visibly unusual against the ordinary conversation rather than merely
  // being asserted to be.
  const nodes: GraphNodeDto[] = [
    ...members.map((account, i) => {
      const angle = (i / Math.max(members.length, 1)) * Math.PI * 2;
      const radius = 60 + ((i * 13) % 40);
      return {
        account_id: account.account_id,
        handle: account.handle,
        platform: account.platform,
        role: "member",
        degree_centrality: account.degree_centrality,
        eigenvector_centrality: account.eigenvector_centrality,
        posts_in_cluster: account.posts_in_cluster,
        x: Math.round(Math.cos(angle) * radius * 100) / 100,
        y: Math.round(Math.sin(angle) * radius * 100) / 100,
        allowlisted: account.allowlisted,
      } satisfies GraphNodeDto;
    }),
    ...comparison.map((account, i) => {
      const angle = (i / Math.max(comparison.length, 1)) * Math.PI * 2 + 0.4;
      const radius = 220 + ((i * 29) % 60);
      return {
        account_id: account.account_id,
        handle: account.handle,
        platform: account.platform,
        role: "comparison",
        degree_centrality: account.degree_centrality,
        eigenvector_centrality: account.eigenvector_centrality,
        posts_in_cluster: account.posts_in_cluster,
        x: Math.round(Math.cos(angle) * radius * 100) / 100,
        y: Math.round(Math.sin(angle) * radius * 100) / 100,
        allowlisted: false,
      } satisfies GraphNodeDto;
    }),
  ];

  const edges: GraphEdgeDto[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      if ((i * 7 + j * 11) % 3 !== 0) continue;
      const seed = (i * 13 + j * 17) % 50;
      edges.push({
        source: members[i].account_id,
        target: members[j].account_id,
        weight: Math.round((0.35 + seed / 100) * 100) / 100,
        signals: {
          w_time: Math.round((0.4 + (seed % 40) / 100) * 100) / 100,
          w_text: Math.round((0.3 + (seed % 30) / 100) * 100) / 100,
          w_amp: Math.round(((seed % 25) / 100) * 100) / 100,
          w_meta: Math.round(((seed % 15) / 100) * 100) / 100,
          w_struct: Math.round((0.2 + (seed % 20) / 100) * 100) / 100,
        },
        signal_count: 2 + (seed % 2),
      });
    }
  }

  return {
    nodes,
    edges,
    reduced: false,
    total_node_count: nodes.length,
    member_count: members.length,
    comparison_count: comparison.length,
  };
}

export function timelineFor(): BurstTimelineDto {
  const bins = [];
  const total = 48;
  for (let i = 0; i < total; i++) {
    // Two engineered bursts, and ordinary background either side of them.
    const burst = i === 11 || i === 12 || i === 30;
    const base = 2 + ((i * 5) % 6);
    const postCount = burst ? base + 34 + (i % 7) : base;
    bins.push({
      bin_start: new Date(MOCK_NOW - (total - i) * HOUR).toISOString(),
      post_count: postCount,
      zscore: burst
        ? Math.round((3.4 + (i % 3) * 0.4) * 100) / 100
        : Math.round(((i % 5) * 0.2 - 0.4) * 100) / 100,
      is_anomalous: burst,
    });
  }
  return {
    bin_width_seconds: 3600,
    window_start: bins[0].bin_start,
    window_end: bins[bins.length - 1].bin_start,
    bins,
    anomalous_count: bins.filter((b) => b.is_anomalous).length,
  };
}

const CANONICAL_TEXTS = [
  "The flood maps were changed after the developer signed. Ask why the wetland boundary moved 400m.",
  "No consultation, no environmental review, and now the drains are the residents' problem. This is not climate policy, it is a land transfer.",
];

export function contentFor(network: MockNetwork): RepresentativeContentDto {
  const accounts = accountsFor(network).filter((a) => a.role === "member");

  function variant(
    groupIndex: number,
    i: number,
    canonical: string,
  ): EvidencePostDto {
    const account = accounts[(groupIndex * 3 + i) % accounts.length];
    const prefix = i === 0 ? "" : i === 1 ? "Ini penting: " : "Sekali lagi — ";
    const text = `${prefix}${canonical}`;
    return {
      id: `${network.id}-g${groupIndex}-v${i}`,
      account_id: account.account_id,
      handle: account.handle,
      platform: account.platform,
      post_platform_id: `p_${groupIndex}${i}${network.id.slice(-3)}`,
      text,
      posted_at: new Date(
        MOCK_NOW - 30 * HOUR + groupIndex * 6 * 60_000 + i * 47_000,
      ).toISOString(),
      captured_at: new Date(MOCK_NOW - 28 * HOUR).toISOString(),
      content_sha256: `${network.id.slice(-4)}${groupIndex}${i}`.padEnd(64, "a"),
      is_canonical: i === 0,
      // One deleted post per group: the snapshot keeps it, marked.
      still_public: !(groupIndex === 0 && i === 2),
      availability:
        groupIndex === 0 && i === 2
          ? "No longer publicly available (captured before removal)"
          : "Publicly available",
      shared_span_start: prefix.length,
      shared_span_end: prefix.length + canonical.length,
    };
  }

  return {
    groups: CANONICAL_TEXTS.map((canonical, g) => ({
      group_id: `${network.id}-g${g}`,
      canonical_text: canonical,
      variant_count: 3,
      variants: [0, 1, 2].map((i) => variant(g, i, canonical)),
    })),
    ungrouped: [
      {
        id: `${network.id}-u0`,
        account_id: accounts[0]?.account_id ?? "",
        handle: accounts[0]?.handle ?? "@unknown",
        platform: accounts[0]?.platform ?? "x",
        post_platform_id: "p_u0",
        text: "Ada yang punya link dokumen resminya? Saya mau baca sendiri.",
        posted_at: new Date(MOCK_NOW - 26 * HOUR).toISOString(),
        captured_at: new Date(MOCK_NOW - 26 * HOUR).toISOString(),
        content_sha256: "u0".padEnd(64, "b"),
        is_canonical: false,
        still_public: true,
        availability: "Publicly available",
      },
    ],
    note: "Posts are shown using the evidence captured when the coordinated activity was detected. The system does not re-fetch or update the posts afterward. If a post has since been deleted, it remains visible in the evidence record but is clearly marked as no longer publicly available.",
  };
}

/* ------------------------------ allowlist ------------------------------ */

export function buildAllowlist(): AllowlistEntryDto[] {
  return [
    {
      id: "a1000000-0000-0000-0000-000000000001",
      platform: "x",
      platform_account_id: "plat_ngo_001",
      handle: "@walhi_jakarta",
      category: "ngo",
      reason:
        "Environmental NGO with a declared, public climate campaign. Coordinated posting is their published campaign schedule.",
      added_by: "d0000000-0000-0000-0000-000000000001",
      added_at: daysAgo(40),
      active: true,
    },
    {
      id: "a1000000-0000-0000-0000-000000000002",
      platform: "x",
      platform_account_id: "plat_news_001",
      handle: "@kompas_metro",
      category: "newsroom",
      reason:
        "City desk of a national newsroom. Syndicated posting across desks is normal editorial practice, not concealed coordination.",
      added_by: "d0000000-0000-0000-0000-000000000001",
      added_at: daysAgo(40),
      active: true,
    },
    {
      id: "a1000000-0000-0000-0000-000000000003",
      platform: "facebook",
      platform_account_id: "plat_gov_001",
      handle: "@pemprovdki.comms",
      category: "self_exclusion",
      reason:
        "The city's own communications estate. Excluding it prevents the detector flagging the government that operates it.",
      added_by: "d0000000-0000-0000-0000-000000000001",
      added_at: daysAgo(40),
      active: true,
    },
  ];
}

export function buildCommonPhrases(): CommonPhraseDto[] {
  return [
    {
      id: "a2000000-0000-0000-0000-000000000001",
      phrase: "#JakartaTanpaBanjir",
      category: "hashtag",
      notes: "Shared civic campaign hashtag — not content duplication.",
      created_at: daysAgo(35),
    },
    {
      id: "a2000000-0000-0000-0000-000000000002",
      phrase: "Selamatkan kota kita",
      category: "slogan",
      notes: null,
      created_at: daysAgo(35),
    },
  ];
}

/* ----------------------------- governance ------------------------------ */

export function buildOfftopic(): OfftopicClusterDto[] {
  return [
    {
      cluster_id: "b1000000-0000-0000-0000-000000000001",
      run_id: RUN_SCHEDULED,
      claim_id: CLAIM_FLOOD,
      claim_statement:
        "The flood maps were doctored to justify building on protected wetland.",
      failed_test: "anchoring",
      overlap_ratio: 0.08,
      anchoring_share: 0.11,
      account_count: 62,
      post_count: 1840,
      signals: { SY: 88, DU: 91, CO: 74 },
      created_at: daysAgo(1),
    },
    {
      cluster_id: "b1000000-0000-0000-0000-000000000002",
      run_id: RUN_SCHEDULED,
      claim_id: CLAIM_CONGESTION,
      claim_statement:
        "The new congestion charge is a hidden tax that won't reduce emissions at all.",
      failed_test: "evidence_volume",
      overlap_ratio: 0.51,
      anchoring_share: 0.62,
      account_count: 11,
      post_count: 19,
      signals: { SY: 64, DU: 55, CO: 48 },
      created_at: daysAgo(1),
    },
    {
      cluster_id: "b1000000-0000-0000-0000-000000000003",
      run_id: RUN_TRUNCATED,
      claim_id: CLAIM_CONGESTION,
      claim_statement:
        "The new congestion charge is a hidden tax that won't reduce emissions at all.",
      failed_test: "link_strength",
      overlap_ratio: 0.29,
      anchoring_share: 0.71,
      account_count: 24,
      post_count: 310,
      signals: { SY: 72, DU: 40, CO: 33 },
      created_at: daysAgo(7),
    },
  ];
}

export function buildDismissals(): DismissalDto[] {
  return [
    {
      id: "b2000000-0000-0000-0000-000000000001",
      network_id: NETWORK_REZONING,
      network_label: "Rezoning drainage-claim cluster",
      reason:
        "These are the Kampung Melayu flood-response volunteer network. The synchrony is their shift rota — they post drainage updates at handover.",
      user_id: "d0000000-0000-0000-0000-000000000001",
      created_at: hoursAgo(6),
      signal_profile: { SY: 79, DU: 52, CO: 41, PR: 0, AU: 33 },
    },
  ];
}

export function buildAudit(): AuditLogEntryDto[] {
  return [];
}

/* -------------------------- detector settings -------------------------- */

export function buildDetectorSettings(): DetectorSettingsDto {
  return {
    window_days: 7,
    bin_width_seconds: 60,
    null_model_alpha: 0.01,
    dup_threshold: 0.8,
    sem_threshold: 0.9,
    min_post_length: 25,
    edge_threshold: 0.35,
    min_signal_families: 2,
    k_core: 3,
    leiden_resolution: 1,
    min_cluster_size: 5,
    min_internal_density: 0.3,
    // The five weights sum to exactly 1.00, which the server enforces.
    beta_time: 0.3,
    beta_text: 0.25,
    beta_amp: 0.2,
    beta_meta: 0.15,
    beta_struct: 0.1,
    provenance_half_life_hours: 72,
    anchor_share: 0.6,
    min_claim_posts: 50,
    min_link_strength: 0.4,
    high_score_cutoff: 70,
    high_breadth_cutoff: 3,
    medium_score_cutoff: 55,
    medium_breadth_cutoff: 2,
    cadence_hours: 6,
    candidate_cap: 5000,
    recurrence_threshold: 0.6,
    velocity_trigger_threshold: 2.5,
    velocity_trigger_enabled: true,
    updated_at: daysAgo(12),
    updated_by: "d0000000-0000-0000-0000-000000000001",
    self_exclusion_count: 1,
  };
}

export function buildSettingHistory(): SettingHistoryEntryDto[] {
  return [
    {
      id: "b3000000-0000-0000-0000-000000000001",
      key: "edge_threshold",
      from_value: "0.30",
      to_value: "0.35",
      changed_by: "d0000000-0000-0000-0000-000000000001",
      created_at: daysAgo(12),
    },
  ];
}

export const MOCK_DISCLAIMER = DISCLAIMER;
export { runContext };
