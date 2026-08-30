import type {
  GenericClaimDetail,
  Statement,
  SyntheticClaimDetail,
  TopAccount,
} from "@/types/claim";
import type { PolicyDetail } from "@/types/policy";
import type { AdminSettings, ScorePoint } from "@/types/alert";
import { TOPICS } from "@/lib/constants/topics";
import { buildScoreBreakdown } from "@/lib/scoring";

/**
 * Deterministic seed dataset for mock mode. Every screen renders fully populated
 * from this. Replace with real API responses once the backend exists.
 */

const DAY = 86_400_000;
const now = Date.parse("2026-08-30T09:00:00Z");
const daysAgo = (n: number) => new Date(now - n * DAY).toISOString();

function topic(i: number) {
  return TOPICS[i % TOPICS.length];
}

function makeStatements(claimId: string, pos: number, neg: number): Statement[] {
  const out: Statement[] = [];
  for (let i = 0; i < neg; i++) {
    out.push({
      id: `${claimId}_n${i}`,
      text: NEGATIVE_SAMPLES[i % NEGATIVE_SAMPLES.length],
      sentiment: "negative",
      author: `@${["urbanwatch", "citizenvoice", "realtalk_jkt", "commute_daily", "factcheckid"][i % 5]}`,
      postedAt: daysAgo(2 + i),
    });
  }
  for (let i = 0; i < pos; i++) {
    out.push({
      id: `${claimId}_p${i}`,
      text: POSITIVE_SAMPLES[i % POSITIVE_SAMPLES.length],
      sentiment: "positive",
      author: `@${["cleanair_now", "transit_forward", "greencity", "policywonk", "data_driven"][i % 5]}`,
      postedAt: daysAgo(1 + i),
    });
  }
  return out;
}

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

const TOP_ACCOUNT_HANDLES = [
  "@metro_truths",
  "@thedailyskeptic_id",
  "@jakarta_uncut",
  "@roadfreedom",
  "@taxpayer_union",
  "@localvoices_now",
  "@commuter_rage",
];

function makeTopAccounts(claimId: string, seed: number): TopAccount[] {
  return Array.from({ length: 5 }, (_, i) => {
    const contribution = Math.round(1800 / (i + 1) + ((seed * 37) % 120));
    return {
      rank: i + 1,
      handle: TOP_ACCOUNT_HANDLES[(seed + i) % TOP_ACCOUNT_HANDLES.length],
      contribution,
      contributionLabel: `${contribution.toLocaleString()} posts to supporting cluster`,
    } satisfies TopAccount;
  });
}

const GENERIC_STATEMENTS = [
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

const SYNTHETIC_STATEMENTS = [
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

export function buildSeed() {
  const genericClaims: GenericClaimDetail[] = GENERIC_STATEMENTS.map((statement, i) => {
    const id = `gc_${String(i + 1).padStart(3, "0")}`;
    const t = topic(i);
    const dormant = i === 11; // one dormant example (PRD §6.4.7)
    const score = buildScoreBreakdown({
      r: dormant ? 8 : 35 + ((i * 13) % 55),
      v: dormant ? 4 : 20 + ((i * 29) % 70),
      f: 55 + ((i * 7) % 40),
      h: 45 + ((i * 17) % 50),
      ei: 30 + ((i * 23) % 60),
      eiOpposing: 20 + ((i * 19) % 50),
      npr: dormant ? 0 : (i % 5) * 0.12,
      dormant,
    });
    const negativeCount = 40 + ((i * 11) % 120);
    const positiveCount = 8 + ((i * 5) % 40);
    return {
      id,
      type: "generic",
      statement,
      topicId: t.id,
      topicLabel: t.label,
      status: (["unreviewed", "active", "inactive", "action_taken"] as const)[i % 4],
      score,
      firstCaughtAt: daysAgo(3 + i * 2),
      positiveCount,
      negativeCount,
      onWatchlist: i < 3,
      topAccounts: makeTopAccounts(id, i),
      debunkContent: debunkDraft(statement),
      correlatedPolicies: [],
      positiveStatements: makeStatements(id, Math.min(positiveCount, 6), 0),
      negativeStatements: makeStatements(id, 0, Math.min(negativeCount, 8)),
    } satisfies GenericClaimDetail;
  });

  const syntheticClaims: SyntheticClaimDetail[] = SYNTHETIC_STATEMENTS.map(
    (statement, i) => {
      const id = `sc_${String(i + 1).padStart(3, "0")}`;
      const t = topic(i + 2);
      return {
        id,
        type: "synthetic",
        statement,
        topicId: t.id,
        topicLabel: t.label,
        status: (["unreviewed", "active", "inactive", "action_taken"] as const)[i % 4],
        createdAt: daysAgo(i),
        prebunkContent: prebunkDraft(statement),
        correlatedPolicy: null,
      } satisfies SyntheticClaimDetail;
    },
  );

  const policies: PolicyDetail[] = [
    policy("pol_001", "Central Business District Congestion Charge", -420, -30),
    policy("pol_002", "Inner-Ring Low-Emission Zone", -260, -14),
    policy("pol_003", "Transit-Oriented Density Rezoning (Phase 2)", -140, -3),
    policy("pol_004", "Stormwater Utility Fee", -95, 40),
    policy("pol_005", "Extreme-Heat Resilience Program", -60, -1),
    policy("pol_006", "Wildland-Urban Interface Building Code", -30, 120),
    policy("pol_007", "Public Transit Investment Levy", -12, 210),
  ];

  // Link claims <-> policies (many-to-many for generic; one policy per synthetic).
  linkGenericToPolicy(genericClaims, "gc_001", policies, "pol_001");
  linkGenericToPolicy(genericClaims, "gc_009", policies, "pol_001");
  linkGenericToPolicy(genericClaims, "gc_003", policies, "pol_002");
  linkGenericToPolicy(genericClaims, "gc_011", policies, "pol_002");
  linkGenericToPolicy(genericClaims, "gc_002", policies, "pol_003");
  linkGenericToPolicy(genericClaims, "gc_012", policies, "pol_003");
  linkGenericToPolicy(genericClaims, "gc_004", policies, "pol_004");
  linkGenericToPolicy(genericClaims, "gc_010", policies, "pol_004");
  linkGenericToPolicy(genericClaims, "gc_005", policies, "pol_005");
  linkGenericToPolicy(genericClaims, "gc_013", policies, "pol_005");
  linkGenericToPolicy(genericClaims, "gc_006", policies, "pol_006");
  linkGenericToPolicy(genericClaims, "gc_014", policies, "pol_006");
  linkGenericToPolicy(genericClaims, "gc_007", policies, "pol_007");

  linkSyntheticToPolicy(syntheticClaims, "sc_001", "pol_001");
  linkSyntheticToPolicy(syntheticClaims, "sc_009", "pol_001");
  linkSyntheticToPolicy(syntheticClaims, "sc_002", "pol_004");
  linkSyntheticToPolicy(syntheticClaims, "sc_003", "pol_007");
  linkSyntheticToPolicy(syntheticClaims, "sc_004", "pol_003");
  linkSyntheticToPolicy(syntheticClaims, "sc_005", "pol_005");
  linkSyntheticToPolicy(syntheticClaims, "sc_006", "pol_006");
  linkSyntheticToPolicy(syntheticClaims, "sc_008", "pol_006");
  linkSyntheticToPolicy(syntheticClaims, "sc_010", "pol_002");

  recomputePolicyRollups(policies, genericClaims, syntheticClaims);

  const settings: AdminSettings = { alertThreshold: 60 };

  return { genericClaims, syntheticClaims, policies, settings };

  function policy(
    id: string,
    name: string,
    createdOffsetDays: number,
    rolledOutOffsetDays: number,
  ): PolicyDetail {
    const rolledOutDate = daysAgo(-rolledOutOffsetDays);
    return {
      id,
      name,
      fileName: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`,
      fileUrl: "#",
      rolledOutDate,
      status: Date.parse(rolledOutDate) <= now ? "rolled_out" : "not_rolled_out",
      createdAt: daysAgo(-createdOffsetDays),
      processing: "ready",
      lastClaimActivityAt: null,
      linkedGenericCount: 0,
      linkedSyntheticCount: 0,
      genericClaims: [],
      syntheticClaims: [],
    };
  }
}

function linkGenericToPolicy(
  claims: GenericClaimDetail[],
  claimId: string,
  policies: PolicyDetail[],
  policyId: string,
) {
  const claim = claims.find((c) => c.id === claimId);
  const pol = policies.find((p) => p.id === policyId);
  if (!claim || !pol) return;
  claim.correlatedPolicies.push({ id: pol.id, name: pol.name });
  pol.genericClaims.push(claim);
}

function linkSyntheticToPolicy(
  claims: SyntheticClaimDetail[],
  claimId: string,
  policyId: string,
) {
  const claim = claims.find((c) => c.id === claimId);
  if (claim) claim.correlatedPolicy = { id: policyId, name: policyId };
}

export function recomputePolicyRollups(
  policies: PolicyDetail[],
  generic: GenericClaimDetail[],
  synthetic: SyntheticClaimDetail[],
) {
  for (const pol of policies) {
    const g = generic.filter((c) =>
      c.correlatedPolicies.some((p) => p.id === pol.id),
    );
    const s = synthetic.filter((c) => c.correlatedPolicy?.id === pol.id);
    pol.genericClaims = g;
    pol.syntheticClaims = s;
    pol.linkedGenericCount = g.length;
    pol.linkedSyntheticCount = s.length;
    const dates = [
      ...g.map((c) => c.firstCaughtAt),
      ...s.map((c) => c.createdAt),
    ].sort();
    pol.lastClaimActivityAt = dates.length ? dates[dates.length - 1] : null;
    // keep policy name in sync on synthetic refs
    for (const c of s) if (c.correlatedPolicy) c.correlatedPolicy.name = pol.name;
  }
}

let genCounter = 100;

/** Build one fresh generic claim (F4 "Generate Generic Claim" — PRD US33). */
export function createGenericClaim(): GenericClaimDetail {
  genCounter += 1;
  const i = genCounter;
  const id = `gc_${String(i).padStart(3, "0")}`;
  const t = topic(i);
  const statement = GENERIC_STATEMENTS[i % GENERIC_STATEMENTS.length];
  const score = buildScoreBreakdown({
    r: 30 + ((i * 13) % 55),
    v: 40 + ((i * 29) % 55),
    f: 60 + ((i * 7) % 35),
    h: 50 + ((i * 17) % 45),
    ei: 35 + ((i * 23) % 55),
    eiOpposing: 25 + ((i * 19) % 45),
    npr: (i % 4) * 0.1,
  });
  const negativeCount = 30 + ((i * 11) % 90);
  const positiveCount = 6 + ((i * 5) % 30);
  return {
    id,
    type: "generic",
    statement: `${statement} (sample #${i})`,
    topicId: t.id,
    topicLabel: t.label,
    status: "unreviewed",
    score,
    firstCaughtAt: new Date().toISOString(),
    positiveCount,
    negativeCount,
    onWatchlist: false,
    topAccounts: makeTopAccounts(id, i),
    debunkContent: debunkDraft(statement),
    correlatedPolicies: [],
    positiveStatements: makeStatements(id, Math.min(positiveCount, 6), 0),
    negativeStatements: makeStatements(id, 0, Math.min(negativeCount, 8)),
  };
}

let synCounter = 100;

/** Build predicted synthetic claim(s) for a newly-added policy (PRD US42). */
export function createSyntheticForPolicy(
  policyId: string,
  policyName: string,
): SyntheticClaimDetail {
  synCounter += 1;
  const i = synCounter;
  const id = `sc_${String(i).padStart(3, "0")}`;
  const t = topic(i);
  const statement = `Rules introduced under "${policyName}" will quietly be expanded citywide with no further consultation.`;
  return {
    id,
    type: "synthetic",
    statement,
    topicId: t.id,
    topicLabel: t.label,
    status: "unreviewed",
    createdAt: new Date().toISOString(),
    prebunkContent: prebunkDraft(statement),
    correlatedPolicy: { id: policyId, name: policyName },
  };
}

export function scoreHistory(finalScore: number, seed: number): ScorePoint[] {
  return Array.from({ length: 8 }, (_, i) => {
    const drift = Math.sin((i + seed) / 2) * 9 + (i - 7) * 1.4;
    return {
      date: new Date(now - (7 - i) * 7 * DAY).toISOString(),
      score: Math.max(0, Math.min(100, Math.round(finalScore + drift))),
    };
  });
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
