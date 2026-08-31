import { ApiError } from "@/types/common";
import { getToken } from "@/lib/auth/token";
import { sleep } from "@/lib/utils";
import {
  computeClaimScore,
  computeDiscountFactor,
  computeFinalClaimScore,
  computeHarm,
} from "@/lib/scoring";
import type {
  ClaimDto,
  ClaimPolicyRefDto,
  ScorePointDto,
  StatementDto,
  WatchlistItemDto,
} from "../dto";
import { ALERT_THRESHOLD_KEY, CLAIMS_LAST_FETCHED_KEY } from "../settings";
import {
  createGeneratedClaim,
  createPredictedClaim,
  historyFor,
  MOCK_NOW,
  type MockClaim,
  type MockPolicy,
  type Snapshot,
} from "./data";
import {
  getSetting,
  getState,
  saveState,
  setSetting,
  type MockState,
} from "./store";
import { networkBadgeFor, networkMockHandlers } from "./networkHandlers";

export interface MockContext {
  method: string;
  params: Record<string, string | number>;
  query: Record<string, unknown>;
  body: unknown;
  form?: FormData;
}

type MockHandler = (ctx: MockContext) => Promise<unknown>;

const LATENCY = 220;

/* ------------------------------- envelope ------------------------------- */

function ok<T>(data: T, message: string, meta?: unknown) {
  return meta ? { success: true, message, data, meta } : { success: true, message, data };
}

function fail(message: string, status: number, code: string): never {
  throw new ApiError(message, status, code);
}

/* -------------------------------- helpers ------------------------------- */

function qs(ctx: MockContext, key: string): string | undefined {
  const value = ctx.query[key];
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function qsList(ctx: MockContext, key: string): string[] {
  const value = ctx.query[key];
  if (Array.isArray(value)) return value.map(String);
  const raw = qs(ctx, key);
  return raw ? raw.split(",").map((v) => v.trim()).filter(Boolean) : [];
}

function qsNum(ctx: MockContext, key: string, fallback: number): number {
  const raw = qs(ctx, key);
  const n = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Backend behaviour: out-of-range paging is clamped, never rejected. */
function paginate<T>(rows: T[], ctx: MockContext) {
  const limit = Math.min(Math.max(Math.trunc(qsNum(ctx, "limit", 20)), 1), 200);
  const page = Math.max(Math.trunc(qsNum(ctx, "page", 1)), 1);
  const total = rows.length;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const start = (page - 1) * limit;
  return {
    items: rows.slice(start, start + limit),
    meta: { page, limit, total, total_pages: totalPages },
  };
}

function body<T extends object>(ctx: MockContext): Partial<T> {
  return (ctx.body ?? {}) as Partial<T>;
}

function threshold(s: MockState): number {
  const raw = getSetting(s, ALERT_THRESHOLD_KEY)?.value;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 70;
}

function isWatched(s: MockState, claimId: string): boolean {
  return s.watchlist.some((w) => w.claim_id === claimId);
}

/** List-row DTO. A Non-Existing claim carries no score, counts or bell state. */
function summaryOf(s: MockState, claim: MockClaim): ClaimDto {
  const base: ClaimDto = {
    id: claim.id,
    claim_type: claim.claim_type,
    claim_statement: claim.claim_statement,
    topic: claim.topic,
    review_status: claim.review_status,
    created_at: claim.created_at,
  };
  if (claim.claim_type !== "existing") return base;
  return {
    ...base,
    // Only an Existing claim was "caught in the wild".
    first_caught_at: claim.first_caught_at,
    // US61. Omitted, not null, when nothing qualifies — there is no empty
    // state, and PRD 10.3 puts Synthetic claims out of detection scope.
    coordinated_network: networkBadgeFor(claim.id),
    final_claim_score: claim.score_breakdown?.final_claim_score ?? null,
    is_dormant: claim.is_dormant ?? false,
    is_on_alert: isWatched(s, claim.id),
    positive_statement_count: claim.positive_statement_count ?? 0,
    negative_statement_count: claim.negative_statement_count ?? 0,
  };
}

function policyRefsFor(s: MockState, claim: MockClaim): ClaimPolicyRefDto[] {
  return claim.policy_ids
    .map((pid) => s.policies.find((p) => p.id === pid))
    .filter((p): p is MockPolicy => Boolean(p))
    .map((p) => ({
      id: p.id,
      name: p.name,
      source: "cis",
      status: p.status,
      rolled_out_date: p.rolled_out_date,
      has_document: Boolean(p.file_name),
    }));
}

function detailOf(s: MockState, claim: MockClaim) {
  const summary = summaryOf(s, claim);
  const detail: Record<string, unknown> = {
    ...summary,
    updated_at: claim.created_at,
    // A single overlay row per claim — the most recent status call only.
    review: s.reviews[claim.id] ?? null,
    activity: claim.activity,
    policies: policyRefsFor(s, claim),
  };
  if (claim.claim_type === "existing") {
    detail.score_breakdown = claim.score_breakdown;
    detail.top_accounts = claim.top_accounts;
  }
  return detail;
}

function findClaim(s: MockState, id: string): MockClaim {
  const claim = s.claims.find((c) => c.id === id);
  if (!claim) fail("claim not found", 404, "NOT_FOUND");
  return claim;
}

function findPolicy(s: MockState, id: string): MockPolicy {
  const policy = s.policies.find((p) => p.id === id);
  if (!policy) fail("policy not found", 404, "NOT_FOUND");
  return policy;
}

function matchesStatus(claim: MockClaim, status: string | undefined): boolean {
  return !status || status === "all" || claim.review_status === status;
}

function matchesTopics(claim: MockClaim, topicIds: string[]): boolean {
  return topicIds.length === 0 || topicIds.includes(claim.topic?.id ?? "");
}

function matchesSearch(text: string, q: string | undefined): boolean {
  return !q || text.toLowerCase().includes(q.toLowerCase());
}

/** Truncate a timestamp to the start of its bucket. */
function bucketStart(iso: string, granularity: string): string {
  const d = new Date(iso);
  d.setUTCHours(0, 0, 0, 0);
  if (granularity === "week") {
    // ISO weeks start Monday.
    const dow = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dow);
  } else if (granularity === "month") {
    d.setUTCDate(1);
  } else if (granularity === "year") {
    d.setUTCMonth(0, 1);
  }
  return d.toISOString();
}

/** Roll snapshots into buckets, averaging within each. */
function bucketPoints(
  snapshots: Snapshot[],
  granularity: string,
  from?: string,
  to?: string,
): ScorePointDto[] {
  const fromTs = from ? Date.parse(from) : Number.NEGATIVE_INFINITY;
  const toTs = to ? Date.parse(to) : Number.POSITIVE_INFINITY;
  const buckets = new Map<string, { final: number; claim: number; n: number }>();

  for (const snap of snapshots) {
    const ts = Date.parse(snap.captured_at);
    if (ts < fromTs || ts > toTs) continue;
    const key = bucketStart(snap.captured_at, granularity);
    const bucket = buckets.get(key) ?? { final: 0, claim: 0, n: 0 };
    bucket.final += snap.final_claim_score;
    bucket.claim += snap.claim_score;
    bucket.n += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => Date.parse(a) - Date.parse(b))
    .map(([key, b]) => ({
      bucket_start: key,
      final_claim_score: Math.round((b.final / b.n) * 10) / 10,
      claim_score: Math.round((b.claim / b.n) * 10) / 10,
      sample_count: b.n,
    }));
}

/* -------------------------------- auth ---------------------------------- */

function sessionFor(user: MockState["users"][number]) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      last_login_at: user.lastLoginAt,
      created_at: user.createdAt,
    },
    access_token: `mock.${btoa(user.email)}`,
    refresh_token: `mockr.${btoa(user.email)}`,
    token_type: "Bearer",
    expires_in: 86400,
  };
}

function emailFromToken(token: string | undefined): string | null {
  if (!token) return null;
  const prefix = token.startsWith("mockr.") ? 6 : token.startsWith("mock.") ? 5 : -1;
  if (prefix < 0) return null;
  try {
    return atob(token.slice(prefix));
  } catch {
    return null;
  }
}

const authRegister: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const { email, password, name } = body<{
    email: string;
    password: string;
    name: string;
  }>(ctx);
  if (!email || !password || !name) {
    fail("email, password and name are required", 400, "VALIDATION_FAILED");
  }
  if (password.length < 8) {
    fail("password must be 8-128 characters", 400, "VALIDATION_FAILED");
  }
  const s = getState();
  if (s.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    fail("email already registered", 409, "CONFLICT");
  }
  const user = {
    id: `21c4bbdd-0000-0000-0000-${String(s.users.length + 1).padStart(12, "0")}`,
    email,
    name,
    passwordHash: btoa(password),
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  s.users.push(user);
  saveState();
  return ok(sessionFor(user), "account created");
};

const authLogin: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const { email, password } = body<{ email: string; password: string }>(ctx);
  if (!email || !password) {
    fail("email and password are required", 400, "VALIDATION_FAILED");
  }
  const s = getState();
  const user = s.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  // A wrong password and an unknown email are deliberately indistinguishable.
  if (!user || user.passwordHash !== btoa(password)) {
    fail("invalid credentials", 401, "UNAUTHORIZED");
  }
  user.lastLoginAt = new Date().toISOString();
  saveState();
  return ok(sessionFor(user), "signed in");
};

const authRefresh: MockHandler = async (ctx) => {
  await sleep(120);
  const { refresh_token } = body<{ refresh_token: string }>(ctx);
  const email = emailFromToken(refresh_token);
  const s = getState();
  const user = email
    ? s.users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    : undefined;
  if (!user) fail("invalid refresh token", 401, "UNAUTHORIZED");
  return ok(sessionFor(user), "token refreshed");
};

const authMe: MockHandler = async () => {
  await sleep(80);
  const email = emailFromToken(getToken());
  if (!email) fail("not authenticated", 401, "UNAUTHORIZED");
  const s = getState();
  const user = s.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) fail("not authenticated", 401, "UNAUTHORIZED");
  return ok(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      last_login_at: user.lastLoginAt,
      created_at: user.createdAt,
    },
    "profile",
  );
};

const authLogout: MockHandler = async () => {
  await sleep(80);
  return ok(null, "signed out");
};

/* ------------------------------- topics --------------------------------- */

const listTopics: MockHandler = async () => {
  await sleep(120);
  const s = getState();
  return ok(
    [...s.topics].sort((a, b) => a.name.localeCompare(b.name)),
    "topics",
  );
};

const getTopic: MockHandler = async (ctx) => {
  await sleep(100);
  const s = getState();
  const topic = s.topics.find((t) => t.id === String(ctx.params.id));
  if (!topic) fail("topic not found", 404, "NOT_FOUND");
  return ok(topic, "topic");
};

/* ------------------------------- claims --------------------------------- */

const claimRepository: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const s = getState();
  const status = qs(ctx, "status") ?? "all";
  const topicIds = qsList(ctx, "topic_ids");
  // One `q` filters both sections — there is no per-section search parameter.
  const q = qs(ctx, "q");

  const pool = (type: MockClaim["claim_type"]) =>
    s.claims.filter(
      (c) =>
        c.claim_type === type &&
        matchesStatus(c, status) &&
        matchesTopics(c, topicIds) &&
        matchesSearch(c.claim_statement, q),
    );

  const existing = pool("existing").sort(
    (a, b) =>
      (b.score_breakdown?.final_claim_score ?? 0) -
      (a.score_breakdown?.final_claim_score ?? 0),
  );
  const nonExisting = pool("non_existing").sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );

  return ok(
    {
      last_fetched_at: getSetting(s, CLAIMS_LAST_FETCHED_KEY)?.value ?? null,
      applied_status: status,
      applied_topics: topicIds,
      existing: {
        section: "S1",
        claim_type: "existing",
        sorted_by: "final_claim_score DESC",
        total_in_pool: existing.length,
        claims: existing.slice(0, 10).map((c) => summaryOf(s, c)),
      },
      non_existing: {
        section: "S2",
        claim_type: "non_existing",
        sorted_by: "created_at DESC",
        total_in_pool: nonExisting.length,
        claims: nonExisting.slice(0, 10).map((c) => summaryOf(s, c)),
      },
    },
    "claim repository",
  );
};

const listClaims: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const s = getState();
  const type = qs(ctx, "type") ?? "all";
  const status = qs(ctx, "status") ?? "all";
  const topicIds = qsList(ctx, "topic_ids");
  const q = qs(ctx, "q");
  const sort = qs(ctx, "sort");

  const rows = s.claims
    .filter((c) => (type === "all" ? true : c.claim_type === type))
    .filter((c) => matchesStatus(c, status))
    .filter((c) => matchesTopics(c, topicIds))
    .filter((c) => matchesSearch(c.claim_statement, q))
    .sort((a, b) => {
      const byDate = Date.parse(b.created_at) - Date.parse(a.created_at);
      const byScore =
        (b.score_breakdown?.final_claim_score ?? -1) -
        (a.score_breakdown?.final_claim_score ?? -1);
      if (sort === "created_at") return byDate;
      if (sort === "score") return byScore;
      // Default per type: score for Existing, created_at for Non-Existing.
      return type === "non_existing" ? byDate : byScore || byDate;
    });

  const { items, meta } = paginate(rows, ctx);
  return ok(items.map((c) => summaryOf(s, c)), "claims", meta);
};

const getClaim: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const s = getState();
  return ok(detailOf(s, findClaim(s, String(ctx.params.id))), "claim detail");
};

const claimStatements: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const s = getState();
  const claim = findClaim(s, String(ctx.params.id));
  const stance = qs(ctx, "stance") ?? "all";
  const rows: StatementDto[] = claim.statements.filter((st) =>
    stance === "all" ? true : st.stance === stance,
  );
  const { items, meta } = paginate(rows, ctx);
  return ok(items, "claim statements", meta);
};

const claimTopAccounts: MockHandler = async (ctx) => {
  await sleep(140);
  const s = getState();
  const claim = findClaim(s, String(ctx.params.id));
  const limit = Math.max(1, Math.trunc(qsNum(ctx, "limit", 5)));
  return ok((claim.top_accounts ?? []).slice(0, limit), "top accounts");
};

const claimPolicies: MockHandler = async (ctx) => {
  await sleep(140);
  const s = getState();
  return ok(policyRefsFor(s, findClaim(s, String(ctx.params.id))), "claim policies");
};

const claimScoreHistory: MockHandler = async (ctx) => {
  await sleep(160);
  const s = getState();
  const claim = findClaim(s, String(ctx.params.id));
  const granularity = qs(ctx, "granularity") ?? "week";
  // History exists only from the moment a claim joins the watchlist.
  const snapshots = s.snapshots.filter((snap) => snap.claim_id === claim.id);
  return ok(
    {
      claim_id: claim.id,
      granularity,
      points: bucketPoints(snapshots, granularity, qs(ctx, "from"), qs(ctx, "to")),
    },
    "claim score history",
  );
};

const updateClaimStatus: MockHandler = async (ctx) => {
  await sleep(140);
  const s = getState();
  const claim = findClaim(s, String(ctx.params.id));
  const { status, notes } = body<{ status: string; notes?: string }>(ctx);
  const allowed = ["unreviewed", "active", "inactive", "action_taken"];
  // Struct-tag validation runs before the handler, so this is always
  // 400 VALIDATION_FAILED — never 422.
  if (!status || !allowed.includes(status)) {
    fail(
      "status must be one of unreviewed, active, inactive, action_taken",
      400,
      "VALIDATION_FAILED",
    );
  }
  if (notes && notes.length > 2000) {
    fail("notes must be 2000 characters or fewer", 400, "VALIDATION_FAILED");
  }
  claim.review_status = status as MockClaim["review_status"];
  // Overwrites the previous row rather than appending — not a change log.
  s.reviews[claim.id] = {
    notes: notes ?? s.reviews[claim.id]?.notes ?? null,
    reviewed_by: s.users[0]?.id ?? "d0000000-0000-0000-0000-000000000001",
    reviewed_at: new Date().toISOString(),
  };
  saveState();
  return ok(summaryOf(s, claim), "claim status updated");
};

/* ------------------------------ policies -------------------------------- */

/** Resolve a queued matchmaking job once its simulated delay has elapsed. */
const pendingMatchmaking = new Map<string, number>();

function resolveMatchmaking(s: MockState, policy: MockPolicy) {
  if (policy.processing_status !== "pending" && policy.processing_status !== "processing") {
    return;
  }
  const startedAt = pendingMatchmaking.get(policy.id);
  if (startedAt === undefined) return;
  const elapsed = Date.now() - startedAt;
  if (elapsed < 2000) return;
  if (elapsed < 4500) {
    policy.processing_status = "processing";
    policy.is_processing = true;
    return;
  }

  // (a) link an Existing claim that shares a keyword with the policy name
  const keywords = policy.name
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const match = s.claims.find(
    (c) =>
      c.claim_type === "existing" &&
      !c.policy_ids.includes(policy.id) &&
      keywords.some((k) => c.claim_statement.toLowerCase().includes(k)),
  );
  if (match) match.policy_ids.push(policy.id);

  // (b) the AI service generates a predicted claim for the policy
  s.claims.push(createPredictedClaim(policy.id, policy.name));

  // (c) the callback supplies ai_policy_id — correlations only resolve now
  policy.ai_policy_id = policy.id.replace(/^b/, "e");
  policy.processing_status = "completed";
  policy.is_processing = false;
  policy.processed_at = new Date().toISOString();
  policy.attempts = 1;
  pendingMatchmaking.delete(policy.id);
  saveState();
}

function linkedClaims(s: MockState, policy: MockPolicy) {
  const linked = policy.ai_policy_id
    ? s.claims.filter((c) => c.policy_ids.includes(policy.id))
    : [];
  return {
    existing: linked.filter((c) => c.claim_type === "existing"),
    nonExisting: linked.filter((c) => c.claim_type === "non_existing"),
  };
}

function policyRow(s: MockState, policy: MockPolicy) {
  const { existing, nonExisting } = linkedClaims(s, policy);
  const activity = [...existing, ...nonExisting]
    .map((c) => c.created_at)
    .sort();
  return {
    id: policy.id,
    name: policy.name,
    description: policy.description,
    month_year: policy.month_year,
    rolled_out_date: policy.rolled_out_date,
    status: policy.status,
    file_name: policy.file_name,
    download_url: policy.download_url,
    processing_status: policy.processing_status,
    is_processing: policy.is_processing,
    processing_error: policy.processing_error,
    linked_claim_count: existing.length + nonExisting.length,
    ai_policy_id: policy.ai_policy_id,
    created_at: policy.created_at,
    last_claim_activity_at: activity.length ? activity[activity.length - 1] : null,
  };
}

/** Newest linked-claim activity first; policies with none sort last. */
function latestActivity(s: MockState, policy: MockPolicy): number {
  const { existing, nonExisting } = linkedClaims(s, policy);
  const dates = [...existing, ...nonExisting].map((c) => Date.parse(c.created_at));
  if (dates.length === 0) return Date.parse(policy.created_at) - 1e12;
  return Math.max(...dates);
}

const listPolicies: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const s = getState();
  s.policies.forEach((p) => resolveMatchmaking(s, p));

  const years = qsList(ctx, "years").map(Number).filter(Number.isFinite);
  const q = qs(ctx, "q");
  const status = qs(ctx, "status");

  const rows = s.policies
    .filter((p) =>
      years.length
        ? years.includes(new Date(p.rolled_out_date ?? "").getUTCFullYear())
        : true,
    )
    .filter((p) => matchesSearch(p.name, q))
    .filter((p) => (status ? p.status === status : true))
    .sort((a, b) => latestActivity(s, b) - latestActivity(s, a));

  const { items, meta } = paginate(rows, ctx);
  return ok(items.map((p) => policyRow(s, p)), "public policies", meta);
};

const policyYears: MockHandler = async () => {
  await sleep(100);
  const s = getState();
  const years = [
    ...new Set(
      s.policies
        .map((p) => new Date(p.rolled_out_date ?? "").getUTCFullYear())
        .filter(Number.isFinite),
    ),
  ].sort((a, b) => b - a);
  return ok({ years }, "available policy years");
};

const createPolicy: MockHandler = async (ctx) => {
  await sleep(350);
  const form = ctx.form;
  if (!form) fail("multipart/form-data body required", 400, "BAD_REQUEST");

  const file = form.get("file");
  if (!(file instanceof File)) fail("file part is required", 400, "BAD_REQUEST");
  if (!/\.(pdf|docx?)$/i.test(file.name)) {
    fail("only .pdf, .doc and .docx documents are accepted", 422, "UNPROCESSABLE_ENTITY");
  }

  const name = String(form.get("name") ?? "").trim();
  const rolledOutDate = String(form.get("rolled_out_date") ?? "");
  const description = form.get("description");
  if (name.length < 2 || name.length > 500) {
    fail("name must be 2-500 characters", 400, "VALIDATION_FAILED");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rolledOutDate)) {
    fail("rolled_out_date must be YYYY-MM-DD", 400, "VALIDATION_FAILED");
  }

  const s = getState();
  const id = `b0000000-0000-0000-0000-${String(s.policies.length + 100).padStart(12, "0")}`;
  const iso = new Date(`${rolledOutDate}T00:00:00Z`).toISOString();
  const policy: MockPolicy = {
    id,
    name,
    description: description ? String(description) : null,
    month_year: new Date(iso).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    }),
    rolled_out_date: iso,
    // Derived from the date, never sent by the caller.
    status: Date.parse(iso) <= Date.now() ? "rolled_out" : "not_rolled_out",
    file_name: file.name,
    download_url: `/api/v1/policies/${id}/file`,
    processing_status: "pending",
    is_processing: true,
    processing_error: null,
    linked_claim_count: 0,
    ai_policy_id: null,
    created_at: new Date().toISOString(),
    attempts: 0,
    processed_at: null,
  };
  s.policies.unshift(policy);
  pendingMatchmaking.set(id, Date.now());
  saveState();
  return ok(policyRow(s, policy), "policy created");
};

const getPolicy: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const s = getState();
  const policy = findPolicy(s, String(ctx.params.id));
  resolveMatchmaking(s, policy);
  const { existing, nonExisting } = linkedClaims(s, policy);
  return ok(
    {
      ...policyRow(s, policy),
      existing_claims: existing.map((c) => summaryOf(s, c)),
      non_existing_claims: nonExisting.map((c) => summaryOf(s, c)),
    },
    "policy detail",
  );
};

const policyProcessing: MockHandler = async (ctx) => {
  await sleep(120);
  const s = getState();
  const policy = findPolicy(s, String(ctx.params.id));
  resolveMatchmaking(s, policy);
  const { existing, nonExisting } = linkedClaims(s, policy);
  return ok(
    {
      policy_id: policy.id,
      processing_status: policy.processing_status,
      is_processing: policy.is_processing,
      attempts: policy.attempts,
      processed_at: policy.processed_at,
      ai_policy_id: policy.ai_policy_id,
      linked_claim_count: existing.length + nonExisting.length,
      processing_error: policy.processing_error,
    },
    "matchmaking status",
  );
};

const rematchPolicy: MockHandler = async (ctx) => {
  await sleep(200);
  const s = getState();
  const policy = findPolicy(s, String(ctx.params.id));
  if (policy.is_processing) {
    fail("matchmaking is already running for this policy", 409, "CONFLICT");
  }
  policy.processing_status = "pending";
  policy.is_processing = true;
  policy.processing_error = null;
  policy.attempts = 0;
  pendingMatchmaking.set(policy.id, Date.now());
  saveState();
  return ok(
    {
      policy_id: policy.id,
      processing_status: policy.processing_status,
      is_processing: true,
      attempts: 0,
      processed_at: null,
      ai_policy_id: policy.ai_policy_id,
      linked_claim_count: policy.linked_claim_count ?? 0,
      processing_error: null,
    },
    "matchmaking re-queued",
  );
};

const updatePolicy: MockHandler = async (ctx) => {
  await sleep(180);
  const s = getState();
  const policy = findPolicy(s, String(ctx.params.id));
  const patch = body<{ name: string; rolled_out_date: string; description: string }>(ctx);
  if (
    patch.name === undefined &&
    patch.rolled_out_date === undefined &&
    patch.description === undefined
  ) {
    fail("at least one updatable field is required", 400, "BAD_REQUEST");
  }
  if (patch.name !== undefined) {
    if (patch.name.trim().length < 2) {
      fail("name must be 2-500 characters", 400, "VALIDATION_FAILED");
    }
    policy.name = patch.name.trim();
  }
  if (patch.rolled_out_date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.rolled_out_date)) {
      fail("rolled_out_date must be YYYY-MM-DD", 400, "VALIDATION_FAILED");
    }
    const iso = new Date(`${patch.rolled_out_date}T00:00:00Z`).toISOString();
    policy.rolled_out_date = iso;
    policy.month_year = new Date(iso).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
    // status is re-derived, never supplied.
    policy.status = Date.parse(iso) <= Date.now() ? "rolled_out" : "not_rolled_out";
  }
  if (patch.description !== undefined) policy.description = patch.description;
  saveState();
  return ok(policyRow(s, policy), "policy updated");
};

const replacePolicyFile: MockHandler = async (ctx) => {
  await sleep(320);
  const form = ctx.form;
  if (!form) fail("multipart/form-data body required", 400, "BAD_REQUEST");
  const file = form.get("file");
  if (!(file instanceof File)) fail("file part is required", 400, "BAD_REQUEST");
  if (!/\.(pdf|docx?)$/i.test(file.name)) {
    fail("only .pdf, .doc and .docx documents are accepted", 422, "UNPROCESSABLE_ENTITY");
  }

  const s = getState();
  const policy = findPolicy(s, String(ctx.params.id));
  if (policy.is_processing) {
    fail("matchmaking is already running for this policy", 409, "CONFLICT");
  }

  // The id, ai_policy_id and every correlation survive — only the document
  // changes. Matchmaking re-runs against the new one.
  policy.file_name = file.name;
  policy.processing_status = "pending";
  policy.is_processing = true;
  policy.processing_error = null;
  policy.attempts = 0;
  policy.processed_at = null;
  pendingMatchmaking.set(policy.id, Date.now());
  saveState();
  return ok(policyRow(s, policy), "policy document replaced");
};

const deletePolicy: MockHandler = async (ctx) => {
  await sleep(200);
  const s = getState();
  const policy = findPolicy(s, String(ctx.params.id));
  s.policies = s.policies.filter((p) => p.id !== policy.id);
  // Claims linked by the AI service are NOT deleted — only the correlation goes.
  s.claims.forEach((c) => {
    c.policy_ids = c.policy_ids.filter((pid) => pid !== policy.id);
  });
  saveState();
  return ok(null, "policy deleted");
};

/* ------------------------------- alerts --------------------------------- */

function watchlistRow(s: MockState, entry: MockState["watchlist"][number]): WatchlistItemDto | null {
  const claim = s.claims.find((c) => c.id === entry.claim_id);
  if (!claim) return null;
  const score = claim.score_breakdown?.final_claim_score ?? null;
  const t = threshold(s);
  return {
    id: claim.id,
    alert_id: entry.alert_id,
    claim_statement: claim.claim_statement,
    topic: claim.topic,
    added_at: entry.added_at,
    chart_visible: entry.chart_visible,
    final_claim_score: score,
    // A null score is never escalated on missing data.
    threshold_status: score !== null && score >= t ? "over_threshold" : "under_threshold",
    threshold: t,
    is_dormant: claim.is_dormant ?? false,
    claim_created_at: claim.created_at,
  };
}

const listAlerts: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const s = getState();
  const q = qs(ctx, "q");
  const rows = [...s.watchlist]
    .sort((a, b) => Date.parse(b.added_at) - Date.parse(a.added_at))
    .map((entry) => watchlistRow(s, entry))
    .filter((row): row is WatchlistItemDto => row !== null)
    .filter((row) => matchesSearch(row.claim_statement, q));
  const { items, meta } = paginate(rows, ctx);
  return ok(items, "alert watchlist", meta);
};

const addAlert: MockHandler = async (ctx) => {
  await sleep(160);
  const s = getState();
  const { claim_id } = body<{ claim_id: string }>(ctx);
  if (!claim_id) fail("claim_id is required", 400, "VALIDATION_FAILED");
  const claim = findClaim(s, claim_id);
  if (claim.claim_type !== "existing") {
    fail(
      "only existing claims can be added to the alert watchlist",
      422,
      "UNPROCESSABLE_ENTITY",
    );
  }

  // Re-adding is not an error: return the existing row untouched.
  let entry = s.watchlist.find((w) => w.claim_id === claim_id);
  if (!entry) {
    entry = {
      claim_id,
      alert_id: `d0000000-0000-0000-0000-${String(s.watchlist.length + 100).padStart(12, "0")}`,
      added_at: new Date().toISOString(),
      chart_visible: false,
    };
    s.watchlist.push(entry);
    // History starts the moment a claim is watched.
    if (!s.snapshots.some((snap) => snap.claim_id === claim_id)) {
      s.snapshots.push(
        ...historyFor(
          claim_id,
          claim.score_breakdown?.final_claim_score ?? 0,
          claim.score_breakdown?.claim_score ?? 0,
          s.watchlist.length,
        ),
      );
    }
  }
  claim.is_on_alert = true;
  saveState();
  return ok(
    {
      claim_id,
      on_watchlist: true,
      chart_visible: entry.chart_visible,
      added_at: entry.added_at,
    },
    "claim added to the alert watchlist",
  );
};

const removeAlert: MockHandler = async (ctx) => {
  await sleep(160);
  const s = getState();
  const claimId = String(ctx.params.claimId);
  if (!s.watchlist.some((w) => w.claim_id === claimId)) {
    fail("claim is not on the watchlist", 404, "NOT_FOUND");
  }
  // Removing also clears the chart checkbox in one step.
  s.watchlist = s.watchlist.filter((w) => w.claim_id !== claimId);
  const claim = s.claims.find((c) => c.id === claimId);
  if (claim) claim.is_on_alert = false;
  saveState();
  return ok(null, "claim removed from the alert watchlist");
};

const setChartVisible: MockHandler = async (ctx) => {
  await sleep(120);
  const s = getState();
  const claimId = String(ctx.params.claimId);
  const entry = s.watchlist.find((w) => w.claim_id === claimId);
  if (!entry) fail("claim is not on the watchlist", 404, "NOT_FOUND");
  const { visible } = body<{ visible: boolean }>(ctx);
  if (typeof visible !== "boolean") {
    fail("visible is required", 400, "VALIDATION_FAILED");
  }
  entry.chart_visible = visible;
  saveState();
  return ok({ claim_id: claimId, chart_visible: visible }, "chart visibility updated");
};

const alertChart: MockHandler = async (ctx) => {
  await sleep(180);
  const s = getState();
  const granularity = qs(ctx, "granularity") ?? "week";
  const from = qs(ctx, "from");
  const to = qs(ctx, "to");

  const series = s.watchlist
    .filter((w) => w.chart_visible)
    .map((w) => {
      const claim = s.claims.find((c) => c.id === w.claim_id);
      if (!claim) return null;
      return {
        claim_id: claim.id,
        claim_statement: claim.claim_statement,
        topic: claim.topic,
        points: bucketPoints(
          s.snapshots.filter((snap) => snap.claim_id === claim.id),
          granularity,
          from,
          to,
        ),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return ok(
    {
      granularity,
      threshold: threshold(s),
      y_axis_min: 0,
      y_axis_max: 100,
      series,
    },
    "alert chart",
  );
};

/* ------------------------------ settings -------------------------------- */

const listSettings: MockHandler = async () => {
  await sleep(120);
  return ok(getState().settings, "settings");
};

const getAlertThreshold: MockHandler = async () => {
  await sleep(100);
  return ok({ threshold: threshold(getState()) }, "alert threshold");
};

const putAlertThreshold: MockHandler = async (ctx) => {
  await sleep(160);
  const s = getState();
  const { threshold: next } = body<{ threshold: number }>(ctx);
  // Struct-tag validated: always 400 VALIDATION_FAILED, never 422.
  if (typeof next !== "number" || Number.isNaN(next) || next < 0 || next > 100) {
    fail("threshold must be between 0 and 100", 400, "VALIDATION_FAILED");
  }
  setSetting(s, ALERT_THRESHOLD_KEY, String(Math.round(next)));
  saveState();
  return ok({ threshold: Math.round(next) }, "alert threshold updated");
};

/* -------------------------------- admin --------------------------------- */

const generateGenericClaim: MockHandler = async (ctx) => {
  await sleep(500);
  const s = getState();
  const { topic_id } = body<{ topic_id?: string }>(ctx);
  const claim = createGeneratedClaim(topic_id);
  s.claims.unshift(claim);
  const now = new Date().toISOString();
  setSetting(s, CLAIMS_LAST_FETCHED_KEY, now);
  saveState();
  return ok(
    {
      claim_id: claim.id,
      claim_statement: claim.claim_statement,
      topic_id: claim.topic?.id ?? null,
      last_fetched_at: now,
    },
    "generic claim generated",
  );
};

const snapshotScores: MockHandler = async () => {
  await sleep(300);
  const s = getState();
  const capturedAt = new Date().toISOString();
  let captured = 0;
  for (const entry of s.watchlist) {
    const claim = s.claims.find((c) => c.id === entry.claim_id);
    if (!claim?.score_breakdown) continue;
    s.snapshots.push({
      claim_id: claim.id,
      captured_at: capturedAt,
      final_claim_score: claim.score_breakdown.final_claim_score ?? 0,
      claim_score: claim.score_breakdown.claim_score ?? 0,
    });
    captured += 1;
  }
  saveState();
  return ok({ snapshots_captured: captured }, "score snapshots captured");
};

/**
 * `POST /admin/rescore`. NPR drifts as opposing posts age out of the window,
 * so the mock nudges the discount factor rather than returning the same
 * numbers — a rescore that changes nothing would hide the bug it exists to
 * prevent (a flat F3 trend line).
 */
const rescoreClaims: MockHandler = async () => {
  await sleep(900);
  const s = getState();
  let rescored = 0;
  for (const claim of s.claims) {
    const score = claim.score_breakdown;
    if (claim.claim_type !== "existing" || !score) continue;
    if (score.is_dormant) continue;
    const drift = ((rescored % 5) - 2) / 100;
    const npr = Math.min(Math.max((score.npr ?? 0) + drift, 0), 1);
    const discount = computeDiscountFactor(npr);
    score.npr = Math.round(npr * 100) / 100;
    score.discount_factor = discount;
    score.final_claim_score = computeFinalClaimScore(
      score.claim_score ?? 0,
      discount,
    );
    claim.final_claim_score = score.final_claim_score;
    rescored += 1;
  }
  saveState();
  return ok({ claims_rescored: rescored }, "claims rescored");
};

const generateSampleContent: MockHandler = async (ctx) => {
  await sleep(1200);
  const s = getState();
  const { count, auto_cluster } = body<{
    count?: number;
    topic_hint?: string;
    auto_cluster?: boolean;
  }>(ctx);
  const requested = Math.min(Math.max(count ?? 10, 1), 50);
  if (count !== undefined && (count < 1 || count > 50)) {
    fail("count must be between 1 and 50", 422, "UNPROCESSABLE_ENTITY");
  }
  const clustering = auto_cluster !== false;

  // Clustering is what turns content into claims, so only the clustered path
  // creates any.
  const created = clustering ? Math.max(1, Math.floor(requested / 5)) : 0;
  for (let i = 0; i < created; i++) {
    s.claims.unshift(createGeneratedClaim());
  }
  const now = new Date().toISOString();
  setSetting(s, CLAIMS_LAST_FETCHED_KEY, now);
  saveState();

  return ok(
    {
      generated_count: requested,
      failed_count: 0,
      // Null, not zero, when nothing was clustered: "not clustered" and
      // "clustered and produced nothing" are different answers.
      claims_created: clustering ? created : null,
      claims_updated: clustering ? Math.max(0, requested - created * 5) : null,
      content_items_clustered: clustering ? requested : null,
      last_fetched_at: now,
      message: `generated ${requested} content items`,
    },
    "sample content generated",
  );
};

const clusterNow: MockHandler = async () => {
  await sleep(700);
  return ok(
    { claims_created: 0, claims_updated: 0, content_items_clustered: 0 },
    "clustering pass complete",
  );
};

/**
 * `POST /admin/reconcile`. Mock mode never has orphans — the claims and the
 * `cis_*` overlay live in the same store — so this reports a clean sweep. The
 * empty-database guard is not simulated: it exists to catch a backend pointed
 * at the wrong database, which has no mock-mode analogue.
 */
const reconcile: MockHandler = async (ctx) => {
  await sleep(500);
  const s = getState();
  const { dry_run } = body<{ dry_run?: boolean; force?: boolean }>(ctx);
  const dryRun = dry_run ?? false;
  return ok(
    {
      dry_run: dryRun,
      orphaned_reviews: 0,
      orphaned_alerts: 0,
      orphaned_score_snapshots: 0,
      policies_unlinked: 0,
      claims_in_database: s.claims.length,
      ai_policies_in_database: s.policies.length,
      message: dryRun
        ? "0 rows would be reconciled"
        : "0 rows reconciled — nothing was orphaned",
    },
    dryRun ? "reconciliation preview" : "reconciliation complete",
  );
};

/**
 * `PUT /claims/:id/harm/confirm`. An empty body is valid and meaningful: it
 * records that a person reviewed the sub-scores and agreed, which still flips
 * `human_confirmed`. Omitted fields keep the AI's own classification.
 */
const confirmHarm: MockHandler = async (ctx) => {
  await sleep(1100);
  const s = getState();
  const claim = findClaim(s, String(ctx.params.id));
  if (claim.claim_type !== "existing" || !claim.score_breakdown?.harm_breakdown) {
    fail(
      "this claim is Synthetic and carries no scores to confirm",
      422,
      "UNPROCESSABLE_ENTITY",
    );
  }

  const payload = body<{
    public_safety?: number;
    institutional_trust?: number;
    economic?: number;
    policy_disruption?: number;
  }>(ctx);

  const harm = claim.score_breakdown.harm_breakdown;
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue;
    if (typeof value !== "number" || value < 0 || value > 100) {
      fail(`${key} must be between 0 and 100`, 422, "UNPROCESSABLE_ENTITY");
    }
    (harm as Record<string, unknown>)[key] = value;
  }
  harm.human_confirmed = true;

  // The AI service rescores harm -> claim_score -> final_claim_score, so the
  // whole chain is recomputed here rather than only the sub-scores.
  const score = claim.score_breakdown;
  score.harm = computeHarm({
    publicSafety: harm.public_safety ?? 0,
    institutionalTrust: harm.institutional_trust ?? 0,
    economic: harm.economic ?? 0,
    policyDisruption: harm.policy_disruption ?? 0,
  });
  score.claim_score = computeClaimScore({
    reach: score.reach ?? 0,
    velocity: score.velocity ?? 0,
    falseness: score.falseness ?? 0,
    harm: score.harm,
    emotionalIntensity: score.emotional_intensity ?? 0,
  });
  score.final_claim_score = computeFinalClaimScore(
    score.claim_score,
    score.discount_factor ?? 1,
  );
  claim.final_claim_score = score.final_claim_score;
  saveState();

  // The response IS the full claim detail — the caller must not re-fetch.
  return ok(detailOf(s, claim), "harm assessment confirmed");
};

/* -------------------------------- health -------------------------------- */

const healthLive: MockHandler = async () =>
  ok(
    {
      status: "healthy",
      service: "CIS Backend (mock)",
      environment: "mock",
      uptime_seconds: Math.round((Date.now() - MOCK_NOW) / 1000),
    },
    "ok",
  );

const healthReady: MockHandler = async () =>
  ok(
    {
      database: "up",
      storage_driver: "mock",
      // `internal_routes_authenticated` was removed in V1, and `reachable` is
      // only sent when the service is configured.
      ai_service: { configured: false },
    },
    "ready",
  );

/* ------------------------------- registry ------------------------------- */

export const mockHandlers: Record<string, MockHandler> = {
  "POST /auth/register": authRegister,
  "POST /auth/login": authLogin,
  "POST /auth/refresh": authRefresh,
  "GET /auth/me": authMe,
  "POST /auth/logout": authLogout,

  "GET /topics": listTopics,
  "GET /topics/:id": getTopic,

  "GET /claims/repository": claimRepository,
  "GET /claims": listClaims,
  "GET /claims/:id": getClaim,
  "GET /claims/:id/statements": claimStatements,
  "GET /claims/:id/top-accounts": claimTopAccounts,
  "GET /claims/:id/policies": claimPolicies,
  "GET /claims/:id/score-history": claimScoreHistory,
  "PUT /claims/:id/status": updateClaimStatus,

  "GET /policies": listPolicies,
  "GET /policies/years": policyYears,
  "POST /policies": createPolicy,
  "GET /policies/:id": getPolicy,
  "GET /policies/:id/processing": policyProcessing,
  "POST /policies/:id/rematch": rematchPolicy,
  "PATCH /policies/:id": updatePolicy,
  "PUT /policies/:id/file": replacePolicyFile,
  "DELETE /policies/:id": deletePolicy,

  "GET /alerts": listAlerts,
  "POST /alerts": addAlert,
  "DELETE /alerts/:claimId": removeAlert,
  "PATCH /alerts/:claimId/chart": setChartVisible,
  "GET /alerts/chart": alertChart,

  "GET /settings": listSettings,
  "GET /settings/alert-threshold": getAlertThreshold,
  "PUT /settings/alert-threshold": putAlertThreshold,

  "POST /admin/generate-generic-claim": generateGenericClaim,
  "POST /admin/snapshot-scores": snapshotScores,
  "POST /admin/rescore": rescoreClaims,
  "POST /admin/generate-sample-content": generateSampleContent,
  "POST /admin/cluster-now": clusterNow,
  "POST /admin/reconcile": reconcile,

  "PUT /claims/:id/harm/confirm": confirmHarm,

  "GET /health": healthLive,
  "GET /health/ready": healthReady,

  // F5 — Coordinated-Network Detector, in its own module.
  ...networkMockHandlers,
};
