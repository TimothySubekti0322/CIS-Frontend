import type { ClaimStatus, GenericClaim, SyntheticClaim } from "@/types/claim";
import type { Policy, PolicyDetail } from "@/types/policy";
import type { WatchlistItem } from "@/types/alert";
import type { AuthResponse } from "@/types/auth";
import { ApiError } from "@/types/common";
import { makeId, sleep } from "@/lib/utils";
import {
  createGenericClaim,
  createSyntheticForPolicy,
  recomputePolicyRollups,
  scoreHistory,
} from "./data";
import { getState, saveState } from "./store";

export interface MockContext {
  method: string;
  params: Record<string, string | number>;
  query: Record<string, unknown>;
  body: unknown;
}

type MockHandler = (ctx: MockContext) => Promise<unknown>;

const LATENCY = 220;

/* ----------------------------- helpers ----------------------------- */

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value === undefined || value === null || value === "") return [];
  return [String(value)];
}

function toGenericSummary(c: GenericClaim): GenericClaim {
  const { id, type, statement, topicId, topicLabel, status, score, firstCaughtAt, positiveCount, negativeCount, onWatchlist } = c;
  return { id, type, statement, topicId, topicLabel, status, score, firstCaughtAt, positiveCount, negativeCount, onWatchlist };
}

function decodeToken(token: string | undefined): string | null {
  if (!token || !token.startsWith("mock.")) return null;
  try {
    return atob(token.slice(5));
  } catch {
    return null;
  }
}

/* ------------------------------ auth ------------------------------- */

const authRegister: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const { username, password } = (ctx.body ?? {}) as {
    username?: string;
    password?: string;
  };
  if (!username || !password) throw new ApiError("Username and password are required.", 400);
  const s = getState();
  if (s.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    throw new ApiError("That username is already taken.", 409);
  }
  const user = { id: makeId("usr"), username, passwordHash: btoa(password) };
  s.users.push(user);
  saveState();
  const res: AuthResponse = {
    token: `mock.${btoa(username)}`,
    user: { id: user.id, username: user.username },
  };
  return res;
};

const authLogin: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const { username, password } = (ctx.body ?? {}) as {
    username?: string;
    password?: string;
  };
  if (!username || !password) throw new ApiError("Username and password are required.", 400);
  const s = getState();
  const user = s.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase(),
  );
  if (!user || user.passwordHash !== btoa(password)) {
    throw new ApiError("Incorrect username or password.", 401);
  }
  const res: AuthResponse = {
    token: `mock.${btoa(user.username)}`,
    user: { id: user.id, username: user.username },
  };
  return res;
};

const authMe: MockHandler = async (ctx) => {
  await sleep(80);
  const token = String(ctx.query.token ?? "");
  const username = decodeToken(token);
  if (!username) throw new ApiError("Not authenticated.", 401);
  const s = getState();
  const user = s.users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase(),
  );
  // In mock mode a token can outlive its user record (localStorage cleared, etc.)
  return { id: user?.id ?? makeId("usr"), username };
};

/* ----------------------------- claims ----------------------------- */

const listGeneric: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const s = getState();
  const topicIds = asArray(ctx.query.topicIds);
  const status = ctx.query.status as ClaimStatus | "all" | undefined;
  const search = String(ctx.query.search ?? "").toLowerCase().trim();
  const limit = ctx.query.limit ? Number(ctx.query.limit) : undefined;

  let items = s.genericClaims
    .filter((c) => (topicIds.length ? topicIds.includes(c.topicId) : true))
    .filter((c) => (status && status !== "all" ? c.status === status : true))
    .filter((c) => (search ? c.statement.toLowerCase().includes(search) : true))
    .sort((a, b) => b.score.finalClaimScore - a.score.finalClaimScore)
    .map(toGenericSummary);

  const total = items.length;
  if (limit) items = items.slice(0, limit);
  return { items, total, lastFetchedAt: s.genericLastFetchedAt };
};

const listSynthetic: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const s = getState();
  const topicIds = asArray(ctx.query.topicIds);
  const status = ctx.query.status as ClaimStatus | "all" | undefined;
  const search = String(ctx.query.search ?? "").toLowerCase().trim();
  const limit = ctx.query.limit ? Number(ctx.query.limit) : undefined;

  let items: SyntheticClaim[] = s.syntheticClaims
    .filter((c) => (topicIds.length ? topicIds.includes(c.topicId) : true))
    .filter((c) => (status && status !== "all" ? c.status === status : true))
    .filter((c) => (search ? c.statement.toLowerCase().includes(search) : true))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .map(({ id, type, statement, topicId, topicLabel, status: st, createdAt }) => ({
      id,
      type,
      statement,
      topicId,
      topicLabel,
      status: st,
      createdAt,
    }));

  const total = items.length;
  if (limit) items = items.slice(0, limit);
  return { items, total };
};

const getGeneric: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const s = getState();
  const claim = s.genericClaims.find((c) => c.id === String(ctx.params.id));
  if (!claim) throw new ApiError("Claim not found.", 404);
  return claim;
};

const getSynthetic: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const s = getState();
  const claim = s.syntheticClaims.find((c) => c.id === String(ctx.params.id));
  if (!claim) throw new ApiError("Claim not found.", 404);
  return claim;
};

const updateStatus: MockHandler = async (ctx) => {
  await sleep(140);
  const s = getState();
  const id = String(ctx.params.id);
  const { status } = (ctx.body ?? {}) as { status?: ClaimStatus };
  if (!status) throw new ApiError("status is required.", 400);
  const g = s.genericClaims.find((c) => c.id === id);
  if (g) {
    g.status = status;
    return toGenericSummary(g);
  }
  const syn = s.syntheticClaims.find((c) => c.id === id);
  if (syn) {
    syn.status = status;
    return syn;
  }
  throw new ApiError("Claim not found.", 404);
};

const generateGeneric: MockHandler = async () => {
  await sleep(400);
  const s = getState();
  const claim = createGenericClaim();
  s.genericClaims.unshift(claim);
  s.genericLastFetchedAt = new Date().toISOString();
  saveState();
  return toGenericSummary(claim);
};

/* ---------------------------- policies ---------------------------- */

function toPolicySummary(p: PolicyDetail): Policy {
  const { genericClaims, syntheticClaims, ...rest } = p;
  void genericClaims;
  void syntheticClaims;
  return rest;
}

const listPolicies: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const s = getState();
  const years = asArray(ctx.query.years).map(Number);
  const search = String(ctx.query.search ?? "").toLowerCase().trim();
  const limit = ctx.query.limit ? Number(ctx.query.limit) : undefined;

  let items = s.policies
    .filter((p) =>
      years.length
        ? years.includes(new Date(p.rolledOutDate).getFullYear())
        : true,
    )
    .filter((p) => (search ? p.name.toLowerCase().includes(search) : true))
    .sort((a, b) => {
      // PRD US35: latest linked-claim activity first; no-activity policies last,
      // ordered by their own creation date.
      const aKey = a.lastClaimActivityAt
        ? Date.parse(a.lastClaimActivityAt)
        : -Infinity;
      const bKey = b.lastClaimActivityAt
        ? Date.parse(b.lastClaimActivityAt)
        : -Infinity;
      if (aKey !== bKey) return bKey - aKey;
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    })
    .map(toPolicySummary);

  const total = items.length;
  if (limit) items = items.slice(0, limit);
  return { items, total };
};

/** Lazily resolve a pending matchmaking job (see createPolicy). */
function resolveMatchmaking(policy: PolicyDetail) {
  if (policy.processing !== "processing") return;
  const started = pendingMatchmaking.get(policy.id);
  if (started === undefined || Date.now() - started < 4000) return;

  const s = getState();
  // (a) link an existing generic claim that shares a keyword with the policy
  const kw = policy.name.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
  const match = s.genericClaims.find(
    (c) =>
      !c.correlatedPolicies.some((p) => p.id === policy.id) &&
      kw.some((k) => c.statement.toLowerCase().includes(k)),
  );
  if (match) {
    match.correlatedPolicies.push({ id: policy.id, name: policy.name });
  }
  // (b) generate a predicted synthetic claim for the policy
  const syn = createSyntheticForPolicy(policy.id, policy.name);
  s.syntheticClaims.unshift(syn);

  policy.processing = "ready";
  pendingMatchmaking.delete(policy.id);
  recomputePolicyRollups(s.policies, s.genericClaims, s.syntheticClaims);
  saveState();
}

const pendingMatchmaking = new Map<string, number>();

const getPolicy: MockHandler = async (ctx) => {
  await sleep(LATENCY);
  const s = getState();
  const policy = s.policies.find((p) => p.id === String(ctx.params.id));
  if (!policy) throw new ApiError("Policy not found.", 404);
  resolveMatchmaking(policy);
  return {
    ...policy,
    genericClaims: policy.genericClaims.map(toGenericSummary),
  };
};

const createPolicy: MockHandler = async (ctx) => {
  await sleep(350);
  const s = getState();
  const { name, rolledOutDate, fileName } = (ctx.body ?? {}) as {
    name?: string;
    rolledOutDate?: string;
    fileName?: string;
  };
  if (!name || !rolledOutDate || !fileName) {
    throw new ApiError("name, rolledOutDate and fileName are required.", 400);
  }
  const nowIso = new Date().toISOString();
  const policy: PolicyDetail = {
    id: makeId("pol"),
    name,
    fileName,
    fileUrl: "#",
    rolledOutDate,
    status: Date.parse(rolledOutDate) <= Date.now() ? "rolled_out" : "not_rolled_out",
    createdAt: nowIso,
    processing: "processing",
    lastClaimActivityAt: null,
    linkedGenericCount: 0,
    linkedSyntheticCount: 0,
    genericClaims: [],
    syntheticClaims: [],
  };
  s.policies.unshift(policy);
  pendingMatchmaking.set(policy.id, Date.now());
  saveState();
  return toPolicySummary(policy);
};

const matchmakingStatus: MockHandler = async (ctx) => {
  await sleep(120);
  const s = getState();
  const policy = s.policies.find((p) => p.id === String(ctx.params.id));
  if (!policy) throw new ApiError("Policy not found.", 404);
  resolveMatchmaking(policy);
  return { processing: policy.processing };
};

/* ----------------------------- alerts ----------------------------- */

const listWatchlist: MockHandler = async () => {
  await sleep(LATENCY);
  const s = getState();
  return s.watchlist
    .slice()
    .sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt)) // US30: newest first
    .map((entry, i): WatchlistItem | null => {
      const claim = s.genericClaims.find((c) => c.id === entry.claimId);
      if (!claim) return null;
      const finalScore = claim.score.finalClaimScore;
      return {
        claimId: claim.id,
        statement: claim.statement,
        claimCreatedAt: claim.firstCaughtAt,
        finalClaimScore: finalScore,
        thresholdStatus:
          finalScore >= s.settings.alertThreshold ? "over" : "under",
        addedAt: entry.addedAt,
        history: scoreHistory(finalScore, i),
      };
    })
    .filter((x): x is WatchlistItem => x !== null);
};

const addToWatchlist: MockHandler = async (ctx) => {
  await sleep(160);
  const s = getState();
  const { claimId } = (ctx.body ?? {}) as { claimId?: string };
  if (!claimId) throw new ApiError("claimId is required.", 400);
  const claim = s.genericClaims.find((c) => c.id === claimId);
  if (!claim) throw new ApiError("Only existing claims can be watched.", 400);
  if (!s.watchlist.some((w) => w.claimId === claimId)) {
    s.watchlist.push({ claimId, addedAt: new Date().toISOString() });
  }
  claim.onWatchlist = true;
  saveState();
  return { claimId, onWatchlist: true };
};

const removeFromWatchlist: MockHandler = async (ctx) => {
  await sleep(160);
  const s = getState();
  const claimId = String(ctx.params.claimId);
  s.watchlist = s.watchlist.filter((w) => w.claimId !== claimId);
  const claim = s.genericClaims.find((c) => c.id === claimId);
  if (claim) claim.onWatchlist = false;
  saveState();
  return { claimId, onWatchlist: false };
};

/* ------------------------------ admin ----------------------------- */

const getSettings: MockHandler = async () => {
  await sleep(120);
  return getState().settings;
};

const updateSettings: MockHandler = async (ctx) => {
  await sleep(160);
  const s = getState();
  const { alertThreshold } = (ctx.body ?? {}) as { alertThreshold?: number };
  if (
    alertThreshold === undefined ||
    Number.isNaN(alertThreshold) ||
    alertThreshold < 0 ||
    alertThreshold > 100
  ) {
    throw new ApiError("alertThreshold must be between 0 and 100.", 400);
  }
  s.settings.alertThreshold = Math.round(alertThreshold);
  saveState();
  return s.settings;
};

/* --------------------------- registry ---------------------------- */

export const mockHandlers: Record<string, MockHandler> = {
  "POST /auth/register": authRegister,
  "POST /auth/login": authLogin,
  "GET /auth/me": authMe,

  "GET /claims/generic": listGeneric,
  "GET /claims/synthetic": listSynthetic,
  "GET /claims/generic/:id": getGeneric,
  "GET /claims/synthetic/:id": getSynthetic,
  "PATCH /claims/:id/status": updateStatus,
  "POST /claims/generic/generate": generateGeneric,

  "GET /policies": listPolicies,
  "GET /policies/:id": getPolicy,
  "POST /policies": createPolicy,
  "GET /policies/:id/matchmaking": matchmakingStatus,

  "GET /alerts/watchlist": listWatchlist,
  "POST /alerts/watchlist": addToWatchlist,
  "DELETE /alerts/watchlist/:claimId": removeFromWatchlist,

  "GET /admin/settings": getSettings,
  "PUT /admin/settings": updateSettings,
};
