# Engineering Notes

| | |
|---|---|
| **Candidate** | Boon Kien Peng (JP) |
| **Track** | Frontend Engineer — Part 0 + Part 1 + Part 2 + Part 5 |
| **Part 1** | `web/` — Operations Dashboard (React, TypeScript) |
| **Part 2** | `mobile/` — Campaign Monitoring & Alerting app (React Native CLI) |
| **Supporting** | `mock-api/` — small Node.js + Express service that simulates the Campaign API for both apps |
| **Part 5** | `docs/system-design.docx` — platform system design |

This document explains the decisions behind the Part 1 dashboard and the Part 2 app. The platform-level design (10M notifications/day, multi-tenancy, reliability, data, observability, security) is in the Part 5 document and is only summarised here where it affects the two clients.

---

## Stack

The rule I followed: use the stack I already work with, and add a library only when the brief explicitly requires that capability.

**Shared by both apps**

| Area | Choice | Reason |
|---|---|---|
| Language | TypeScript | Day-to-day stack |
| State | Zustand stores | Day-to-day stack; the brief lists Zustand as an option |
| Networking | axios + typed decoder functions | Day-to-day stack; brief asks for proper JSON parsing |
| Tests | Jest (mobile) and Vitest (web, same API as Jest) + Testing Library | Day-to-day stack |
| Mock backend | Node.js + Express (TypeScript) | Day-to-day stack |

**Part 1 — web dashboard**

| Area | Choice | Reason |
|---|---|---|
| Framework | ReactJS with Vite | Day-to-day stack; brief prefers React TypeScript |
| Styling | Tailwind CSS | Day-to-day stack; responsive layouts |
| Routing | React Router | Standard for ReactJS |
| CSV parsing | Papa Parse (streaming, in a web worker) | Brief: CSV validation and preview without freezing the page on large files |
| Charts | Recharts | Brief: delivery-rate graph, throughput, error breakdown |

**Part 2 — mobile app**

| Area | Choice | Reason |
|---|---|---|
| Framework | React Native 0.87, CLI (bare) workflow, New Architecture | Day-to-day stack; full control of native projects and build settings |
| Navigation | React Navigation (native stack + bottom tabs) + a central NavigationService | Standard for React Native CLI apps |
| Architecture | ViewModel hooks over Zustand (MVVM) | Brief asks for MVVM, MVI or Redux |
| Styling | StyleSheet with shared theme tokens (`src/ui/theme.ts`) | No extra build-time setup; colours and spacing still come from one place |
| Text | i18next, one namespace per module | Day-to-day stack |
| Offline cache | op-sqlite (`@op-engineering/op-sqlite`) | Brief: local database (SQLite) for the campaign list; fast and maintained for the New Architecture |
| Connectivity | @react-native-community/netinfo | Needed for offline behaviour |
| Local alerts | Notifee (`@notifee/react-native`) | Brief: local notification above 20% failure |
| Biometric lock | react-native-biometrics (device passcode fallback on) | Brief: FaceID / TouchID before the app opens |

---

## 1. Architecture decisions and tradeoffs

### 1.1 Repository and shared contract

| Folder | Contents |
|---|---|
| `web/` | Part 1 Operations Dashboard |
| `mobile/` | Part 2 Monitoring app |
| `mock-api/` | Simulated Campaign API used by both |
| `shared/contracts.ts` | TypeScript types for every API response, used by `web/` and `mock-api/` so the two can't drift apart. The mobile app keeps its own runtime decoders because it must validate data at runtime anyway. |
| `docs/` | Part 5 document and diagram |

The three apps are plain folders, not Yarn workspaces. Workspaces with React Native cause Metro and native-package hoisting problems I've had to fix before, and the only thing shared is one types file.

### 1.2 Web dashboard (Part 1)

| Area | Decision |
|---|---|
| Structure | Feature folders (`campaign-create`, `campaign-list`, `campaign-detail`), each with its components, a Zustand store and API calls. Same module idea as the mobile app. |
| State | Zustand holds server data per feature (list page, current campaign) and UI state (filters, form). Filters and page number are mirrored into the URL so a filtered view can be shared or refreshed. |
| Create campaign | Form fields from the brief. Schedule is "Now" or a date-time that must be in the future. |
| CSV validation | Parsed in a web worker with Papa Parse so a large file never freezes the page. Checks: header is exactly `recipientId,email,phone`; recipientId present and unique; email valid; phone in international format; the column needed for the chosen channel is present (EMAIL → email, SMS → phone). Shows the first 5 rows as a preview, the total row count, and the first 100 errors with row numbers. Submit is disabled while there are errors. |
| Upload | axios `onUploadProgress` drives a progress bar. Each submit sends an `Idempotency-Key`, so a double click or retry can't create two campaigns. A failed upload can be retried without re-selecting the file. |
| Campaign list | Table with the brief's columns. Search by campaign ID or name; filter by tenant, channel and status; server-side pagination. Polls every 5 s, pauses when the browser tab is hidden, and keeps the current page and filters when new data arrives. |
| Campaign detail | Delivery rate over time (line chart), throughput in messages per minute (bar chart), error breakdown by reason, and retry queue size. Polls while the campaign is RUNNING and stops once it finishes. |
| States | Every data view has loading (skeleton), error (message + retry button) and empty states. |
| Responsive | The list table turns into stacked cards on narrow screens; charts resize to their container. |

### 1.3 Mobile app structure (Part 2)

The app is split into feature modules under `src/modules/`, imported through an `@modules/*` path alias. This is the same structure I use on a production insurtech React Native app: a module per feature, a Zustand store per module, i18n namespaces registered by each module, and a central NavigationService.

| Module | Responsibility |
|---|---|
| `campaign-health` | Live campaign list, health colour, pull-to-refresh, polling, offline banner |
| `push-preview` | Shows how a message template appears as a system push notification on iOS and Android, across widths and collapsed/expanded states |
| `alerts` | Detects campaigns above 20% failure and fires a local notification |
| `security` | Biometric lock and hiding the screen in the app switcher |

Each module has the same folders: `screens/`, `viewmodels/`, `store/`, `services/`, `components/`, `i18n/` and an `index.ts` that is its only public entry point. Shared code is in `src/core/` (API client, decoders, SQLite repository, NavigationService, logger) and `src/ui/` (colours, spacing, basic components).

| Layer | Role |
|---|---|
| Screen | Renders what the ViewModel gives it; no logic |
| ViewModel hook | Prepares data for the screen and handles user actions; unit-testable without rendering |
| Zustand store | Holds module state |
| Repository | Single place that reads and writes data: fetches from the API, saves to SQLite, and serves the screen from SQLite |
| API client | axios calls; every response passes through a decoder before it is used |

### 1.4 Mobile decisions

| Decision | Chosen | Alternative | Why / tradeoff |
|---|---|---|---|
| React Native CLI vs Expo | React Native CLI (bare) | Expo | Matches how regulated finance/insurance apps are usually shipped: native projects are in the repo, so permissions, signing and native config are visible and reviewable. Cost: native libraries need `pod install` and Gradle setup, which Expo would hide. Native libraries are kept behind small adapters (`alerts/notifier.ts`, `security/biometrics.ts`, `core/db/`) so they can be swapped. |
| Where data comes from | SQLite is the source of truth: network → SQLite → screen | Keep data only in memory | Offline support is required. With one read path the screen behaves the same online and offline. Cost: I write the refresh and polling logic myself (about 60 lines). |
| JSON parsing | Hand-written typed decoders for each response | Casting responses with `as` | Equivalent of the brief's "Codable". A malformed response is rejected at the boundary and the last good data stays on screen, instead of crashing deep in the UI. |
| Live updates | Poll every 8 s while the screen is open, plus pull-to-refresh | WebSocket | The mock API is plain HTTP, and polling recovers easily after losing the network. Polling stops when the screen isn't visible or the app is in the background. |
| Module boundaries | `@modules/*` path aliases inside the app | Separate packages | Gives clear boundaries without package tooling; a module can be moved into its own package later with no code changes |
| Small settings | A key-value table in the same SQLite database | Another storage library | Only a few values (last sync time, last unlock time), so there's no need for a second storage library. |

### 1.5 Mobile — health status (Feature 1)

| Rule | Value | Reason |
|---|---|---|
| Failure rate | failed ÷ (sent + failed) | Pending messages haven't been tried yet. Dividing by the total would hide a campaign that is failing early. |
| Minimum sample | 50 attempts before a campaign can turn red | Otherwise the first failure of a new campaign shows 100% and triggers an alert |
| HIGH_FAILURE (red) | Failure rate above 20% | From the brief |
| HEALTHY (green) | Everything else | From the brief |
| Configurable | Threshold and minimum sample come from config | Can be tuned per environment |

### 1.6 Mobile — Push Notification Previewer (Feature 2)

| Item | Detail |
|---|---|
| Component | `NotificationPreview` is a pure component (template, sample data, platform, state, width → view). No store, no side effects, so it is easy to snapshot-test. |
| Styles shown | iOS banner, iOS lock screen (collapsed and expanded), Android collapsed, Android expanded text, Android expanded with image (rich media) |
| Widths | 320 (iPhone SE), 360 (small Android), 390 (standard iPhone), 430 (large iPhone), 600 (tablet) |
| Truncation | Line limits per platform and state, close to how each OS cuts text; a character counter warns when text will be cut |
| Template variables | `{{firstName}}`-style placeholders are filled from sample data; unknown variables are highlighted so mistakes are visible before sending |

### 1.7 Mobile — critical alerts (Feature 3)

| Rule | Detail |
|---|---|
| When it checks | After every successful sync |
| Trigger | A campaign becomes HIGH_FAILURE and hasn't been alerted yet → local notification |
| No repeats | An "alerted" flag per campaign is saved in SQLite, so restarting the app doesn't alert again |
| Re-arm | The flag clears only when the failure rate drops below 18%. A campaign moving around 20% doesn't send repeated alerts. |
| Tap to open | Tapping the alert opens that campaign. NavigationService waits until navigation is ready, which covers taps that launch the app from closed. |

### 1.8 Mobile — biometric lock (Feature 3)

| Rule | Detail |
|---|---|
| When it locks | On app start, and when returning after more than 30 s in the background |
| Method | FaceID / TouchID / fingerprint, with the device passcode as fallback |
| No biometrics set up | Falls back to passcode; if there is no passcode either, a clear message is shown. The app never unlocks silently. |
| Nothing loads early | The lock screen sits above navigation, so no screen and no data request starts before unlock |
| App switcher | When the app goes inactive, a cover hides the content from the app-switcher preview |

### 1.9 Mock API

| Item | Detail |
|---|---|
| Purpose | Gives both apps realistic, changing data without the Part 3 backend |
| Endpoints | `POST /campaigns` (CSV upload), `GET /campaigns` (search, filter, pagination), `GET /campaigns/:id`, `GET /campaigns/:id/metrics`, `POST /campaigns/:id/retry-failures` — same shape as the brief's Campaign API, so a real backend can replace it by changing one URL |
| Behaviour | 100 sends per minute per channel shared fairly between running campaigns, 15–25% failure rate per attempt, retries with backoff, as in the brief. `SIM_SPEED` (default 10) speeds this up so demos finish in minutes. |
| Demo campaign | One campaign is scripted to go above 20% so the alert can always be demonstrated |
| Error mode | `?chaos=1` adds server errors, slow responses and one malformed response, to test the app's error handling |

---

## 2. How the system scales

| Area | Approach |
|---|---|
| Large CSV files (web) | Parsed in a web worker in chunks; only the preview rows and error list are kept in memory. The file itself is streamed in the upload. |
| Campaign list (web) | Pagination happens on the server, so the browser only ever holds one page; polling pauses when the tab is hidden. |
| Long lists (mobile) | FlatList with memoised rows keyed by campaign ID; a sync only re-renders rows whose numbers changed |
| Sync cost (mobile) | Only active campaigns are fetched on each poll; finished campaigns come from SQLite. Each sync is saved in one SQLite transaction. |
| Network load | Polling stops when the screen isn't visible or the app is in the background. At larger scale, polling would be replaced by a live feed (see Part 5). |
| Code growth | New features become new modules; the app shell only imports each module's `index.ts`, so modules can be owned separately |

Platform side, summarised from Part 5: 10M notifications/day is about 116 per second on average and about 1,200 at peak. The real limit is the provider rate limit (100 requests per minute per channel per provider account). The design treats each provider account and channel as a "lane" and adds lanes to reach the volume needed, using Node.js workers and PostgreSQL.

---

## 3. Failure scenarios considered

| Scenario | What the apps do |
|---|---|
| CSV with wrong header, extra columns or a byte-order mark (web) | Header error shown before upload; a byte-order mark from Excel is stripped instead of failing |
| CSV with bad rows (web) | Row-level errors with row numbers; submit disabled until fixed |
| Very large CSV (web) | Parsed in a worker with a progress indicator; errors capped at 100 shown with a total count |
| Upload fails part-way (web) | Clear error with a Retry button; the same Idempotency-Key is reused so a retry can't create a duplicate campaign |
| Double-click on Submit (web) | Button disabled during upload, plus Idempotency-Key on the server |
| Browser tab in the background (web) | Polling pauses and refreshes immediately when the tab is visible again |
| No network (mobile) | Cached list shows immediately from SQLite, with a banner "Offline · last synced X min ago". Pull-to-refresh shows a short message instead of spinning forever. Polling restarts when the network returns. |
| Server error or timeout | Polling slows down (8 → 16 → 32 s, up to 60 s). Cached data stays on screen; the error is shown inline, not as a blocking popup. |
| Malformed response | The decoder rejects it, the error is logged with the endpoint, and the last good data stays on screen |
| New campaign's first failures | The minimum sample stops a false red status and alert |
| Failure rate moving around 20% | The 18% re-arm rule stops repeated alerts |
| App closed and reopened | Cache and alerted flags are saved, so there are no duplicate alerts and no empty first screen |
| Alert tapped while the app is closed | NavigationService waits until navigation is ready, then opens the campaign |
| Notification permission denied | The app still works and the red status still shows in the list; showing the alert fails quietly, and the campaign is not marked as alerted, so it alerts if permission is granted later |
| Biometrics missing or cancelled | Falls back to passcode; cancelling keeps the lock screen with a retry button |
| Wrong phone clock | "Last synced" uses the server's time from the response header |
| App left on a sensitive screen | The app-switcher cover hides the content |

---

## 4. Known limitations

| Limitation | Detail |
|---|---|
| Alerts only while the app is running | iOS and Android don't guarantee background work at a fixed interval, so in-app checks are reliable only while the app is open. The proper fix is server-side alerts sent as push notifications (Part 5). |
| Mock backend | The app is tested against the mock API, not a real Campaign Service. The data shape follows the brief, but real authentication and error formats aren't tested. |
| No login or tenant security in either app | tenantId is a form field (as in the brief) and a filter, not a security boundary. Real isolation must be enforced by the server (Part 5, Security). |
| Cache isn't encrypted | The biometric lock protects the screens, but the SQLite file isn't encrypted on a rooted or jailbroken device |
| Previews are close, not exact | Phone makers and OS versions change how notifications look; the previewer models standard iOS and standard Android |
| English only | i18n is set up but there are no other languages yet |
| Notifee maintenance | Notifee is the most widely used local-notification library but receives few updates. It is isolated in `alerts/notifier.ts`, so replacing it touches one file. |
| App-switcher cover on Android | The cover appears when the app goes to the background, which can be after Android takes its recents snapshot. Production would set `FLAG_SECURE` on the activity (it also blocks screenshots, so it's left off for the demo). |
| Testing depth | Unit tests cover CSV validation, the health rules, alert re-arm logic, decoders and template rendering, plus component tests for the web list and snapshot tests for previews. 56 automated tests in total (mock API 10, web 15, mobile 31). There are no automated tests on a real device. |

---

## 5. What would change in production

| Area | Change |
|---|---|
| Alerts | Detect failures on the server and send push notifications to on-call staff; keep the in-app check as a backup |
| Live data | Live feed (for example Supabase Realtime or WebSocket) for both apps instead of polling; polling only as a fallback |
| Large uploads (web) | Upload the CSV straight to storage with a signed URL and resumable upload, so very large files don't pass through the API |
| Login and tenants | Real login with a JWT that carries the tenant, stored securely on the device; the server enforces tenant access with Row Level Security |
| Stored data | Encrypt the local cache; clear it on logout or tenant switch |
| Network security | Certificate pinning and rooted/jailbroken device checks, as expected in finance and insurance apps |
| Monitoring | Crash and performance reporting behind the existing `logger`, with personal data masked |
| App-switcher privacy (Android) | Set `FLAG_SECURE` on the main activity |
| Builds | Separate DEV / UAT / PROD configs (Android product flavours, iOS schemes), CI builds with Gradle and Xcode (Fastlane), signed store builds, staged store releases |
| Testing | Automated end-to-end tests for offline, alert and lock flows, and checks that the app's decoders match the real backend's responses |
| Structure | Move shared contracts and UI tokens into workspace packages if more code ends up shared between web and mobile |

---

## 6. AI assistance

I used Claude (Anthropic) as a pair programmer, working under a project `CLAUDE.md` that sets the module structure, naming, and the rule "fix root causes, not symptoms". That file is in the repository so reviewers can see the rules it worked under.

| Area | What AI did | What I did |
|---|---|---|
| Planning | Helped split the brief into a schedule and a cut list | Chose the track, the scope and what to cut |
| Part 5 design document | Drafted the structure, capacity maths and first-draft text | Set the design direction and tech choices, checked the numbers, edited for accuracy |
| This document | Drafted from my decision notes during the build | The decisions and tradeoffs are mine; reviewed and edited every line |
| Project setup and boilerplate | Generated setup, decoders, mock API skeleton and test skeletons | Reviewed, reorganised into my module structure, ran on device |
| Feature code | Helped with CSV validation, charts, the preview component, alert logic and lock flow | Designed the behaviour (validation rules, re-arm at 18%, minimum sample, lock timing), debugged in the browser and on real devices, checked edge cases |
| Diagrams | Generated the architecture diagram from my component list | Decided the components and flows |

Everything AI produced was reviewed, run and tested by me before it was committed, and I can explain any line in the repository.
