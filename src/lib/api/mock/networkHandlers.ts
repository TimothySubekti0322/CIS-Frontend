import { ApiError } from "@/types/common";
import { sleep } from "@/lib/utils";
import type {
  AllowlistEntryDto,
  NetworkDetailDto,
  ReportViewDto,
} from "../dto.networks";
import {
  MOCK_DISCLAIMER,
  MOCK_RUNS,
  accountsFor,
  buildAllowlist,
  buildAudit,
  buildCommonPhrases,
  buildDetectorSettings,
  buildDismissals,
  buildNetworks,
  buildOfftopic,
  buildSettingHistory,
  contentFor,
  graphFor,
  runContext,
  timelineFor,
  type MockNetwork,
} from "./networks";
import type { MockContext } from "./handlers";

/**
 * Mock-mode handlers for F5.
 *
 * Mock mode is the default, so without these the whole feature would be a dead
 * end when someone runs the app with no backend. They return the same
 * envelopes and snake_case payloads the Go handlers do — including the ones
 * that matter most to get right in the UI: the fail-closed export gate, the
 * 20-character reason requirement, and `available: false` on a signal family
 * that could not be measured.
 */

type Handler = (ctx: MockContext) => Promise<unknown>;

function ok<T>(data: T, message: string, meta?: unknown) {
  return meta
    ? { success: true, message, data, meta }
    : { success: true, message, data };
}

function fail(message: string, status: number, code: string): never {
  throw new ApiError(message, status, code);
}

function qs(ctx: MockContext, key: string): string | undefined {
  const value = ctx.query[key];
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function qsList(ctx: MockContext, key: string): string[] {
  const raw = qs(ctx, key);
  return raw
    ? raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
}

function qsBool(ctx: MockContext, key: string): boolean {
  return qs(ctx, key) === "true";
}

function qsNum(ctx: MockContext, key: string, fallback: number): number {
  const n = Number(qs(ctx, key));
  return Number.isFinite(n) ? n : fallback;
}

function paginate<T>(rows: T[], ctx: MockContext, defaultLimit = 20) {
  const limit = Math.min(Math.max(qsNum(ctx, "limit", defaultLimit), 1), 200);
  const page = Math.max(Math.trunc(qsNum(ctx, "page", 1)), 1);
  const total = rows.length;
  const start = (page - 1) * limit;
  return {
    items: rows.slice(start, start + limit),
    meta: {
      page,
      limit,
      total,
      total_pages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

function body<T extends object>(ctx: MockContext): Partial<T> {
  return (ctx.body ?? {}) as Partial<T>;
}

/* ------------------------------- the store ------------------------------ */

interface F5State {
  networks: MockNetwork[];
  allowlist: AllowlistEntryDto[];
  phrases: ReturnType<typeof buildCommonPhrases>;
  offtopic: ReturnType<typeof buildOfftopic>;
  dismissals: ReturnType<typeof buildDismissals>;
  audit: ReturnType<typeof buildAudit>;
  settings: ReturnType<typeof buildDetectorSettings>;
  history: ReturnType<typeof buildSettingHistory>;
  cityTimezone: string;
}

let state: F5State | null = null;

function f5(): F5State {
  state ??= {
    networks: buildNetworks(),
    allowlist: buildAllowlist(),
    phrases: buildCommonPhrases(),
    offtopic: buildOfftopic(),
    dismissals: buildDismissals(),
    audit: buildAudit(),
    settings: buildDetectorSettings(),
    history: buildSettingHistory(),
    cityTimezone: "Asia/Jakarta",
  };
  return state;
}

function findNetwork(id: string): MockNetwork {
  const network = f5().networks.find((n) => n.id === id);
  if (!network) fail("network not found", 404, "NOT_FOUND");
  return network;
}

/**
 * The US58 gate, evaluated exactly as the server does it: an allowlist of three
 * statuses, fail-closed. An unreviewed network cannot be exported, because an
 * unreviewed export is an unreviewed accusation.
 */
const EXPORTABLE = ["under_review", "confirmed", "action_taken"];

function exportEligibility(network: MockNetwork) {
  const allowed = EXPORTABLE.includes(network.review_status ?? "unreviewed");
  return {
    allowed,
    reason: allowed
      ? undefined
      : network.review_status === "dismissed_false_positive"
        ? "This network was assessed and dismissed as a false positive. Exporting it would circulate a finding the team has already rejected."
        : "This network has not been reviewed by a person yet. A report may only be generated once its review status is Under Review, Confirmed, or Action Taken.",
    allowed_statuses: EXPORTABLE,
  };
}

/* ------------------------------- networks ------------------------------ */

const listNetworks: Handler = async (ctx) => {
  await sleep(220);
  const status = qs(ctx, "status");
  const bands = qsList(ctx, "confidence");
  const showLow = qsBool(ctx, "show_low_confidence");
  const topicIds = qsList(ctx, "topic_ids");
  const claimIds = qsList(ctx, "claim_ids");
  const search = qs(ctx, "q")?.toLowerCase();
  const from = qs(ctx, "detected_from");
  const to = qs(ctx, "detected_to");
  const sort = qs(ctx, "sort") ?? "score";

  let rows = f5().networks.filter((network) => {
    // Low-band networks stay behind the explicit toggle (PRD 10.6.3 rule 2).
    if (!showLow && network.confidence_band === "low") return false;
    if (status && status !== "all" && network.review_status !== status) return false;
    if (bands.length && !bands.includes(network.confidence_band ?? "")) return false;
    if (
      topicIds.length &&
      !network.linked_claims.some((c) => topicIds.includes(c.topic?.id ?? ""))
    ) {
      return false;
    }
    if (
      claimIds.length &&
      !network.linked_claims.some((c) => claimIds.includes(c.claim_id))
    ) {
      return false;
    }
    if (from && (network.detected_at ?? "") < from) return false;
    if (to && (network.detected_at ?? "") > `${to}T23:59:59Z`) return false;
    if (search) {
      const haystack = [
        network.label ?? "",
        network.primary_claim?.claim_statement ?? "",
        ...accountsFor(network).map((a) => a.handle ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  rows = [...rows].sort((a, b) => {
    switch (sort) {
      case "detected_at":
        return (b.detected_at ?? "").localeCompare(a.detected_at ?? "");
      case "accounts":
        return (b.account_count ?? 0) - (a.account_count ?? 0);
      case "posts":
        return (b.post_count ?? 0) - (a.post_count ?? 0);
      case "recurrences":
        return (b.recurrence?.count ?? 0) - (a.recurrence?.count ?? 0);
      default:
        return (b.coordination_score ?? 0) - (a.coordination_score ?? 0);
    }
  });

  // Counts are over every network the toggle permits, not the current page.
  const statusCounts: Record<string, number> = {};
  for (const network of f5().networks) {
    if (!showLow && network.confidence_band === "low") continue;
    const key = network.review_status ?? "unreviewed";
    statusCounts[key] = (statusCounts[key] ?? 0) + 1;
  }

  const { items, meta } = paginate(rows, ctx);
  return ok(
    {
      networks: items,
      status_counts: statusCounts,
      low_confidence_shown: showLow,
      applied_sort: sort,
    },
    "coordinated networks",
    meta,
  );
};

const getNetwork: Handler = async (ctx) => {
  await sleep(200);
  const network = findNetwork(String(ctx.params.id));
  const detail: NetworkDetailDto = {
    ...network,
    run: runContext(network.run_id),
    why_flagged: network.why_flagged,
    linked_claims: network.linked_claims,
    linked_policies: [],
    review: network.review,
    disclaimer: MOCK_DISCLAIMER,
    export: exportEligibility(network),
  };
  return ok(detail, "coordinated network detail");
};

const updateNetworkStatus: Handler = async (ctx) => {
  await sleep(200);
  const network = findNetwork(String(ctx.params.id));
  const { status, reason } = body<{ status: string; reason: string }>(ctx);

  if (!status || !EXPORTABLE.concat(["unreviewed", "dismissed_false_positive"]).includes(status)) {
    fail("status is not one of the allowed review statuses", 400, "VALIDATION_FAILED");
  }
  // US52's hard requirement — unlike F1's optional claim review note.
  if (!reason || reason.trim().length < 20) {
    fail("reason must be at least 20 characters", 400, "VALIDATION_FAILED");
  }

  const from = network.review_status ?? "unreviewed";
  const now = new Date().toISOString();
  network.review_status = status;
  network.review = {
    status,
    reason,
    reviewed_by: "d0000000-0000-0000-0000-000000000001",
    reviewed_at: now,
  };
  // The signal profile is copied in at write time: a re-run recomputes the
  // live scores, and an aggregate built on drifting profiles cannot answer
  // which signal is systematically over-triggering.
  const profile: Record<string, number> = {};
  for (const s of network.why_flagged.signals ?? []) {
    profile[s.code ?? ""] = s.score ?? 0;
  }
  network.review_log.unshift({
    id: `log_${Date.now()}`,
    from_status: from,
    to_status: status,
    reason,
    user_id: "d0000000-0000-0000-0000-000000000001",
    created_at: now,
    signal_profile: profile,
  });

  if (status === "dismissed_false_positive") {
    f5().dismissals.unshift({
      id: `dis_${Date.now()}`,
      network_id: network.id,
      network_label: network.label,
      reason,
      user_id: "d0000000-0000-0000-0000-000000000001",
      created_at: now,
      signal_profile: profile,
    });
  }

  return ok(
    {
      network_id: network.id,
      from_status: from,
      status,
      reason,
      reviewed_at: now,
      reviewed_by: "d0000000-0000-0000-0000-000000000001",
    },
    "network review status updated",
  );
};

const networkReviewLog: Handler = async (ctx) => {
  await sleep(140);
  return ok(findNetwork(String(ctx.params.id)).review_log, "network review log");
};

const networkGraph: Handler = async (ctx) => {
  await sleep(260);
  return ok(graphFor(findNetwork(String(ctx.params.id))), "network graph");
};

const networkTimeline: Handler = async (ctx) => {
  await sleep(200);
  findNetwork(String(ctx.params.id));
  return ok(timelineFor(), "network burst timeline");
};

const networkContent: Handler = async (ctx) => {
  await sleep(220);
  return ok(contentFor(findNetwork(String(ctx.params.id))), "representative content");
};

const networkAccounts: Handler = async (ctx) => {
  await sleep(200);
  const network = findNetwork(String(ctx.params.id));
  const search = qs(ctx, "q")?.toLowerCase();
  const role = qs(ctx, "role");
  const sort = qs(ctx, "sort") ?? "centrality";

  let rows = accountsFor(network).filter((row) => {
    if (role && row.role !== role) return false;
    if (search && !(row.handle ?? "").toLowerCase().includes(search)) return false;
    return true;
  });

  rows = [...rows].sort((a, b) => {
    switch (sort) {
      case "handle":
        return (a.handle ?? "").localeCompare(b.handle ?? "");
      case "posts_in_cluster":
        return (b.posts_in_cluster ?? 0) - (a.posts_in_cluster ?? 0);
      case "duplication_rate":
        return (b.duplication_rate ?? 0) - (a.duplication_rate ?? 0);
      case "created_at_platform":
        return (a.created_at_platform ?? "").localeCompare(
          b.created_at_platform ?? "",
        );
      case "circadian_coverage":
        return (b.circadian_coverage ?? 0) - (a.circadian_coverage ?? 0);
      case "median_interpost":
        return (
          (a.median_interpost_interval_seconds ?? Number.MAX_SAFE_INTEGER) -
          (b.median_interpost_interval_seconds ?? Number.MAX_SAFE_INTEGER)
        );
      default:
        return (b.degree_centrality ?? 0) - (a.degree_centrality ?? 0);
    }
  });

  const { items, meta } = paginate(rows, ctx, 25);
  return ok(items, "network accounts", meta);
};

const networkAccount: Handler = async (ctx) => {
  await sleep(180);
  const network = findNetwork(String(ctx.params.id));
  const accountId = String(ctx.params.accountId);
  const account = accountsFor(network).find((a) => a.account_id === accountId);
  if (!account) fail("account not found in this network", 404, "NOT_FOUND");

  const graph = graphFor(network);
  const edges = graph.edges.filter(
    (e) => e.source === accountId || e.target === accountId,
  );
  const posts = contentFor(network)
    .groups!.flatMap((g) => g.variants ?? [])
    .filter((p) => p.account_id === accountId);

  return ok(
    {
      account,
      posts,
      connecting_edges: edges,
      // The sentence that makes "no account without a viewable reason" true.
      explanation: `${account.handle} was placed in this network by ${edges.length} retained behavioural edges, each of which cleared the multi-signal threshold. Its ${account.posts_in_cluster} posts in the cluster have a duplication rate of ${account.duplication_rate?.toFixed(2)}. These are measured behaviours; they do not establish that the account is automated or inauthentic.`,
    },
    "account detail",
  );
};

/* ------------------------- allowlisting from F5 ------------------------- */

function allowlistAccounts(handles: { handle: string; platform: string; id: string }[], category: string, reason: string) {
  const now = new Date().toISOString();
  for (const entry of handles) {
    f5().allowlist.unshift({
      id: `al_${entry.id}`,
      platform: entry.platform,
      platform_account_id: entry.id,
      handle: entry.handle,
      category,
      reason,
      added_by: "d0000000-0000-0000-0000-000000000001",
      added_at: now,
      active: true,
    });
  }
}

const allowlistNetwork: Handler = async (ctx) => {
  await sleep(300);
  const network = findNetwork(String(ctx.params.id));
  const { category, reason } = body<{ category: string; reason: string }>(ctx);
  if (!category) fail("category is required", 400, "VALIDATION_FAILED");
  if (!reason || reason.trim().length < 10) {
    fail("reason must be at least 10 characters", 400, "VALIDATION_FAILED");
  }

  const members = accountsFor(network).filter((a) => a.role === "member");
  allowlistAccounts(
    members.map((m) => ({
      handle: m.handle ?? "",
      platform: m.platform ?? "x",
      id: m.platform_account_id ?? m.account_id,
    })),
    category,
    reason,
  );

  return ok(
    {
      accounts_added: members.length,
      networks_affected: 1,
      handles: members.map((m) => m.handle),
      exported_reports_affected: network.reports.length ? [network.id] : [],
      note:
        network.reports.length > 0
          ? "A report citing these accounts has already been generated and cannot be recalled."
          : undefined,
    },
    "accounts allowlisted",
  );
};

const allowlistAccount: Handler = async (ctx) => {
  await sleep(240);
  const network = findNetwork(String(ctx.params.id));
  const accountId = String(ctx.params.accountId);
  const account = accountsFor(network).find((a) => a.account_id === accountId);
  if (!account) fail("account not found in this network", 404, "NOT_FOUND");
  const { category, reason } = body<{ category: string; reason: string }>(ctx);
  if (!reason || reason.trim().length < 10) {
    fail("reason must be at least 10 characters", 400, "VALIDATION_FAILED");
  }

  allowlistAccounts(
    [
      {
        handle: account.handle ?? "",
        platform: account.platform ?? "x",
        id: account.platform_account_id ?? account.account_id,
      },
    ],
    category ?? "other",
    reason,
  );

  return ok(
    {
      accounts_added: 1,
      networks_affected: 1,
      handles: [account.handle],
      exported_reports_affected: [],
    },
    "account allowlisted",
  );
};

/* -------------------------------- reports ------------------------------- */

function makeReport(
  network: MockNetwork,
  reportType: string,
  sections: Record<string, boolean>,
  redact: boolean,
): ReportViewDto {
  const now = new Date();
  const stamp = now.toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return {
    id: `rep_${Date.now()}`,
    network_id: network.id,
    run_id: network.run_id,
    report_type: reportType,
    file_name: `CIS_CoordinatedNetworkReport_${network.id.slice(-8)}_${stamp}.pdf`,
    file_sha256: `${network.id.slice(-8)}${stamp}`.padEnd(64, "0"),
    file_size_bytes: 482_000,
    sections: {
      graph: sections.graph ?? true,
      content_clusters: sections.content_clusters ?? true,
      // Mandatory in a platform referral and not toggleable.
      account_annex:
        reportType === "platform_referral" ? true : (sections.account_annex ?? true),
      methodology: sections.methodology ?? true,
    },
    redact_analyst_names: redact,
    snapshot_id: `snap_${network.id.slice(-6)}`,
    snapshot_sha256: `snap${network.id.slice(-6)}`.padEnd(64, "0"),
    audit_id: `aud_${Date.now()}`,
    generated_by: "d0000000-0000-0000-0000-000000000001",
    generated_at: now.toISOString(),
    download_url: `/api/v1/reports/rep_${Date.now()}/file`,
  };
}

const generateReport: Handler = async (ctx) => {
  await sleep(900);
  const network = findNetwork(String(ctx.params.id));
  const gate = exportEligibility(network);
  // Gate first, then the audit row, then the document — the same order the
  // server uses, because the audit id is printed inside the PDF.
  if (!gate.allowed) fail(gate.reason as string, 422, "UNPROCESSABLE_ENTITY");

  const payload = body<{
    report_type: string;
    include_graph?: boolean;
    include_content_clusters?: boolean;
    include_account_annex?: boolean;
    include_methodology?: boolean;
    redact_analyst_names?: boolean;
  }>(ctx);

  const report = makeReport(
    network,
    payload.report_type ?? "platform_referral",
    {
      graph: payload.include_graph ?? true,
      content_clusters: payload.include_content_clusters ?? true,
      account_annex: payload.include_account_annex ?? true,
      methodology: payload.include_methodology ?? true,
    },
    payload.redact_analyst_names ?? false,
  );

  network.reports.unshift(report);
  f5().audit.unshift({
    id: report.audit_id as string,
    object_type: "report",
    object_id: report.id,
    network_id: network.id,
    run_id: network.run_id,
    export_type: report.report_type,
    user_id: "d0000000-0000-0000-0000-000000000001",
    user_name: "Mock Analyst",
    settings: { sections: report.sections, redact: report.redact_analyst_names },
    created_at: report.generated_at,
  });

  return ok(report, "report generated");
};

const evidenceBundle: Handler = async (ctx) => {
  await sleep(1100);
  const network = findNetwork(String(ctx.params.id));
  const gate = exportEligibility(network);
  if (!gate.allowed) fail(gate.reason as string, 422, "UNPROCESSABLE_ENTITY");

  const report = makeReport(network, "evidence_bundle", {}, false);
  report.file_name = (report.file_name ?? "").replace(/\.pdf$/, ".zip");
  network.reports.unshift(report);
  f5().audit.unshift({
    id: report.audit_id as string,
    object_type: "evidence_bundle",
    object_id: report.id,
    network_id: network.id,
    run_id: network.run_id,
    export_type: "evidence_bundle",
    user_id: "d0000000-0000-0000-0000-000000000001",
    user_name: "Mock Analyst",
    created_at: report.generated_at,
  });
  return ok(report, "evidence bundle generated");
};

const listReports: Handler = async (ctx) => {
  await sleep(140);
  return ok(findNetwork(String(ctx.params.id)).reports, "network reports");
};

/* ---------------------------- detection runs ---------------------------- */

const listRuns: Handler = async (ctx) => {
  await sleep(180);
  const status = qs(ctx, "status");
  const trigger = qs(ctx, "trigger");
  const truncated = qs(ctx, "truncated");
  const rows = MOCK_RUNS.filter((run) => {
    if (status && run.status !== status) return false;
    if (trigger && run.trigger_source !== trigger) return false;
    if (truncated === "true" && !run.truncated) return false;
    return true;
  });
  const { items, meta } = paginate(rows, ctx, 10);
  return ok(items, "detection runs", meta);
};

const getRun: Handler = async (ctx) => {
  await sleep(140);
  const run = MOCK_RUNS.find((r) => r.run_id === String(ctx.params.id));
  if (!run) fail("detection run not found", 404, "NOT_FOUND");
  return ok(run, "detection run");
};

const triggerRun: Handler = async (ctx) => {
  await sleep(400);
  const { claim_ids } = body<{ claim_ids: string[] }>(ctx);
  if (!claim_ids?.length) {
    fail("claim_ids must contain at least one claim", 400, "VALIDATION_FAILED");
  }
  return ok(
    {
      run_id: null,
      status: "queued",
      claim_ids,
      message:
        "Detection run queued. Results appear once the pipeline completes — runs are scheduled rather than real-time.",
    },
    "detection run queued",
  );
};

/* ------------------------------ governance ------------------------------ */

const offtopicClusters: Handler = async (ctx) => {
  await sleep(180);
  const failedTest = qs(ctx, "failed_test");
  const runId = qs(ctx, "run_id");
  const rows = f5().offtopic.filter((cluster) => {
    if (failedTest && cluster.failed_test !== failedTest) return false;
    if (runId && cluster.run_id !== runId) return false;
    return true;
  });
  const { items, meta } = paginate(rows, ctx, 10);
  return ok(items, "off-topic clusters", meta);
};

const offtopicRates: Handler = async () => {
  await sleep(160);
  return ok(
    MOCK_RUNS.map((run) => {
      const surfaced = run.network_count ?? 0;
      const offtopic = run.offtopic_count ?? 0;
      const total = surfaced + offtopic;
      return {
        run_id: run.run_id,
        started_at: run.started_at,
        surfaced_count: surfaced,
        offtopic_count: offtopic,
        rate: total === 0 ? 0 : Math.round((offtopic / total) * 100) / 100,
        failed_tests: ["anchoring", "evidence_volume", "link_strength"],
      };
    }),
    "off-topic rates",
  );
};

const dismissals: Handler = async (ctx) => {
  await sleep(160);
  const { items, meta } = paginate(f5().dismissals, ctx, 10);
  return ok(items, "dismissals", meta);
};

const dismissalSummary: Handler = async (ctx) => {
  await sleep(180);
  const windowDays = qsNum(ctx, "window_days", 90);
  const networks = f5().networks;
  const confirmed = networks.filter((n) => n.review_status === "confirmed").length;
  const actionTaken = networks.filter(
    (n) => n.review_status === "action_taken",
  ).length;
  const dismissed = networks.filter(
    (n) => n.review_status === "dismissed_false_positive",
  ).length;
  const total = confirmed + actionTaken + dismissed;

  // Precision stays null until there is a sample — never rendered as 0%.
  const precision =
    total === 0 ? null : Math.round(((confirmed + actionTaken) / total) * 100) / 100;

  const profiles = f5().dismissals.map((d) => d.signal_profile ?? {});
  const means: Record<string, number> = {};
  for (const code of ["SY", "DU", "CO", "PR", "AU"]) {
    const values = profiles
      .map((p) => (p as Record<string, number>)[code])
      .filter((v): v is number => typeof v === "number");
    if (values.length) {
      means[code] =
        Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
    }
  }

  return ok(
    {
      window_days: windowDays,
      confirmed,
      action_taken: actionTaken,
      dismissed,
      precision,
      precision_target: 0.85,
      meets_target: precision === null ? null : precision >= 0.85,
      mean_signal_scores: means,
      sample_size: f5().dismissals.length,
      note:
        f5().dismissals.length < 10
          ? "Sample is small; treat the mean signal scores as indicative rather than conclusive."
          : undefined,
    },
    "dismissal summary",
  );
};

const exportAudit: Handler = async (ctx) => {
  await sleep(160);
  const networkId = qs(ctx, "network_id");
  const rows = f5().audit.filter(
    (entry) => !networkId || entry.network_id === networkId,
  );
  const { items, meta } = paginate(rows, ctx, 10);
  return ok(items, "export audit log", meta);
};

/* ------------------------------- allowlist ------------------------------ */

const listAllowlist: Handler = async (ctx) => {
  await sleep(170);
  const search = qs(ctx, "q")?.toLowerCase();
  const category = qs(ctx, "category");
  const includeRemoved = qsBool(ctx, "include_removed");
  const rows = f5().allowlist.filter((entry) => {
    if (!includeRemoved && entry.active === false) return false;
    if (category && entry.category !== category) return false;
    if (search && !(entry.handle ?? "").toLowerCase().includes(search)) return false;
    return true;
  });
  const { items, meta } = paginate(rows, ctx);
  return ok(items, "declared-coordination allowlist", meta);
};

const allowlistCategories: Handler = async () => {
  await sleep(120);
  const counts: Record<string, number> = {};
  for (const entry of f5().allowlist) {
    if (entry.active === false) continue;
    counts[entry.category ?? "other"] = (counts[entry.category ?? "other"] ?? 0) + 1;
  }
  return ok(counts, "allowlist entries per category");
};

const createAllowlistEntry: Handler = async (ctx) => {
  await sleep(220);
  const payload = body<{
    platform: string;
    platform_account_id: string;
    handle: string;
    category: string;
    reason: string;
  }>(ctx);
  if (!payload.platform || !payload.platform_account_id || !payload.handle) {
    fail("platform, platform_account_id and handle are required", 400, "VALIDATION_FAILED");
  }
  if (!payload.reason || payload.reason.trim().length < 10) {
    fail("reason must be at least 10 characters", 400, "VALIDATION_FAILED");
  }
  const entry: AllowlistEntryDto = {
    id: `al_${Date.now()}`,
    platform: payload.platform,
    platform_account_id: payload.platform_account_id,
    handle: payload.handle,
    category: payload.category ?? "other",
    reason: payload.reason,
    added_by: "d0000000-0000-0000-0000-000000000001",
    added_at: new Date().toISOString(),
    active: true,
  };
  f5().allowlist.unshift(entry);
  return ok(entry, "allowlist entry created");
};

const updateAllowlistEntry: Handler = async (ctx) => {
  await sleep(180);
  const entry = f5().allowlist.find((e) => e.id === String(ctx.params.id));
  if (!entry) fail("allowlist entry not found", 404, "NOT_FOUND");
  const payload = body<{ category?: string; reason?: string }>(ctx);
  if (payload.category) entry.category = payload.category;
  if (payload.reason) entry.reason = payload.reason;
  return ok(entry, "allowlist entry updated");
};

const removeAllowlistEntry: Handler = async (ctx) => {
  await sleep(200);
  const entry = f5().allowlist.find((e) => e.id === String(ctx.params.id));
  if (!entry) fail("allowlist entry not found", 404, "NOT_FOUND");
  const { reason } = body<{ reason: string }>(ctx);
  if (!reason || reason.trim().length < 10) {
    fail("a removal reason of at least 10 characters is required", 400, "VALIDATION_FAILED");
  }
  entry.active = false;
  entry.removed_at = new Date().toISOString();
  entry.removed_by = "d0000000-0000-0000-0000-000000000001";
  // Stored separately: overwriting `reason` would destroy why it existed.
  entry.removal_reason = reason;
  return ok(entry, "allowlist entry removed");
};

const listPhrases: Handler = async (ctx) => {
  await sleep(140);
  const search = qs(ctx, "q")?.toLowerCase();
  const rows = f5().phrases.filter(
    (p) => !search || (p.phrase ?? "").toLowerCase().includes(search),
  );
  const { items, meta } = paginate(rows, ctx);
  return ok(items, "common-phrase allowlist", meta);
};

const createPhrase: Handler = async (ctx) => {
  await sleep(180);
  const payload = body<{ phrase: string; category: string; notes?: string }>(ctx);
  if (!payload.phrase || payload.phrase.trim().length < 3) {
    fail("phrase must be at least 3 characters", 400, "VALIDATION_FAILED");
  }
  const phrase = {
    id: `ph_${Date.now()}`,
    phrase: payload.phrase,
    category: payload.category ?? "other",
    notes: payload.notes ?? null,
    created_at: new Date().toISOString(),
  };
  f5().phrases.unshift(phrase);
  return ok(phrase, "common phrase created");
};

const deletePhrase: Handler = async (ctx) => {
  await sleep(160);
  const s = f5();
  s.phrases = s.phrases.filter((p) => p.id !== String(ctx.params.id));
  return ok(null, "common phrase removed");
};

/* -------------------------- detector settings --------------------------- */

const getDetectorSettings: Handler = async () => {
  await sleep(160);
  return ok(f5().settings, "detector settings");
};

const updateDetectorSettings: Handler = async (ctx) => {
  await sleep(240);
  const s = f5();
  const patch = body<Record<string, number | boolean>>(ctx) as Record<
    string,
    number | boolean
  >;
  const merged = { ...s.settings, ...patch } as Record<string, unknown>;

  // The two cross-field constraints, validated on the merged row exactly as
  // the server does — a change that invalidates a *stored* sibling must fail.
  const betaSum =
    Number(merged.beta_time) +
    Number(merged.beta_text) +
    Number(merged.beta_amp) +
    Number(merged.beta_meta) +
    Number(merged.beta_struct);
  if (Math.abs(betaSum - 1) > 0.001) {
    fail(
      `the five signal fusion weights must sum to 1.00; they currently sum to ${betaSum.toFixed(3)}`,
      422,
      "UNPROCESSABLE_ENTITY",
    );
  }
  const maxCadence = (Number(merged.window_days) * 24) / 2;
  if (Number(merged.cadence_hours) > maxCadence) {
    fail(
      `consecutive runs must overlap by 50% of the window (PRD 10.5.1), so the cadence may not exceed ${maxCadence} hours for a ${merged.window_days}-day window`,
      422,
      "UNPROCESSABLE_ENTITY",
    );
  }

  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(patch)) {
    const before = (s.settings as Record<string, unknown>)[key];
    if (before === value) continue;
    s.history.unshift({
      id: `hist_${Date.now()}_${key}`,
      key,
      from_value: before === undefined ? null : String(before),
      to_value: String(value),
      changed_by: "d0000000-0000-0000-0000-000000000001",
      created_at: now,
    });
  }
  s.settings = { ...s.settings, ...patch, updated_at: now };
  return ok(s.settings, "detector settings updated");
};

const detectorRanges: Handler = async () => {
  await sleep(120);
  // PRD 10.11's Default Parameter Reference, served rather than hardcoded in
  // the client so the form and the validator cannot disagree.
  return ok(
    [
      { key: "window_days", label: "Detection window", symbol: "W", min: 1, max: 30, default: 7, unit: "days", integer: true },
      { key: "bin_width_seconds", label: "Time bin width", symbol: "δ", min: 10, max: 300, default: 60, unit: "seconds", integer: true },
      { key: "null_model_alpha", label: "Null-model significance", symbol: "α", min: 0.001, max: 0.05, default: 0.01, integer: false },
      { key: "dup_threshold", label: "Near-duplicate threshold", symbol: "τ_dup", min: 0.7, max: 0.95, default: 0.8, integer: false },
      { key: "sem_threshold", label: "Semantic paraphrase threshold", symbol: "τ_sem", min: 0.8, max: 0.98, default: 0.9, integer: false, note: "Validate separately on Bahasa Indonesia and code-mixed text before launch." },
      { key: "min_post_length", label: "Minimum post length", symbol: "L_min", min: 10, max: 100, default: 25, unit: "characters", integer: true },
      { key: "edge_threshold", label: "Edge weight threshold", symbol: "θ_edge", min: 0.2, max: 0.7, default: 0.35, integer: false },
      { key: "min_signal_families", label: "Minimum signal families per edge", min: 2, max: 3, default: 2, integer: true, note: "Never 1: synchrony alone is a timezone, duplication alone is a hashtag." },
      { key: "k_core", label: "k-core", symbol: "k", min: 2, max: 5, default: 3, integer: true },
      { key: "leiden_resolution", label: "Leiden resolution", symbol: "γ_res", min: 0.5, max: 2, default: 1, integer: false },
      { key: "min_cluster_size", label: "Minimum cluster size", symbol: "N_min", min: 4, max: 20, default: 5, integer: true },
      { key: "min_internal_density", label: "Minimum internal density", symbol: "ρ_min", min: 0.1, max: 0.6, default: 0.3, integer: false },
      { key: "beta_time", label: "Weight — timing", symbol: "β_time", min: 0, max: 1, default: 0.3, integer: false },
      { key: "beta_text", label: "Weight — text", symbol: "β_text", min: 0, max: 1, default: 0.25, integer: false },
      { key: "beta_amp", label: "Weight — amplification", symbol: "β_amp", min: 0, max: 1, default: 0.2, integer: false },
      { key: "beta_meta", label: "Weight — metadata", symbol: "β_meta", min: 0, max: 1, default: 0.15, integer: false },
      { key: "beta_struct", label: "Weight — structure", symbol: "β_struct", min: 0, max: 1, default: 0.1, integer: false },
      { key: "provenance_half_life_hours", label: "Provenance half-life", min: 12, max: 336, default: 72, unit: "hours", integer: true },
      { key: "anchor_share", label: "Member anchoring share", symbol: "μ_anchor", min: 0.3, max: 0.9, default: 0.6, integer: false },
      { key: "min_claim_posts", label: "Minimum claim-cluster posts", symbol: "P_min", min: 10, max: 500, default: 50, integer: true },
      { key: "min_link_strength", label: "Minimum link strength", symbol: "ω_min", min: 0.1, max: 0.8, default: 0.4, integer: false },
      { key: "high_score_cutoff", label: "High band score cutoff", min: 50, max: 95, default: 70, integer: false },
      { key: "high_breadth_cutoff", label: "High band breadth cutoff", min: 2, max: 5, default: 3, integer: true },
      { key: "medium_score_cutoff", label: "Medium band score cutoff", min: 30, max: 80, default: 55, integer: false },
      { key: "medium_breadth_cutoff", label: "Medium band breadth cutoff", min: 1, max: 4, default: 2, integer: true },
      { key: "cadence_hours", label: "Scheduled run cadence", min: 1, max: 24, default: 6, unit: "hours", integer: true },
      { key: "candidate_cap", label: "Candidate cap", symbol: "A_max", min: 500, max: 50000, default: 5000, integer: true },
      { key: "recurrence_threshold", label: "Recurrence overlap threshold", min: 0.3, max: 0.9, default: 0.6, integer: false },
      { key: "velocity_trigger_threshold", label: "Velocity trigger threshold", min: 1, max: 10, default: 2.5, integer: false },
    ],
    "detector parameter ranges (PRD 10.11)",
  );
};

const detectorHistory: Handler = async () => {
  await sleep(140);
  return ok(f5().history, "detector setting history");
};

const cityTimezone: Handler = async () => {
  await sleep(110);
  return ok({ timezone: f5().cityTimezone }, "city timezone");
};

const setCityTimezone: Handler = async (ctx) => {
  await sleep(160);
  const { timezone } = body<{ timezone: string }>(ctx);
  if (!timezone || !timezone.includes("/")) {
    fail("timezone must be a valid IANA zone name, e.g. Asia/Jakarta", 422, "UNPROCESSABLE_ENTITY");
  }
  f5().cityTimezone = timezone;
  return ok({ timezone }, "city timezone updated");
};

/* ------------------------------- registry ------------------------------- */

export const networkMockHandlers: Record<string, Handler> = {
  "GET /networks": listNetworks,
  "GET /networks/:id": getNetwork,
  "PUT /networks/:id/status": updateNetworkStatus,
  "GET /networks/:id/review-log": networkReviewLog,
  "GET /networks/:id/graph": networkGraph,
  "GET /networks/:id/timeline": networkTimeline,
  "GET /networks/:id/content": networkContent,
  "GET /networks/:id/accounts": networkAccounts,
  "GET /networks/:id/accounts/:accountId": networkAccount,
  "POST /networks/:id/allowlist": allowlistNetwork,
  "POST /networks/:id/accounts/:accountId/allowlist": allowlistAccount,
  "POST /networks/:id/reports": generateReport,
  "GET /networks/:id/reports": listReports,
  "POST /networks/:id/evidence-bundle": evidenceBundle,

  "GET /detection-runs": listRuns,
  "GET /detection-runs/:id": getRun,
  "POST /admin/detection-runs": triggerRun,

  "GET /admin/offtopic-clusters": offtopicClusters,
  "GET /admin/offtopic-clusters/rates": offtopicRates,
  "GET /admin/dismissals": dismissals,
  "GET /admin/dismissals/summary": dismissalSummary,
  "GET /admin/export-audit": exportAudit,

  "GET /admin/allowlist": listAllowlist,
  "GET /admin/allowlist/categories": allowlistCategories,
  "POST /admin/allowlist": createAllowlistEntry,
  "PATCH /admin/allowlist/:id": updateAllowlistEntry,
  "DELETE /admin/allowlist/:id": removeAllowlistEntry,
  "GET /admin/common-phrases": listPhrases,
  "POST /admin/common-phrases": createPhrase,
  "DELETE /admin/common-phrases/:id": deletePhrase,

  "GET /settings/detector": getDetectorSettings,
  "PUT /settings/detector": updateDetectorSettings,
  "GET /settings/detector/ranges": detectorRanges,
  "GET /settings/detector/history": detectorHistory,
  "GET /settings/city-timezone": cityTimezone,
  "PUT /settings/city-timezone": setCityTimezone,
};

/**
 * The US61 badge, resolved for a claim id.
 *
 * Mirrors the backend's fail-closed conjunction: a linked network that passed
 * the relevance gate, banded medium or high, not dismissed as a false positive,
 * and not suppressed. Returns `undefined` — not null — when nothing qualifies,
 * because the field is omitted rather than emptied.
 */
export function networkBadgeFor(claimId: string) {
  const qualifying = f5()
    .networks.filter(
      (network) =>
        network.linked_claims.some(
          (c) => c.claim_id === claimId && c.passed_relevance_gate,
        ) &&
        ["medium", "high"].includes(network.confidence_band ?? "") &&
        network.review_status !== "dismissed_false_positive",
    )
    .sort((a, b) => (b.coordination_score ?? 0) - (a.coordination_score ?? 0));

  const top = qualifying[0];
  if (!top) return undefined;

  return {
    network_id: top.id,
    label: top.label,
    coordination_score: top.coordination_score,
    confidence_band: top.confidence_band,
    review_status: top.review_status,
    account_count: top.account_count,
    other_count: qualifying.length - 1,
    detail_url: `/api/v1/networks/${top.id}`,
  };
}
