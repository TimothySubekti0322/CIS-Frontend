# CIS — Climate Immune System (Frontend)

Frontend for the Climate Immune System platform (PRD v1.3): a structured
"immune system" for a city climate team's information environment — a claim
repository with a transparent scoring system (F1), a public-policy bank with
AI claim matchmaking (F2), an alert watchlist (F3), and admin settings (F4).

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS v4** (design tokens in `src/app/globals.css`, PRD §5.1 palette)
- **Lato** via `next/font/google`
- **TanStack Query** for server state
- **Recharts** for the F3 alert chart
- `lucide-react` icons

## Getting started

```bash
npm install
cp .env.example .env      # adjust if needed
npm run dev               # http://localhost:3000
```

Register a username + password on `/register` (really simple auth — see below),
then you land on the Claim Repository Bank.

## Environment

| var | purpose |
|---|---|
| `NEXT_PUBLIC_APP_NAME` | display name in the UI / `<title>` |
| `NEXT_PUBLIC_API_BASE_URL` | backend base URL — used only when `NEXT_PUBLIC_API_MODE=live` |
| `NEXT_PUBLIC_API_MODE` | `mock` (default, no backend) or `live` |

`.env` and `.env*.local` are gitignored. Server-only secrets (no
`NEXT_PUBLIC_` prefix) go in `.env` too once the backend exists.

## Data layer

The backend does not exist yet. `NEXT_PUBLIC_API_MODE=mock` (the default) serves
every screen from an in-memory dataset in `src/lib/api/mock/`. To switch to a
real backend:

1. Fill the path templates in `src/lib/api/endpoints.ts` (marked `// TODO`).
2. Reconcile request/response shapes in `src/lib/api/{auth,claims,policies,alerts,admin}.ts`.
3. Set `NEXT_PUBLIC_API_MODE=live` and `NEXT_PUBLIC_API_BASE_URL`.

Every component talks to the API only through the hooks in `src/lib/hooks/`,
which wrap those modules — nothing calls `fetch` directly.

## Auth

Deliberately minimal (username + password, register + login). The token lives in
the `cis_token` cookie; `src/middleware.ts` gates routes on its presence.
In mock mode, users are stored in `localStorage`.

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
    (app)/             authenticated pages (F1–F5) under the AppShell
  components/
    ui/                design-system primitives (Button, Modal, Tabs, StatusPill, …)
    layout/            AppShell, Sidebar, TopBar
    claims/            ClaimCard (reused across F1 + F2), ScoreBreakdownPanel, …
    policies/          PolicyCard, AddPolicyModal, …
    alerts/            ScoreLineChart, ChartLegend, WatchlistTable
    admin/             ThresholdForm, GenerateClaimButton
  lib/
    api/               client + endpoint map + typed modules + mock layer
    hooks/             TanStack Query hooks (the only thing components import)
    auth/              AuthContext + token cookie
    constants/         strings (i18n-ready), nav, statuses, topics
    scoring.ts         Claim Scoring System reference impl (PRD §6)
  types/               shared domain types
```

## Not yet built

- F5 Coordinated-Network Detector (PRD placeholder only)
- Real i18n wiring (copy is centralised in `src/lib/constants/strings.ts`)
- Real API contract
