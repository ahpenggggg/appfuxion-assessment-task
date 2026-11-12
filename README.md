# Multi-Tenant Notification & Campaign Platform — Frontend Engineer submission

**Candidate:** Boon Kien Peng (JP) · **Track:** Frontend Engineer — Part 0 + Part 1 + Part 2 + Part 5

| Part | What | Where |
|---|---|---|
| 0 | Engineering notes | [`ENGINEERING_NOTES.md`](ENGINEERING_NOTES.md) |
| 1 | Operations Dashboard (React + TypeScript) | [`web/`](web) |
| 2 | Campaign Monitoring & Alerting app (React Native CLI) | [`mobile/`](mobile) |
| 5 | System design (Word) + architecture diagram | [`docs/sysdesign.docx`](docs/sysdesign.docx), [`docs/architecture.png`](docs/architecture.png) |
| — | Mock Campaign API used by both clients | [`mock-api/`](mock-api) |
| — | API contracts and CSV rules shared by all three packages | [`shared/`](shared) |

## Repository structure

```
.
├── shared/               contracts.ts (API types) and csvRules.ts (CSV validation), imported by every package
├── mock-api/             Express + TypeScript mock Campaign API (src/, test/)
├── web/                  React + Vite dashboard
│   └── src/
│       ├── features/     campaign-create, campaign-list, campaign-detail (page + store + tests each)
│       ├── components/   Shared UI primitives
│       └── lib/          API client, polling hook, formatting
├── mobile/               React Native CLI app
│   └── src/
│       ├── app/          Navigation, NavigationService, i18n, module registration
│       ├── core/         API client + decoders, SQLite repositories, health rules, config
│       ├── ui/           Theme and shared components
│       └── modules/      campaign-health, push-preview, alerts, security
├── docs/                 System design document and architecture diagram
├── .github/workflows/    CI
├── ENGINEERING_NOTES.md  Part 0: decisions, scaling, failure scenarios, limitations
└── CLAUDE.md             Project rules for AI-assisted work
```

Each web feature and mobile module owns its screens, store, API calls and tests, and is imported by others only through its public entry. See [`mobile/README.md`](mobile/README.md) for the mobile module layout in detail.

## Quick start

Requirements: Node.js 22+ and npm.

```bash
# 1. Mock API (http://localhost:4000)
cd mock-api
npm install
npm start

# 2. Web dashboard (http://localhost:5173) — in a second terminal
cd web
npm install
cp .env.example .env   # optional; defaults to http://localhost:4000
npm run dev
```

```bash
# 3. Mobile app — see mobile/README.md for emulator, device and iOS details
cd mobile
npm install
npm run android        # or: cd ios && bundle exec pod install && cd .. && npm run ios
```

## Mock API

A small Node.js + Express service that simulates the brief's Campaign API so both clients have live, changing data.

| Endpoint | Purpose |
|---|---|
| `POST /campaigns` | Multipart upload: `tenantId`, `name`, `channel`, `messageTemplate`, `scheduledAt` (optional ISO) then the `recipients` CSV. Streams and validates the CSV row by row, returns **202** with the campaign. Supports `Idempotency-Key`. |
| `GET /campaigns` | `search`, `tenantId`, `channel`, `status`, `page`, `pageSize` |
| `GET /campaigns/:id` | One campaign |
| `GET /campaigns/:id/metrics` | Per-minute sent/failed, delivery rate, throughput, error breakdown, retry queue size |
| `POST /campaigns/:id/retry-failures` | Re-queue failed messages |
| `GET /tenants` | Tenant IDs for filters |
| `GET /health` | Liveness check |

Simulation follows the brief: 100 sends/min per channel shared fairly between running campaigns, 15–25% failure per attempt, retries with exponential backoff (max 3 attempts), permanent errors not retried. Environment options:

| Variable | Default | Effect |
|---|---|---|
| `PORT` | `4000` | Port |
| `SIM_SPEED` | `10` | Multiplies the 100/min limit so demos finish in minutes. Set `1` for the brief's real limit. |
| `CHAOS` | off | `CHAOS=1` (or `?chaos=1` on a request) injects 500s, 3 s delays and malformed responses to test client error handling |

Seed data includes 14 campaigns across 4 tenants. **`cmp_0006` "Flash sale (SMS)"** is scripted to run above 20% failure, so the red status and the mobile alert can always be demonstrated.

## Web dashboard (Part 1)

| Feature | Highlights |
|---|---|
| Create campaign | All brief fields; CSV checked in a **web worker** (header, required columns per channel, email/phone format, duplicate IDs); first 5 rows preview; up to 100 row errors with row numbers; upload progress bar; retry-safe with `Idempotency-Key` |
| Campaign list | Search, tenant/channel/status filters and pagination (all in the URL); **live polling every 5 s** that pauses when the tab is hidden; failure rate above 20% highlighted; table on desktop, cards on mobile |
| Campaign detail | Delivery-rate line chart, throughput bar chart, error breakdown, retry queue size, KPI tiles, retry-failed action; polls every 3 s while running |
| Everywhere | Loading skeletons, error states with retry, empty states, responsive layout |

Stack: React 19, TypeScript, Vite, Tailwind CSS, React Router, Zustand, axios, Papa Parse, Recharts, oxlint, Vitest + Testing Library.

The API base URL comes from `VITE_API_URL` (see [`web/.env.example`](web/.env.example)).

```bash
cd web
npm run typecheck && npm run lint && npm test
```

## Mobile app (Part 2)

| Feature | Highlights |
|---|---|
| Real-time health | Active campaigns with Sent/Failed/Pending; green HEALTHY / red HIGH_FAILURE (above 20%, after 50 attempts); pull-to-refresh; polling every 8 s that pauses in the background and backs off after errors; **SQLite cache** so the list works offline with a "last synced" banner |
| Push previewer | iOS and Android, collapsed and expanded, 5 screen widths (or all at once), rich media image, `{{placeholder}}` filling with missing values highlighted, truncation warnings |
| Critical alerts | Local notification when a campaign passes 20% failure; once per campaign (saved in SQLite), re-armed below 18%; tapping opens the campaign, even from a closed app |
| Biometric lock | Face ID / Touch ID / fingerprint with passcode fallback, on start and after 30 s in the background; nothing loads before unlock; app-switcher cover |

Stack: React Native 0.87 (CLI, New Architecture), TypeScript, React Navigation, Zustand (MVVM ViewModel hooks), axios + decoders, op-sqlite, NetInfo, Notifee, react-native-biometrics, i18next, ESLint, Jest + Testing Library.

The API address is set in [`mobile/src/core/config.ts`](mobile/src/core/config.ts): Android emulator `http://10.0.2.2:4000`, iOS simulator `http://localhost:4000`, or your computer's LAN IP on a physical device.

```bash
cd mobile
npm run typecheck && npm run lint && npm test
```

## Tests

| Package | Command | Covers |
|---|---|---|
| `mock-api` | `npm test` | CSV rules, rate limit and fair sharing, scheduling, retry-failures |
| `web` | `npm test` | CSV analysis, form validation, formatting, campaign list states and filters |
| `mobile` | `npm test` | Health rules, decoders, health store, alert decisions and re-arm, sync + offline cache, NavigationService queueing, re-lock rule, template/layout rules, preview snapshots |

| Job | Steps |
|---|---|
| `mock-api` | typecheck, test |
| `web` | lint, typecheck, test, production build |
| `mobile` | lint, typecheck, test, Android JS bundle (checks every import resolves without the Android SDK or Xcode) |

## AI assistance

See [ENGINEERING_NOTES.md §6](ENGINEERING_NOTES.md#6-ai-assistance) 
