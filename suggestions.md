# BetterHabits improvement checklist

Read-only audit of the current working tree (mobile app, Next.js API, shared logic, migrations, CI) across the three roles: **user (member)**, **creator** and **admin**. Nothing other than this file was changed.

Severity: **High** = blocks a public launch or causes visible breakage; **Medium** = noticeable product/ops gap; **Low** = polish or maintainability.

Each item lists where the evidence lives and a suggested fix. Tick items off as they are approved and completed.

---

## 0. Release blockers (do these first)

- [x] **High: No real phone identity in the database.** `users.password_hash` is still `NOT NULL` and there is no phone column ([db/migrations/001_initial.sql](db/migrations/001_initial.sql) line 6). Real SMS is blocked by design ([src/lib/otp-provider.ts](src/lib/otp-provider.ts), [docs/phone-auth.md](docs/phone-auth.md)).
  Fix: migration that adds unique `phone_e164`, makes `password_hash` nullable, and adds an MSG91 (or similar) adapter behind `otpProvider()`.
  Done: migration 014, MSG91 OTP and widget adapters, durable challenge store; `scripts/test-phone-database.ts` passes locally. Live SMS delivery with real MSG91 credentials is still unverified.
- [x] **High: Demo mode can turn on implicitly.** `demoMode()` returns true when `DATABASE_URL` is missing and `NODE_ENV !== 'production'` ([src/lib/store.ts](src/lib/store.ts) lines 48-49); `.env.example` defaults it to `true`. A misconfigured staging deploy runs on demo data with mock OTP.
  Fix: only honour an explicit `RUGRAM_DEMO_MODE=true`; fail at boot in staging/production if demo is on or `DATABASE_URL` is absent.
- [x] **High: Migrations are not transactional.** [scripts/db.mjs](scripts/db.mjs) lines 26-48 run statements one by one and record the file only at the end, so a mid-file failure leaves partial DDL with no rollback.
  Fix: wrap each migration file in `BEGIN/COMMIT`; document an expand/contract procedure for destructive changes.
- [x] **High: No account deletion or data export.** The You/profile screen ([mobile/App.tsx](mobile/App.tsx) around lines 124-132) has progress, saves and logout only. App Store and Play policies and Indian data-protection rules (the DPDP Act) expect deletion.
  Fix: `DELETE /api/mobile/account` plus export endpoint, wired into You; define retention for analytics and sessions.
- [x] **High: Suspension does not revoke sessions.** Suspend only sets `is_disabled` ([src/lib/store.ts](src/lib/store.ts) lines 89-101); sessions are deleted only on logout by token (line 137). Requests return 401 through the `NOT u.is_disabled` join, but the session rows remain and would come back to life on unsuspend.
  Fix: `DELETE FROM sessions WHERE user_id = $1` on suspend and on role demotion.

---

## 1. User (member) role

### Auth and session
- [x] **High: A 401 leaves the UI "signed in".** [mobile/src/api.ts](mobile/src/api.ts) line 12 clears the token on 401 but `session.data` stays populated ([mobile/src/session.tsx](mobile/src/session.tsx)), so the user sees stale screens and repeated errors.
  Fix: on 401 also `setData(null)` and show a single "Session expired, sign in again" message.
- [x] **Medium: Logout fails offline.** `logout()` awaits the server `DELETE` before clearing the token; if the request throws, the user stays signed in ([mobile/src/session.tsx](mobile/src/session.tsx) line 13).
  Fix: clear the local token and data first (or in `finally`), then revoke on the server on a best-effort basis.
- [x] **Medium: Non-JSON error responses crash the error path.** `await response.json()` runs before the `ok` check ([mobile/src/api.ts](mobile/src/api.ts) line 12); an HTML 502/504 from a proxy surfaces as a JSON parse error.
  Fix: parse defensively and fall back to a generic "Server unavailable" message.

### Core habit loop
- [x] **High: There is no UI to mark a habit step complete.** The backend supports `action:'complete'` ([src/lib/mobile-store.ts](src/lib/mobile-store.ts) around lines 162-214), and You shows "X steps today", but nothing in the mobile UI sends `complete`. The only reference is the toggle helper in [mobile/App.tsx](mobile/App.tsx) lines 63-66.
  Fix: per-step check-off in [mobile/src/FlowDetails.tsx](mobile/src/FlowDetails.tsx) and/or a Today checklist on Home.
- [ ] **Medium: Stories autoplay, but the docs say they don't.** [mobile/src/StoryViewer.tsx](mobile/src/StoryViewer.tsx) line 44 advances on a `setInterval`; [docs/home-feed.md](docs/home-feed.md) says stories do not autoplay.
  Fix: pick one behaviour (manual advance is better for accessibility) and update the other.
- [ ] **Medium: Focus onboarding copy differs from the spec.** [mobile/src/FlowTopicBrowser.tsx](mobile/src/FlowTopicBrowser.tsx) shows "Explore flows" rails; [docs/focus-onboarding.md](docs/focus-onboarding.md) describes a focus-first question and a "Show my starter flows" step.
  Fix: align the UI and the docs.
- [ ] **Low: Home has no empty, error or offline state of its own** ([mobile/src/HomeFeed.tsx](mobile/src/HomeFeed.tsx)).
  Fix: "Add your first flow" empty state plus an inline retry when `error` is set.
- [ ] **Low: The "Options" menu only removes.** [mobile/src/HomeFeed.tsx](mobile/src/HomeFeed.tsx) line 25 is labelled "Options for {title}" but goes straight to a remove confirmation.
  Fix: rename it to "Remove from Home" or open a real action sheet.

### Navigation and architecture
- [x] **High: Every tab mounts its own `BetterHabitsScreen`,** so switching tabs drops open sheets and selection state ([mobile/app/(tabs)/index.tsx](mobile/app/(tabs)/index.tsx), `flows.tsx`, `picks.tsx`, `events.tsx` and [mobile/App.tsx](mobile/App.tsx) lines 43-56).
  Fix: move UI state into context or the tabs layout, and render one pane per tab.
- [x] **High: Nested scrolling and long lists.** The whole tab body is one `ScrollView` ([mobile/App.tsx](mobile/App.tsx) line 111) containing horizontal `FlatList` shelves ([mobile/src/BrowseShelf.tsx](mobile/src/BrowseShelf.tsx)) and `.map` lists of picks and events. [docs/production-readiness.md](docs/production-readiness.md) already lists list virtualisation as a release gate.
  Fix: make a `FlatList` or `SectionList` the root scroller of each tab.
- [ ] **Medium: There are no deep links to content.** The `betterhabits` scheme is set ([mobile/app.json](mobile/app.json)), but there are no `/flow/[id]`, `/pick/[id]` or `/event/[id]` routes, so shares and stories cannot open a specific item.
  Fix: add the routes and resolve IDs against the payload, as `resolveStoryTarget` does.
- [ ] **Medium: The You tab is hidden.** [mobile/app/(tabs)/_layout.tsx](mobile/app/(tabs)/_layout.tsx) line 12 hides it, so profile is reachable only through the avatar.
  Fix: show it for members, or make the profile entry point more prominent.
- [ ] **Medium: There is dead or unreachable UI.** `EventDiscovery` is never mounted; the Events tab uses only `HyderabadEvents`. `WorkoutBuilder` has state but nothing opens it ([mobile/App.tsx](mobile/App.tsx) lines 52 and 141).
  Fix: wire them up or delete them, and update the README's promise of multi-city discovery.

### Discovery and personalisation
- [ ] **Medium: There is no member search** across flows, picks or events. Only Admin has search ([mobile/src/AdminWorkspace.tsx](mobile/src/AdminWorkspace.tsx)).
  Fix: client-side filter first, then server search as the catalogue grows.
- [ ] **Medium: The city choice is not saved.** The Events city picker is local `useState` ([mobile/src/HyderabadEvents.tsx](mobile/src/HyderabadEvents.tsx) lines 24-32), even though the backend supports `action:'city'`.
  Fix: save the city when the user picks one, and allow editing it on You.
- [ ] **Medium: Members get no notifications about registration outcomes.** Guests must tap "Check for updates" ([mobile/src/EventRegistrationPanel.tsx](mobile/src/EventRegistrationPanel.tsx) line 71: "No email or SMS notifications are sent yet").
  Fix: an in-app inbox on You for approved, declined and cancelled registrations, then push notifications.

### Trust, disclosure and locale
- [ ] **Medium: Affiliate disclosure is easy to miss.** It appears only per seller in details ([mobile/src/SellerLinks.tsx](mobile/src/SellerLinks.tsx), [mobile/src/PickDecisionComparison.tsx](mobile/src/PickDecisionComparison.tsx)); the Picks browse screen has no screen-level notice.
  Fix: a persistent "Some links may earn a commission" footer on Picks.
- [ ] **Medium: Health disclaimers are uneven.** Supplement and workout guides carry warnings; general nutrition, sleep and other flows do not.
  Fix: one shared non-clinical disclaimer component, shown at focus selection and inside flow guides.
- [ ] **Medium: Time zones are mixed.** Events are forced to `Asia/Kolkata` ([mobile/src/HyderabadEvents.tsx](mobile/src/HyderabadEvents.tsx)), RSVP dates on You use `en-IN` without a time zone, and habit days use the device zone ([mobile/App.tsx](mobile/App.tsx) lines 66 and 131).
  Fix: central `formatInr`, `formatEventTime` and `habitDay` helpers in `shared/`, and show the zone in the UI.
- [ ] **Low: The demo-mode banner appears only on You** ([mobile/App.tsx](mobile/App.tsx) line 132).
  Fix: a persistent banner on all tabs whenever `data.demoMode` is set.

### Accessibility and theming
- [ ] **Medium: The theme is always dark.** `useTheme` hard-codes `scheme='dark'` ([mobile/src/design/theme.ts](mobile/src/design/theme.ts) line 9) and the StatusBar is always light, yet the README claims system light/dark support.
  Fix: follow `Appearance` and set `userInterfaceStyle: "automatic"`, or correct the README.
- [ ] **Medium: There is no Dynamic Type policy.** The shared `Text` sets no `maxFontSizeMultiplier` ([mobile/src/design/Text.tsx](mobile/src/design/Text.tsx)), so fixed-size layouts such as the 30pt story titles can overflow.
  Fix: set a sensible cap and test at the largest accessibility sizes.
- [x] **Low: Past RSVP rows on You have no `accessibilityRole` or `accessibilityLabel`** ([mobile/App.tsx](mobile/App.tsx) line 131).
- [ ] **Low: The app is English-only, with hard-coded strings.** Fine for an English-language India launch; extract strings before adding languages.

---

## 2. Creator role

### Submission lifecycle
- [x] **High: Creators cannot edit their own submissions.** `event-update` is admin-only ([src/app/api/mobile/route.ts](src/app/api/mobile/route.ts) lines 44-45; [src/lib/mobile-store.ts](src/lib/mobile-store.ts) lines 283-284), and the Edit button shows only when `role==='admin'` ([mobile/src/HyderabadEvents.tsx](mobile/src/HyderabadEvents.tsx) line 85).
  Fix: creator-scoped `event-update` and `product-update` for their own `pending` items, enforced by a `createdBy = user.id` check.
- [x] **High: Pending items cannot be withdrawn.** Only submit, review and archive actions exist ([src/app/api/mobile/route.ts](src/app/api/mobile/route.ts) lines 18-35).
  Fix: add a `withdraw` action for the creator's own pending items, and decide whether a withdrawal returns the monthly event slot.
- [x] **High: Creators never see why something was rejected.** `reviewItem(user, id, status)` takes only `'published' | 'archived'` ([src/lib/mobile-store.ts](src/lib/mobile-store.ts) line 275), and Studio shows only a status badge ([mobile/App.tsx](mobile/App.tsx) line 121).
  Fix: store a `reviewNote` and reason code with each decision and show them on Studio cards. This shares a backend change with item A2 in the admin section.
- [x] **Medium: Creators are not notified of approvals or rejections.** `listing_published` and `listing_archived` are recorded only as analytics events ([src/lib/mobile-store.ts](src/lib/mobile-store.ts) line 281).
  Fix: a moderation inbox in Studio that reuses the pattern in [mobile/src/EventInviteNotifications.tsx](mobile/src/EventInviteNotifications.tsx).
- [ ] **Medium: Drafts are lost when the sheet closes.** [docs/event-editor.md](docs/event-editor.md) confirms unsaved drafts are not kept.
  Fix: autosave to AsyncStorage, keyed by user and kind, or add a server-side `draft` status.
- [ ] **Medium: "Your submissions" can miss items.** Studio filters `createdBy === user.id` from the shared, paginated bootstrap catalogue of 100 items ([src/lib/mobile-store.ts](src/lib/mobile-store.ts) lines 72-100).
  Fix: a dedicated query for the creator's own items, ordered by `created_at DESC`.

### Quota
- [ ] **Medium: Studio doesn't explain how the event quota counts.** Every status counts, including rejected ones ([src/lib/mobile-store.ts](src/lib/mobile-store.ts) lines 120-124; [scripts/test-creator-event-quota.ts](scripts/test-creator-event-quota.ts)), but Studio just says "submitted this month".
  Fix: match the admin copy and show a pending / published / archived breakdown.
- [ ] **Medium: Demo and database count the quota from different fields.** Demo counts `listedAt` and Postgres counts `created_at` ([src/lib/mobile-store.ts](src/lib/mobile-store.ts) lines 122-123 and 253-259).
  Fix: use one submit timestamp in both modes.

### Forms and validation
- [ ] **Medium: The affiliate disclosure field is labelled optional, but the server requires it** whenever an affiliate URL or tag is present ([mobile/src/PurchaseFields.tsx](mobile/src/PurchaseFields.tsx) line 15 vs [src/lib/product-validation.ts](src/lib/product-validation.ts) lines 9-13).
  Fix: mark the field required and validate it inline when affiliate signals are detected.
- [ ] **Medium: Fields truncate valid input.** `Field` defaults `maxLength` to 200 and picks limits by matching label text ([mobile/src/design/components.shared.tsx](mobile/src/design/components.shared.tsx) line 16), while the server allows `safetyNote` 500, `offer.terms` 400 and `deliveryNote` 300.
  Fix: pass explicit `maxLength` and `keyboardType="url"` from callers, and stop branching behaviour on label strings.
- [ ] **Medium: The product form is one long sheet** with errors shown in `Alert`s after submit; events, by contrast, use a 4-step wizard ([mobile/src/ProductFields.tsx](mobile/src/ProductFields.tsx), [mobile/src/PurchaseFields.tsx](mobile/src/PurchaseFields.tsx)).
  Fix: a stepped flow (basics, then sellers, then review) with validation at each step.
- [ ] **Medium: Creators cannot add images, and there are no licence fields.** The product schema accepts an optional `imageUrl` that the creator form never sets, and the preview renders an `Image` even when the URI is undefined ([mobile/src/ProductPreview.tsx](mobile/src/ProductPreview.tsx) line 11).
  Fix: an image URL field with required source and licence fields, and a host allowlist.
- [ ] **Low: The product route has no early role check.** `event-link` returns 403 at the route; `product` relies on `submitItem` throwing ([src/app/api/mobile/route.ts](src/app/api/mobile/route.ts) lines 45-50).
  Fix: the same route-level gate for `product` and `endorse`.
- [ ] **Low: URL validation checks shape only.** Affiliate short links are not resolved ([shared/purchases.ts](shared/purchases.ts), [docs/affiliate-links.md](docs/affiliate-links.md)).
  Fix: optionally resolve redirects at moderation time.

### Hosted events and visibility
- [ ] **Medium: Creators cannot fix details on a published hosted event.** Changes to description, deadline or capacity go through admin only ([src/lib/mobile-store.ts](src/lib/mobile-store.ts) lines 291-300).
  Fix: allow edits to non-destructive fields, with the guards in [db/migrations/013_hosted_event_guards.sql](db/migrations/013_hosted_event_guards.sql) (for example, capacity must stay at or above the approved count).
- [ ] **Medium: Guests are not told when an event is cancelled** ([mobile/src/EventRegistrationPanel.tsx](mobile/src/EventRegistrationPanel.tsx) line 71).
  Fix: the same in-app inbox as in the user section.
- [ ] **Medium: Creators have no analytics.** Bootstrap `analytics` and `itemAnalytics` are admin-only ([src/lib/mobile-store.ts](src/lib/mobile-store.ts) lines 75 and 148-149).
  Fix: per-listing views, opens, saves and registrations, limited to the creator's own items.
- [ ] **Medium: There is no public creator profile for picks and events.** [src/app/creators/[handle]/page.tsx](src/app/creators/[handle]/page.tsx) shows only legacy routine components.
  Fix: a mobile and public profile listing the creator's published products and events.
- [ ] **Low: Guest user IDs are exposed** to hosts and to approved attendees ([src/lib/event-registration-store.ts](src/lib/event-registration-store.ts) lines 16-17 and 37-40).
  Fix: opaque registration IDs for anyone who isn't the host.
- [ ] **Low: There is no verified-creator flag.** Admins grant the creator role with no attestation recorded.
  Fix: a `verifiedAt` and `verifiedBy` record on the profile, required before the quota applies.

---

## 3. Admin role

### Moderation
- [x] **High (A2): Rejections carry no reason.** "Archive" doubles as reject with no reason stored ([src/lib/mobile-store.ts](src/lib/mobile-store.ts) lines 275-281).
  Fix: require a reason when rejecting or archiving, store it on the audit record, and show it to the creator.
- [x] **High: There is no review queue.** The admin list filters by kind and a title substring only; creator `pending` items are shown as `draft`; there is no pending-first sort, submitter filter, age indicator or bulk action ([src/app/api/mobile/admin/route.ts](src/app/api/mobile/admin/route.ts) lines 22-30; [src/lib/admin-content-store.ts](src/lib/admin-content-store.ts) line 49).
  Fix: a dedicated Review section with `status=pending`, oldest first, age badges, and optional bulk approve or reject with reasons.

### People, roles and audit
- [x] **High: Changes to people are not audited.** Role and suspension changes emit only `trackMobile('account_updated')`; `mobile_content_audit` covers content only ([db/migrations/011_admin_content.sql](db/migrations/011_admin_content.sql)).
  Fix: a people-audit row (actor, target, role and disabled state before and after, reason), shown in People history.
- [x] **High: Role and suspension saves happen without confirmation** ([mobile/src/AdminWorkspace.tsx](mobile/src/AdminWorkspace.tsx) line 68), whereas publish and archive already confirm.
  Fix: an explicit confirmation when promoting to admin, demoting, or suspending.
- [ ] **Medium: Demoting a creator has no follow-through.** Pending listings are left in limbo, sessions are not revoked, and quota changes are logged without target or before/after values ([src/lib/store.ts](src/lib/store.ts) lines 89-101; [src/lib/mobile-store.ts](src/lib/mobile-store.ts) lines 126-133).
  Partly done: sessions are revoked and the demotion is recorded in `account_audit` with before/after values and a reason. Still open: pending listings left after a demotion, and quota-change audit detail.
  Fix: revoke sessions, ask the admin what to do with pending items, and log quota changes with full detail.
- [x] **Medium: The People list stops at 50** with no pagination ([src/lib/store.ts](src/lib/store.ts) lines 85-86).
  Fix: cursor pagination and a total count.

### Content management
- [ ] **Medium: Admin content silently stops at 5,000 rows.** Snapshots use `LIMIT 5000` and then filter in memory ([src/lib/admin-content-store.ts](src/lib/admin-content-store.ts) line 36; [src/lib/mobile-store.ts](src/lib/mobile-store.ts) line 146).
  Fix: filter and paginate in the database, or at least return `truncated: true`.
- [ ] **Medium: Recovery after a 409 conflict is poor.** The client keeps the stale `version`, so every retry fails until the sheet is reopened ([mobile/src/AdminWorkspace.tsx](mobile/src/AdminWorkspace.tsx) lines 36-41).
  Fix: refetch on 409 and offer reload or keep-mine.
- [x] **Medium: Restoring a revision can overwrite the current draft without asking** ([mobile/src/AdminWorkspace.tsx](mobile/src/AdminWorkspace.tsx) line 65).
  Fix: confirm first, and ask keep-or-replace when a draft exists.
- [ ] **Medium: The content audit is shallow.** It records no reason, shows the actor as a raw UUID, and keeps only 20 history entries ([src/lib/admin-content-store.ts](src/lib/admin-content-store.ts) lines 85-101).
  Fix: add a reason, resolve the actor to a name or handle, and paginate the history.
- [x] **Low: Removing an item from a nested array happens with no confirmation** ([mobile/src/ContentFields.tsx](mobile/src/ContentFields.tsx) line 56).
- [ ] **Low: Saving a creator allowance gives no success feedback and doesn't confirm a value of 0** ([mobile/src/CreatorEventSettings.tsx](mobile/src/CreatorEventSettings.tsx)).

### Workspace UX and analytics
- [ ] **Medium: The whole admin workspace is one dense scroll.** Content, Events, People, Permissions, Overview and Simulation share a single `ScrollView`, and the editors are recursive field trees inside a sheet ([mobile/src/AdminWorkspace.tsx](mobile/src/AdminWorkspace.tsx), [mobile/src/ContentFields.tsx](mobile/src/ContentFields.tsx)).
  Fix: separate routes (Review, Content, People, Analytics), a sticky save bar, and collapsed advanced fields.
- [ ] **Low: The Overview analytics window is fixed at 30 days,** while item analytics supports 7, 30 or 90 ([src/lib/mobile-store.ts](src/lib/mobile-store.ts) line 71).
  Fix: share the selector, or label the window as fixed.
- [ ] **Low: The Simulation route is guarded but still ships.** It is admin-only, demo-only and blocked in production ([src/app/api/mobile/simulation/route.ts](src/app/api/mobile/simulation/route.ts)).
  Fix: return 404 outside demo mode, and add a test that production refuses to seed.

---

## 4. Platform: backend, security and data

### Auth and abuse
- [x] **Medium: OTP verification is throttled per IP only** (60 requests a minute, [src/app/api/mobile/auth/route.ts](src/app/api/mobile/auth/route.ts) lines 16-17), on top of 5 attempts per challenge.
  Fix: separate shared buckets per challenge and per phone, plus a stricter IP limit for verification.
- [x] **Medium: The rate limiter trusts the first `X-Forwarded-For` hop,** which clients can spoof ([src/app/api/mobile/auth/route.ts](src/app/api/mobile/auth/route.ts) line 16).
  Fix: use the client IP supplied by the platform, or the rightmost trusted hop.
- [ ] **Medium: Dead password authentication is still in the code.** `authenticate()` compares the demo plaintext `"12345"` or a bcrypt hash and ignores `is_disabled` ([src/lib/store.ts](src/lib/store.ts) lines 65-75); the route itself returns 410.
  Fix: delete it, along with the demo passwords and bcrypt seed hashes in [db/seed.sql](db/seed.sql).
- [x] **Low: Logout accepts any Bearer string,** unlike other routes, which check the UUID format ([src/app/api/mobile/auth/route.ts](src/app/api/mobile/auth/route.ts) lines 34-37).
- [ ] **Low: The mock OTP code is returned in demo mode.** Production is correctly blocked (tested in [tests/otp.test.ts](tests/otp.test.ts)).
  Fix: optionally strip `mockCode` at the route as a second layer of protection.

### Legacy web surface
- [x] **Medium: The legacy cookie-session APIs are still live:** `timeline`, `rugram`, `follows`, `likes`, `publications` and `bootstrap` under [src/app/api/](src/app/api/), and they still accept writes. [legacy/web-page.tsx](legacy/web-page.tsx) is unused.
  Fix: return 410 or put them behind a flag, and retire the matching Playwright suite.
- [x] **Medium: The legacy routes return raw `error.message`** to clients ([src/app/api/timeline/route.ts](src/app/api/timeline/route.ts) lines 25 and 47, `follows`, `publications`).
  Fix: use the same allowlist of client-safe errors as the mobile handler.
- [x] **Medium: Ask BetterHabits uses the in-process rate limiter** ([src/app/api/rugram/route.ts](src/app/api/rugram/route.ts) line 18), so each API instance multiplies the quota.
  Fix: `allowSharedRequest`.

### Data and performance
- [x] **Medium: Bootstrap ships the whole card-research library** (about 180 KB of snapshot) to every user through `managedLibrary()` ([src/lib/admin-content-store.ts](src/lib/admin-content-store.ts); [shared/card-inventory-snapshot.json](shared/card-inventory-snapshot.json)).
  Fix: serve it from a separate, lazily loaded endpoint.
- [x] **Medium: Hot JSONB queries have no indexes.** Queries on `data->'useCases' ?|` and `startsAt` have no GIN or expression index ([src/lib/mobile-store.ts](src/lib/mobile-store.ts) lines 112-113; [db/migrations/007_production_controls.sql](db/migrations/007_production_controls.sql)).
  Fix: a GIN index on `useCases` and an expression index on `(data->>'startsAt')::timestamptz`.
- [ ] **Medium: There is no PII policy.** Phones will soon live in the database without defined retention, export or deletion, or encryption at rest ([scripts/database-maintenance.mjs](scripts/database-maintenance.mjs) handles only sessions and analytics).
- [ ] **Low: There is no HSTS header** ([next.config.ts](next.config.ts)).
  Fix: add it at the edge or in Next.js headers.

### Observability
- [ ] **Medium: Structured logs are opt-in and go to the console only.** They require `API_TELEMETRY=true` ([src/lib/mobile-http.ts](src/lib/mobile-http.ts)).
  Fix: turn telemetry on by default in staging and production, add a log drain, and alert on errors, p95 latency and database health.
  Partly done: telemetry is on by default in preview, staging and production (`API_TELEMETRY=false` opts out). The log drain and alerting are hosting configuration and are still open.
- [ ] **Medium: There is no client crash or error reporting** in the mobile app.
  Fix: Sentry or similar, with request IDs linked to server logs. This needs a dependency, so it needs your approval.

---

## 5. Engineering health

- [x] **High: Several files are extremely dense.** [mobile/App.tsx](mobile/App.tsx) is 26.7 KB in 167 lines, with a longest line of 1,106 characters; [src/lib/mobile-store.ts](src/lib/mobile-store.ts) is 41 KB in 361 lines; [mobile/src/AdminWorkspace.tsx](mobile/src/AdminWorkspace.tsx) is 17 KB in 70 lines. This makes review, diffs and blame very hard.
  Fix: run Prettier on these files, then split them: `CreatorStudio` and `useCreatorSubmit` out of `App.tsx`, and `mobile-store` by domain (profile, catalogue, RSVP, review, analytics).
- [x] **Medium: ESLint ignores `mobile/**`** ([eslint.config.mjs](eslint.config.mjs) lines 14-15), and the root `tsc` excludes `mobile`; only `mobile:typecheck` covers it.
  Fix: a mobile ESLint config and a CI step for it.
- [ ] **Medium: CI gaps.** There is no `npm audit` inside `mobile/`, no iOS export, and `test:e2e` is really a smoke script ([.github/workflows/ci.yml](.github/workflows/ci.yml), [package.json](package.json)).
  Fix: add the mobile audit, rename the scripts to match what they do, and optionally add an iOS export.
- [x] **Medium: Gaps in shared-module tests.** There are no direct tests for `shared/event-registration.ts`, `card-wallet-validation.ts`, `auth.ts`, `focus.ts` or `hosted-demo-event.ts`.
  Fix: start with the registration state machine and the auth fixtures.
- [ ] **Medium: The audit findings carry over.** The mobile toolchain has 22 known advisories, and the audit has not been rerun since the Expo UI was added ([docs/production-readiness.md](docs/production-readiness.md)).
- [ ] **Medium: Git hygiene.** About 120 uncommitted paths span every area, and `reports/` is not in `.gitignore`.
  Fix: split the work into reviewable PRs by area, and either ignore `reports/` or commit only curated summaries.
- [x] **Low: The app is still called both Rugram and BetterHabits.** Examples include the `rugram_session` cookie, `RUGRAM_DEMO_MODE`, `OPENAI_RUGRAM_MODEL` and the `/api/rugram` route.
  Fix: add `BETTERHABITS_*` aliases that fall back to the old names, and migrate the cookie by reading both during a transition.
- [ ] **Low: Docs and code have drifted** in several places: the README's light/dark claim, the Stories autoplay behaviour, focus onboarding, and multi-city event discovery.
  Fix: a docs pass after the decisions above.

---

## Already solid (no action needed)

- Mobile tokens are stored in `expo-secure-store` ([mobile/src/api.ts](mobile/src/api.ts)), production builds require an HTTPS backend, and requests time out after 15 seconds.
- OTP codes expire after 5 minutes, are hashed and compared in constant time, have a resend cooldown, and the mock provider is blocked in production (tested).
- Admin and simulation routes check the role on the server; admins cannot demote themselves, and the last admin cannot be removed.
- CMS content uses optimistic versioning (a stale write returns 409).
- SQL uses parameterised tagged templates; request bodies are capped at 16 KB; unexpected errors return a generic 503 with a request ID.
- Event seat allocation is serialised with row locks, and RSVP and submission requests are idempotent.
- Hosted-event guest names stay hidden until a guest is approved.

---

## Suggested order of work

1. **Release blockers:** section 0 (phone identity schema, fail-closed demo mode, transactional migrations, account deletion, revoking sessions on suspend).
2. **Moderation loop, end to end:** a rejection reason (admin) that the creator can see, with a notification, a withdraw action and editing of the creator's own pending items. This one backend change benefits both roles.
3. **The member core loop:** the step-completion UI, the 401 and logout fixes, state that persists across tabs, and list virtualisation.
4. **Admin safety:** a people audit, confirmations, a review queue, and pagination.
5. **Platform hardening:** the legacy API retirement, rate-limit fixes, indexes, a slimmer bootstrap payload, and telemetry.
6. **Engineering health:** formatting and splitting the dense files, mobile lint in CI, test gaps, and the naming clean-up.
