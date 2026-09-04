# CIS Frontend

Frontend for CIS, a platform that helps a city climate team monitor its
information environment: it tracks claims circulating about climate policy,
scores how urgent each one is, matches them against the city's actual
policies, watches the ones worth escalating, and flags coordinated or
inauthentic accounts pushing them.

## What's in the app

- **Overview** — a leadership dashboard: sentiment, a threshold ratio, a
  topic treemap, and a policy leaderboard.
- **Claims** — the claim repository, with a transparent, weighted scoring
  system (reach, velocity, falseness, harm, emotional intensity) and
  AI-generated debunk content.
- **Policies** — a bank of the city's policies, with AI matchmaking that
  links claims to the policies they concern.
- **Alerts** — a watchlist for claims a reviewer has flagged, with score
  history charts and notifications.
- **Coordinated Network Detector** — surfaces clusters of accounts that
  appear to be coordinating to spread the same claims.
- **Admin** — thresholds, city configuration, detection parameters, and
  other tunables for the instance.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS v4** (design tokens in `src/app/globals.css`)
- **Lato** via `next/font/google`
- **TanStack Query** for server state
- **Recharts** for the alert chart and the Overview's topic treemap
- `lucide-react` icons

## Getting started

```bash
npm install
cp .env.example .env      # adjust if needed
npm run dev               # http://localhost:3000
```

Register with an email, name and password on `/register`, then you land on
the Overview.

## Environment

| var | purpose |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | display name in the UI / `<title>` |
| `NEXT_PUBLIC_API_BASE_URL` | backend origin, e.g. `http://localhost:8080` — used only when `NEXT_PUBLIC_API_MODE=live` |
| `NEXT_PUBLIC_API_PREFIX` | version prefix, default `/api/v1`. The health probes bypass it |
| `NEXT_PUBLIC_API_MODE` | `mock` (default, no backend) or `live` |

`.env` and `.env*.local` are gitignored.

## Data layer

Every screen talks to the backend through four layers, in this order:

```
component → hook (src/lib/hooks) → resource module (src/lib/api/*.ts)
          → apiClient (src/lib/api/client.ts) → backend
                             ↑
                    mappers.ts turns the snake_case DTO
                    into the camelCase domain type
```

| file | responsibility |
|---|---|
| `src/lib/api/endpoints.ts` | every documented route, verb and path — the single source of truth |
| `src/lib/api/dto.ts`, `dto.networks.ts`, `dto.overview.ts` | wire shapes, snake_case, exactly as the backend sends them |
| `src/lib/api/mappers*.ts` | DTO → domain translation. Nothing else imports a `dto` module |
| `src/lib/api/primitives.ts` | the defensive `num`/`str`/`oneOf` helpers every mapper shares |
| `src/lib/api/client.ts` | envelope unwrap, auth header, multipart, refresh-retry, blob download |
| `src/lib/api/{auth,topics,claims,policies,alerts,settings,admin,networks,detector,overview,health}.ts` | one module per resource |
| `src/lib/hooks/*` | TanStack Query wrappers — the only thing components touch |

Key behaviours the client handles for you:

- **Envelope** — every response is `{ success, message, data, meta? }`. `call()`
  returns `data`; `callWithMeta()` also returns the pagination `meta`.
- **Errors** — non-2xx responses throw an `ApiError` carrying `status`,
  `error.code` and `error.details`.
- **Token refresh** — a 401 on an authenticated route triggers one
  `POST /auth/refresh` and one retry. The exchange is single-flight, because the
  presented refresh token is single-use and two concurrent exchanges would race
  and lose the session.
- **Multipart** — `POST /policies` sends the `File` itself; `Content-Type` is
  left to the browser so the boundary is correct.
- **Downloads** — `GET /policies/:id/file` needs the Bearer header, so the
  `download_url` in a payload is not a usable `<a href>` and a raw link 401s.
  `policiesApi.download()` streams the bytes (following the 307 to a signed URL
  when there is one) and hands the browser an object URL.
- **Error codes are deterministic** — one HTTP status/code pair per condition.
  Struct-tag validation runs first, so a bad status enum or an out-of-range
  threshold is always `400 VALIDATION_FAILED`, never `422`. `422` is reserved
  for genuinely semantic failures: file format, a Synthetic claim on
  `POST /alerts`, a malformed `ai_policy_id`.

### Mock mode

`NEXT_PUBLIC_API_MODE=mock` (the default) serves every route from
`src/lib/api/mock/`. The mock returns **the same envelopes and the same
snake_case payloads as the real backend**, so the unwrap and mapping code paths
are identical in both modes — if a screen renders in mock, the mapping it relies
on is real. It also mirrors the documented behaviours: paging clamps rather than
rejects, re-adding a watched claim is a no-op, a Synthetic claim is rejected 422,
dormant claims return `npr`/`discount_factor` as `null`, and policy matchmaking
resolves asynchronously a few seconds after upload.

The mock also computes the Overview's numbers the way the backend does: the
threshold ratio, the treemap metric, the policy leaderboard and the sentiment
index are all derived from the same claims the repository ranks, on every
request. Edit a claim's Harm sub-scores and the Overview moves, because
nothing is cached and there is no parallel fixture to fall out of step.

It keeps two separate score histories on purpose, because the product depends
on the difference: the backend's watchlist-only snapshots drive the Alerts
chart and the per-claim Score History Chart, so an unwatched claim correctly
shows no history; the AI service's per-rescore history for *every* claim is
what the Overview's topic month-on-month reads, since a month-on-month figure
computed over the watchlist would describe the team's attention rather than
the topic.

Not simulated: file downloads (there are no real bytes) and the AI service.
`sentiment.status` is always `ok` in mock — the `insufficient_data` and
`unavailable` states depend on what the AI service has provisioned, so they are
handled in the UI but not reproducible without a backend.

### Switching to the live backend

```bash
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

Nothing else needs to change — read **MISSING_ENDPOINT.MD** first for the gaps
between the documented API and what the UI needs.

## Auth

Email + password, a short-lived JWT access token and a rotating single-use
refresh token. The access token lives in the `cis_token` cookie so
`src/middleware.ts` can gate routes on the edge; the refresh token sits beside it
in `cis_refresh_token`. There are **no roles** — any authenticated user may call
every route, including admin settings.

`POST /auth/logout` revokes every refresh token for the user, but the access
token is stateless and stays valid until it expires, so the client drops its own
copy too.

## Scripts

```bash
npm run dev         # dev server
npm run build       # production build
npm run start       # serve the production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```

## Project layout

```
src/
  app/
    (auth)/            login + register
    (app)/             authenticated pages under the AppShell
  components/
    ui/                design-system primitives (Button, Modal, Tabs, StatusPill,
                       InfoTooltip, CopyButton, GranularitySelect, …)
    layout/            AppShell, Sidebar, TopBar
    overview/          SentimentGauge, ThresholdRatioCard, TopicTreemap, …
    claims/            ClaimCard (reused across the repository and policy views), ScoreBreakdownPanel, …
    policies/          PolicyCard, AddPolicyModal, EditPolicyModal, …
    alerts/            ScoreLineChart, ChartLegend, WatchlistTable
    admin/             ThresholdForm, CitySelectorForm, GenerateClaimButton, …
    networks/          NetworkListView, NetworkDetailView, …
  lib/
    api/               endpoints, client, dto, mappers, one module per resource
    hooks/             TanStack Query hooks — the component-facing surface
    auth/              AuthContext + token storage
  types/               domain types (camelCase) consumed by the UI
```

## Route → endpoint map

| screen | endpoints |
|---|---|
| `/overview` | `GET /overview`, `GET /overview/topics/:id` |
| `/claims` | `GET /claims/repository` (status, topics and search in one call), `GET /topics` |
| `/claims/all` | `GET /claims` |
| `/claims/[id]`, `/predicted/[id]` | `GET /claims/:id`, `/statements`, `/score-history`, `PUT /claims/:id/status`, `POST|DELETE /alerts` |
| `/policies` | `GET /policies`, `GET /policies/years` |
| `/policies/[id]` | `GET /policies/:id`, `/processing`, `/file`, `POST /policies/:id/rematch`, `PATCH`, `PUT /policies/:id/file`, `DELETE` |
| `/alerts` | `GET /alerts`, `GET /alerts/chart`, `PATCH /alerts/:claimId/chart`, `DELETE /alerts/:claimId`, `GET /alerts/notifications`, `POST /alerts/notifications/acknowledge` |
| `/admin` | `GET /settings`, `GET|PUT /settings/alert-threshold`, `GET /settings/cities`, `GET|PUT /settings/city`, `POST /admin/generate-generic-claim`, `POST /admin/snapshot-scores` |
| `/coordinated-network` | `GET /networks`, `GET /networks/:id` and the rest of the network-detection surface |

The sidebar badge on **Alert** polls `GET /alerts/notifications` from the app
shell, so it is visible from every page.

`POST /api/v1/internal/policies/:id/matchmaking-result` is called by the AI
service, never by this frontend. It is recorded in
`INTERNAL_ENDPOINTS` in `endpoints.ts` so the contract lives in one place.
