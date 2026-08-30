import type { GenericClaimDetail, SyntheticClaimDetail } from "@/types/claim";
import type { PolicyDetail } from "@/types/policy";
import type { AdminSettings } from "@/types/alert";
import { buildSeed } from "./data";

interface MockUser {
  id: string;
  username: string;
  /** base64 of the password — mock only, never do this for real. */
  passwordHash: string;
}

interface WatchEntry {
  claimId: string;
  addedAt: string;
}

interface MockState {
  genericClaims: GenericClaimDetail[];
  syntheticClaims: SyntheticClaimDetail[];
  policies: PolicyDetail[];
  settings: AdminSettings;
  watchlist: WatchEntry[];
  users: MockUser[];
  /** "Last fetched" timestamp shown on the F1 S1 section (PRD US9). */
  genericLastFetchedAt: string;
}

export type { MockUser, WatchEntry, MockState };

const STORAGE_KEY = "cis_mock_state_v1";

function freshState(): MockState {
  const seed = buildSeed();
  return {
    genericClaims: seed.genericClaims,
    syntheticClaims: seed.syntheticClaims,
    policies: seed.policies,
    settings: seed.settings,
    watchlist: seed.genericClaims
      .filter((c) => c.onWatchlist)
      .map((c, i) => ({
        claimId: c.id,
        addedAt: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
      })),
    users: [],
    genericLastFetchedAt: new Date().toISOString(),
  };
}

let state: MockState | null = null;

function persist() {
  if (typeof window === "undefined" || !state) return;
  try {
    // Users + watchlist + settings are the parts worth persisting across reloads.
    const slim = {
      settings: state.settings,
      watchlist: state.watchlist,
      users: state.users,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
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
        if (slim.settings) state.settings = slim.settings;
        if (slim.watchlist) {
          state.watchlist = slim.watchlist;
          const ids = new Set(slim.watchlist.map((w) => w.claimId));
          state.genericClaims.forEach((c) => {
            c.onWatchlist = ids.has(c.id);
          });
        }
        if (slim.users) state.users = slim.users;
      }
    } catch {
      /* ignore */
    }
  }
  return state;
}

export function saveState() {
  persist();
}

/** Test helper — wipe persisted mock state. */
export function resetMockState() {
  state = freshState();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
