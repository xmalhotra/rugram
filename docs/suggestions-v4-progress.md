# Suggestions v4 implementation progress

## Latest compatibility correction — iPhone Expo Go

2026-10-23: The user's device now reports Expo Go for SDK 58, rejecting the SDK
57 project. The app is being aligned to SDK 58 using Expo's bundled compatibility
map, including React Native 0.88 and the stable native-tabs entry point. This
supersedes the earlier downgrade below. Demo login remains enabled locally.
Validation: Expo install --check is aligned; Expo Doctor passed 20/20 checks;
backend and mobile typechecks, 266 regression tests and the iOS Hermes bundle
export passed. SDK 58's Xcode 4 uses native crypto UUIDs, so the obsolete UUID
override and its dependency-specific test were updated. The calendar export now
awaits File.write before sharing. npm still reports 20 high-severity advisories;
these are not resolved or suppressed by this compatibility upgrade. Physical
device confirmation remains outstanding; a bundle is not device proof.

### Historical SDK 57 correction

The user encountered an SDK-version rejection on their physical iPhone after the
SDK 58 upgrade and explicitly approved returning to SDK 57. This supersedes the
SDK 58 version statements below, which remain historical. All mobile native
packages aretil being aligned to SDK 57; app features and database contents are
preserved. Verification: Expo dependency check, mobile typecheck, accessibility
scan, 240 regression tests and the iOS JavaScript/Hermes export passed. Physical
iPhone testing must still be retried in Expo Go. Do not upgrade the SDK again without checking the actual Expo Go
release available for the user's physical device. Bundling is not device proof.

## Current continuation — SDK 58 and member foundations

This entry supersedes the stop notes below; older entries are historical.
The full v4 roadmap is **not complete**.

### Additional continuation: onboarding, calendar and trust reporting

- UI3 now has a separate illustrated focus → starter preview → optional city
  journey in Home, with Back/progress, source links and the shared health note.
  OTP uses six visual boxes over one native autofill/paste input. Test-account
  shortcuts require explicit local-demo configuration. Native timing/accessibility
  acceptance is still unverified.
- A5 uses the subsequently approved `expo-sharing` with generated ICS files.
  Tests cover explicit IST start/end, date-only events, missing ends, cancellation,
  text escaping and UTF-8 folding. Native calendar import is still unverified.
- UI4 partial: joined-flow details support completion toggles; Home flow cards
  show today's progress and an explicit Remove from Home action. B11 now has a
  safe public-venue maps query (no location permission); shared-flow attendee
  aggregates and the remaining layout work are not yet implemented.
- A7: member report form, own-report status, authentication, bounded reasons/notes,
  duplicate protection and creator anonymity. Admin Trust has the reports portion
  of E2, grouped within paginated pages; resolution creates one inbox/audit entry
  transactionally. Migration 018 applied locally. Stale-source verification and
  combined Trust badge remain pending; resolution alone never archives an item.
- User approved the date-safe offline replay backend change. Migration 019 gives
  completion actions an original-day/request-ID contract with a 28-day window,
  per-account serialisation, receipt/body-conflict checks and atomic analytics.
  Local tests pass concurrent duplicate and opposite-action retry scenarios.
  The durable on-device queue/cache is still pending, not implied by this server
  foundation. Legacy no-request-ID calls remain compatible.
- Last full batch: 236 regression tests passed, both typechecks and backend ESLint
  passed. Reports, inbox/search and account-privacy Postgres integrations passed.
  Completion-specific tests passed after that batch; regression checks rerun below.

Latest verification: **238 regression tests passed**, backend/mobile typechecks
and backend ESLint passed; the latest iOS and Android JavaScript exports passed. Local report,
inbox/search, privacy and completion-replay integrations passed. Native device
build/testing remains blocked by the absent platform toolchains, not by a claim
that the remaining features have been completed.

UI12 automated portion: a TypeScript-AST accessibility scan found and corrected
26 missing native pressable labels; it now passes and runs in CI. Cross-platform
minimum touch dimensions were raised from 44 to 48 where explicitly specified.
The ten-task physical VoiceOver/TalkBack checklist is recorded as **not tested**
in `docs/mobile-accessibility.md`. The full accessibility prompt is therefore
not marked complete merely because the static scan passes.

- The user authorised broader Expo changes and the notification, network,
  storage, image-picker and haptics packages. Mobile now uses Expo 58.0.14,
  React Native 0.88 and Node 24.12.0. Installed packages are not all wired yet.
- iOS and Android JavaScript/Hermes exports passed. A native development build
  cannot run on this machine yet: full Xcode/simctl and an Android SDK are absent.
  Exports are not native-build or physical-device verification.
- UI1/UI2 foundations: per-account/per-tab pane state and scroll restoration,
  refresh/retry states, defensive API parsing, session-expiry handling, stale
  response guards, optimistic desired-state actions, rollback and undo toasts.
  Large-catalogue scrolling and all device layout checks remain unverified.
- B1/B2: Today check-offs and timezone-aware 28-day completion history are wired.
  Explicit weekly schedules and tomorrow preview are still pending; free-text
  rhythms are not guessed into schedules.
- A1: shared search, per-account recent queries and authenticated bounded database
  search beyond bootstrap pagination. Auth, publication, wildcard escaping and
  event scope checks passed against the isolated local database.
- A2: migration 017 adds transactional, idempotent, recipient-scoped inbox items;
  member/creator/admin inboxes support polling, read states and pagination.
  Report resolution is reserved for A7/E2; some admin destination UX is pending.
- A4: share messages, authenticated item lookup and sign-in-preserving detail
  routes are implemented. Cold-start native deep links still need device checks.
- UI7/B7 partial: shared health/commercial notes, seller destination confirmation,
  source freshness and contextual reason lines. App-wide coverage is not complete.
- Stories no longer auto-advance while reading, as specified by v4 UI4.
- Regression suite previously passed 224 tests. Latest search changes passed both
  typechecks and local inbox/search integration; the full suite is rerun per batch.

Release gates remain open: 20 high dependency/metavulnerability findings from
braces/node-forge, native build/device accessibility and layout checks, live OTP
delivery, and substantial remaining v4 feature work. No deployment, paid service,
real SMS or production account use occurred. P2 work remains conditional on metrics.

Offline queue design: the approved original-day/idempotency contract is now in
place and tested. A9 still needs device persistence, safe action replay, cache
erasure, connectivity UI and disabled unsafe actions; do not claim offline sync works.

## Latest continuation — approved targeted security update

This section supersedes the dependency status below.

- Preserved Expo SDK 57 and pinned only `xcode > uuid` to patched `11.1.1`.
  Regression tests verify CommonJS and Xcode identifier generation.
- Mobile audit reduced from 30 to 22 findings (19 high, 3 moderate). Remaining
  underlying advisories are braces, node-forge and decode-uri-component.
- Registry latest braces/node-forge versions remain affected. The patched decoder
  changes module format and cannot safely replace its CommonJS dependency in
  place. No force-fix, suppression, SDK downgrade or build was performed.
- Backend/mobile typechecks pass; Expo public configuration resolves. Expo's
  compatibility check fails on package-version drift; see the exact recommended
  versions and remaining security paths in `docs/mobile-dependency-audit.md`.

Hard blocker: there is no currently verified compatible fix for the remaining
audit gate under the approved constraints. Release readiness and remaining v4
work are **not complete**. Continue only after resolving the upstream fixes or
agreeing on a reviewed compatibility/backport plan; do not mark the gate passed.

## Latest continuation — after splash-package approval

- Installed `expo-splash-screen` using `expo install`, keeping SDK 57 alignment.
- D1 brand assets now include SVG master, opaque iOS 1024×1024 icon, Android
  adaptive/monochrome artwork, white notification silhouette and light/dark splash
  images. The in-app mark uses code-drawn SVG and an accessible BetterHabits label.
- Reproducible asset generation uses existing Sharp tooling. Automated checks
  verify dimensions, alpha rules and the adaptive foreground's 66% safe zone.
- `expo config --type public --json` resolves the native icon and splash paths.
  Backend/mobile typechecks pass. Native build/prebuild and release-splash device
  verification have not been performed; no deployment or SMS sending occurred.
- Current mobile audit: 30 findings (19 high, 11 moderate). Some automated fixes
  propose incompatible major downgrades. See `docs/mobile-dependency-audit.md`.
  Dependency remediation approval was requested before changing other packages.
  This remains an open release gate; no unsafe force-fix was applied.

The previously requested splash dependency is no longer blocked. The app-shell
and remaining v4 work are still pending; this entry does not mark the roadmap
complete. Awaiting direction on targeted security dependency changes versus
continuing features with the audit gate explicitly open.

## Latest continuation — after Prettier approval

This section supersedes earlier status notes below.

- Installed the explicitly approved Prettier development dependency. No mobile
  runtime package has been added in this continuation.
- Formatted `mobile/App.tsx`, `AdminWorkspace.tsx` and backend modules; extracted
  `CreatorStudio` and `useCreatorSubmit`. The backend facade now delegates to
  bootstrap, profile, catalogue, analytics, review, RSVP and state modules.
  Formatting checks and backend/mobile typechecks pass.
- Implemented the Stage 0 moderation loop: own-pending edits and withdrawal,
  required archive/rejection reason, creator-visible feedback, audit persistence
  and a database trigger preventing withdrawn publication. Migration 016 applied
  only to `betterhabits_local`. Local Postgres moderation tests pass.
- D2/D4 code foundations: live system appearance, saved System/Light/Dark override,
  matching status bar, dark-only ambient artwork, semantic colour/type tokens and
  Dynamic Type caps. Automated contrast tests pass in light and dark. Physical
  device appearance/large-text checks are not yet completed.
- D3 primitives: accessible queued toasts, banners, empty/loading states, search,
  chips, native iOS segmented picker, status pills, safe-area action bars, progress,
  avatars and wizard helpers. Explicit Field configuration replaces label-based
  heuristics; product/seller limits now match server limits. A guarded admin
  component catalogue is available through Design system preview.
- D5 helpers centralise INR grouping, IST date/time, habit and Monday-week keys,
  relative source checks and unknown-price/fee copy. Mobile locale formatting
  call sites use these helpers. Added SVG charts with empty/text alternatives.
- Full regression suite passes; local phone and moderation integrations pass;
  targeted ESLint and formatting checks pass. No native build, prebuild, commit,
  deployment or SMS sending has been performed.

Approval gate: UI1 references the D1 brand/icon/splash foundation. The recommended
Expo splash config plugin package (`expo-splash-screen`) is absent; approval was
requested before installing it. Pending approval, no splash dependency/config
change was made. The remaining app-shell, feedback rollout and subsequent v4
features are **not complete**. P2 briefs still require metrics validation, per v4.

## Current status — 17 October 2026

This section supersedes the earlier stop notes below; those are retained as history.

Completed and verified:

- Fixed the phone integration script's CommonJS/top-level-await mismatch.
- Local Postgres has migrations 001–015. MSG91 widget REST support uses the
  server-side key and validates the verified token's phone against its challenge.
- The phone database test passes: cooldown, concurrent single-use verification,
  unique account creation, nullable password and suspension guard. HTTP responses
  are simulated; no SMS has been sent. Real provider credentials/widget validity
  and live SMS delivery are still unverified.
- Transactional migration runner: rollback removes partial DDL and history;
  PL/pgSQL bodies execute intact; concurrent runners apply a file exactly once.
  Expand/contract guidance is in `docs/migrations.md`.
- Account export/deletion endpoints and Profile controls. Local database tests
  verify private-data erasure, session invalidation, no token/guest leakage,
  unrelated accounts preserved and administrator deletion refused. Retention and
  host-deletion consequences are documented in `docs/account-privacy.md`.
- Suspension and role changes revoke sessions in the same database transaction.
  Tests prove unsuspending does not revive an old token and suspended accounts
  cannot create new sessions. The same revocation is implemented in demo mode.
- Regression suite: 191 tests passed. Backend/mobile typechecks and targeted
  ESLint were run. Native VoiceOver/TalkBack and account-share-sheet device
  validation have not been performed.

Next ordered task: Stage 0 formatting and file split. The requested Prettier
tool is absent from both dependency trees and the global PATH. Dependency approval
has been requested before adding it; alternatively the user may approve using
existing formatting tools. No dependency was added and no build, commit or
deployment was run. Remaining Stage 0 moderation work and Stages 1–5 are pending;
the full v4 roadmap is **not complete**.

## Stage 0: explicit demo-mode enforcement

Completed as one bounded change. Other roadmap items remain pending.

- Demo data requires explicit `RUGRAM_DEMO_MODE=true` in a local/test runtime.
- Missing `DATABASE_URL` no longer silently activates demo mode.
- The Next.js startup hook rejects missing or malformed database configuration
  outside demo mode, and rejects demo mode in deployed environments.
- `NODE_ENV=production`, `APP_ENV=preview|staging|production`, or
  `VERCEL_ENV=preview|production` identifies a deployed environment. Non-Vercel
  hosts must set `APP_ENV` accurately. Invalid flags fail with credential-safe errors.
- Mock OTP requires explicit local demo mode, independently of database absence.
- `.env.example` defaults to database mode. CI keeps production compilation in
  its database-backed job, not its demo verification job.

### Verification

- Targeted runtime configuration and OTP suite: 10 tests passed.
- Backend TypeScript check passed.
- Targeted ESLint check passed.
- Local hosted-event simulation passed across user, creator and admin roles,
  including capacity and cancellation checks. This is not database concurrency
  verification.
- Startup hook tested directly in isolated processes, without launching Next.js.
  Database URL validation does not prove connectivity or schema readiness.
- No dependency changes, rebuilds, commits or deployments performed for this item.

### Still required

Stage 0 still includes integration verification of phone identities and SMS,
transactional migrations, account export/deletion, and session revocation on
role/suspension changes. This change does not make authentication or the app
production-ready. Continue with the roadmap's Stage 0 before later UI/features.

## Sequential checklist run: stopped at the first external dependency

The first remaining `suggestions.md` item now has an additive phone-identity
migration, MSG91 adapter, durable challenge store and verified-phone account
lookup. It is **not checked off**: the migration and live sign-in are unverified.

Verification: 14 configuration/OTP/MSG91 tests passed, backend typecheck passed,
and targeted ESLint passed. Adapter tests simulate provider HTTP and challenge
storage; they do not certify SQL concurrency or live delivery.

Stopped before subsequent checklist items because `DATABASE_URL`,
`MSG91_AUTH_KEY` and `MSG91_TEMPLATE_ID` are missing. Resume with a dedicated test
database and approved MSG91 OTP template; do not use a production database or
send test SMS to anyone without permission. No migration was applied, SMS sent,
dependency installed, build run, commit created or deployment performed.

## Improvement plan run: six batches

All six batches from the improvement plan are done. Items were ticked in
`suggestions.md` only after verification. Partly done items carry a "Partly
done" or "Done:" note.

### Release blockers and moderation (verified, already implemented)

- Phone identity (migration 014), fail-closed demo mode, transactional migrations,
  account export and deletion, and session revocation on suspension all pass their
  database scripts. Live MSG91 SMS delivery is still unverified.
- Moderation: creators can edit and withdraw their own pending items. Rejection
  needs a reason, which Studio shows, and creators get inbox notifications.
  `test-moderation` and `test-notifications` pass.

### Member core loop

- Already in place: step completion (`TodayChecklist`), 401 sign-out, offline
  logout, non-JSON error parsing, account-scoped pane state that survives tab
  switches, and the root `FlatList` (`RootList`) with virtualised horizontal shelves.
- Fixed: the accessibility scan now includes `mobile/App.tsx`, and the past RSVP
  rows on You now have a role and a label.

### Admin safety

- Migration 020 adds `account_audit`: before/after name, handle, role and
  suspension, plus reason, actor and revoked-session count. Each row is written in
  the same statement as the update.
- Role and suspension changes need a reason of at least 3 characters, enforced on
  the server. The mobile app shows a confirmation summarising the change and lists
  the account history in the person sheet.
- People loads 50 at a time with "Load more people". A review queue chip filters
  to creator submissions, oldest first, with submitter name and waiting time.
  Content lists put pending items first.
- Restoring a revision and removing a nested item both ask for confirmation.
  Content history shows the admin's name instead of a raw ID.
- `test-session-revocation` was extended for the audit and passes.
  `test-admin-content` passes with `RUGRAM_DEMO_MODE=true` set in the environment,
  as in CI. Its unsuspension check now expects 401, because revoked sessions are
  never revived.
- Still open: what happens to pending listings after a creator is demoted.

### Platform hardening

- The legacy cookie-session routes (`timeline`, `rugram`, `follows`, `likes`,
  `publications`, `bootstrap`, `auth/session`) now return a generic 410. The
  cookie logout remains so stale cookies can be cleared. `src/app/api/timeline/route.ts`
  had uncommitted edits; its body was replaced as part of the retirement.
- Rate limits use `clientAddress()`, which takes the entry `TRUSTED_PROXY_HOPS`
  places from the right of `X-Forwarded-For` (default 1). There is a shared
  per-challenge OTP verify throttle of 10 per 10 minutes, and logout only accepts
  UUID bearer tokens.
- Migration 021 adds the `mobile_timestamp()` IMMUTABLE cast plus indexes on
  `createdBy`, a GIN index on `useCases`, and a topic/start-time index for
  upcoming events. The bootstrap event query orders by `mobile_timestamp()`. The
  local planner uses the new indexes. The indexes are not created concurrently;
  plan a maintenance window for a large table.
- The card-research directory is no longer in bootstrap. It is served from
  `GET /api/mobile/card-research`.
- Telemetry is on by default in preview, staging and production
  (`API_TELEMETRY=false` opts out). The log drain and alerting are hosting
  configuration and are still open.

### Engineering health

- `npm run lint:mobile` (`eslint.mobile.config.mjs`) uses typescript-eslint and
  react-hooks, already present through eslint-config-next, so no new dependency.
  It now runs in CI and reports 0 errors and 8 hook-dependency warnings, which are
  left for review.
- New tests: `tests/admin-safety.test.ts`, `tests/platform-hardening.test.ts`,
  `tests/shared-modules.test.ts`, and alias cases in `tests/runtime-config.test.ts`.
- Naming: `BETTERHABITS_DEMO_MODE` is preferred and falls back to
  `RUGRAM_DEMO_MODE`; if both are set and disagree, startup fails.
  `OPENAI_BETTERHABITS_MODEL` falls back to `OPENAI_RUGRAM_MODEL`. The web session
  cookie is `betterhabits_session`, and `rugram_session` is still read and cleared.

### Verification

`npm test` passes 257/257. The backend and mobile typechecks, `npm run lint`,
`npm run lint:mobile` (0 errors) and the accessibility scan all pass.
`test:simulation` passes with `RUGRAM_DEMO_MODE=true`, as in CI. These database
scripts pass against `betterhabits_local`: session revocation, moderation,
notifications, phone database, account privacy, reports, completion replay,
hosted events and migrations.

`test-creator-event-quota` needs its isolated fixture on port 55433, so it was
not run. No native device testing was done. No dependency changes, rebuilds,
commits or deployments were made.
