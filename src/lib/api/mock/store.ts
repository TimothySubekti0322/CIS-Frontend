import type { ClaimReviewDto, SettingDto, TopicDto } from "../dto";
import {
  buildSeed,
  type ContentVolume,
  type MockClaim,
  type MockPolicy,
  type Snapshot,
  type WatchEntry,
} from "./data";

/** A mock account. Passwords are base64'd — mock only, never do this for real. */
export interface MockUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface MockState {
  topics: TopicDto[];
  claims: MockClaim[];
  policies: MockPolicy[];
  watchlist: WatchEntry[];
  settings: SettingDto[];
  snapshots: Snapshot[];
  /** The AI service's per-rescore history for every claim — see `data.ts`. */
  aiSnapshots: Snapshot[];
  users: MockUser[];
  /** One overlay row per claim — the backend's `cis_claim_reviews`. */
  reviews: Record<string, ClaimReviewDto>;
  /** The AI service's content stream, for the Climate Sentiment Index. */
  contentVolume: ContentVolume;
  /**
   * When this reader last acknowledged threshold crossings. The real backend
   * keys this per user in `cis_alert_acknowledgements`; the mock has one
   * reader, so one timestamp is the faithful reduction.
   */
  acknowledgedAt: string | null;
}

/* Bumped because watchlist entries gained threshold-crossing state; a
   persisted v2 watchlist would carry none of it, so the seeded demo crossing
   would silently never appear. */
const STORAGE_KEY = "cis_mock_state_v3";

function freshState(): MockState {
  const seed = buildSeed();
  return {
    topics: seed.topics,
    claims: seed.claims,
    policies: seed.policies,
    watchlist: seed.watchlist,
    settings: seed.settings,
    snapshots: seed.snapshots,
    aiSnapshots: seed.aiSnapshots,
    users: [],
    reviews: {},
    contentVolume: seed.contentVolume,
    acknowledgedAt: null,
  };
}

let state: MockState | null = null;

function persist() {
  if (typeof window === "undefined" || !state) return;
  try {
    // Only the parts a reload should survive: accounts, the watchlist and settings.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        users: state.users,
        watchlist: state.watchlist,
        settings: state.settings,
        acknowledgedAt: state.acknowledgedAt,
      }),
    );
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function getState(): MockState {
  if (state) return state;
  state = freshState();
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const slim = JSON.parse(raw) as Partial<MockState>;
        if (slim.users) state.users = slim.users;
        if (slim.settings) state.settings = slim.settings;
        if (slim.acknowledgedAt !== undefined) {
          state.acknowledgedAt = slim.acknowledgedAt;
        }
        if (slim.watchlist) {
          state.watchlist = slim.watchlist;
          const watched = new Set(slim.watchlist.map((w) => w.claim_id));
          state.claims.forEach((c) => {
            if (c.claim_type === "existing") c.is_on_alert = watched.has(c.id);
          });
        }
      }
    } catch {
      /* ignore */
    }
  }
  recomputeTopicCounts(state);
  return state;
}

export function saveState() {
  if (state) recomputeTopicCounts(state);
  persist();
}

/** Topic claim counts are derived, exactly as the backend derives them. */
export function recomputeTopicCounts(s: MockState) {
  for (const topic of s.topics) {
    topic.existing_claim_count = s.claims.filter(
      (c) => c.claim_type === "existing" && c.topic?.id === topic.id,
    ).length;
    topic.non_existing_claim_count = s.claims.filter(
      (c) => c.claim_type === "non_existing" && c.topic?.id === topic.id,
    ).length;
  }
}

export function getSetting(s: MockState, key: string): SettingDto | undefined {
  return s.settings.find((setting) => setting.key === key);
}

export function setSetting(s: MockState, key: string, value: string) {
  const existing = getSetting(s, key);
  const now = new Date().toISOString();
  if (existing) {
    existing.value = value;
    existing.updated_at = now;
  } else {
    s.settings.push({
      key,
      value,
      value_type: "string",
      description: null,
      updated_at: now,
      updated_by: null,
    });
  }
}

/** Test helper — wipe persisted mock state. */
export function resetMockState() {
  state = freshState();
  recomputeTopicCounts(state);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
