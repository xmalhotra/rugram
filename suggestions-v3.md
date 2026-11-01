# BetterHabits suggestions v3 — missing features, UI/UX and design

**Base documents:** [suggestions.md](suggestions.md) (the audit: what is broken) and [suggestions-v2.md](suggestions-v2.md) (the hero thesis: one focus, Today, connected picks, city events).

This v3 covers the next layer: **features the app does not have, UI/UX experiences that can be improved, functionality to add across user / creator / admin, and design elements to add or update.** It assumes the v1 release blockers and the v2 hero loop as prerequisites and does not repeat them in full; items that depend on them say so.

Priority key: **P0** = hero release, **P1** = fast follow (first 1–2 updates), **P2** = later / needs validation. Effort: S (days), M (1–2 weeks), L (larger).

Nothing except this file was changed. Features needing a **new dependency** are marked **[needs dependency — your approval]**; the current mobile tree has Reanimated and SVG (so motion and charts need nothing new) but no haptics, notifications, calendar, image-picker, NetInfo or AsyncStorage packages ([mobile/package.json](mobile/package.json)).

---

## 1. What exists today, so the gaps are honest

| Area | Already in the app | Verdict |
| --- | --- | --- |
| Flows | Focus-led catalogue, flow details, steps with `pickContext`, workout plans, recipes, exercise library, technique cards | Rich content, weak daily interaction |
| Discovery | Category rails, shelves, swipe deck for picks, story cards, browse grids | Browse-heavy, no search, no personalisation |
| Picks | Budget/tier filters, comparisons, seller links, saved picks, card research, electronics browser | Deep catalogue, shallow decision help |
| Events | Hyderabad shortlist, hosted events, approval guest lists, invite polling | Strong trust model, no calendar/reminder layer |
| Creator | Studio submissions, event wizard, quota, guest management | One-way: submit and wait |
| Admin | CMS, people/roles, analytics, simulation, revision history | Functional, dense, queue-less |
| Design | Semantic tokens, native Expo UI controls, `NeonBackdrop`, focus/flow illustrations, Inter typeface | Dark-only in code, no motion/haptic language, no component state library |

The pattern: **content depth is ahead of interaction depth.** v3 is mostly about closing that gap.

---

## 2. Missing features — cross-cutting

- [ ] **P0 · Global search** (M). One search entry (Home header + Flows/Picks/Events) over flows, picks, events and exercises, with recent searches and focus-scoped suggestions. Today only Admin can search.
- [ ] **P0 · In-app notification centre** (M). A bell/inbox for members (registration approved/declined/cancelled), creators (published/rejected with reason) and admins (new pending submissions). Data first, push later.
- [ ] **P1 · Push notifications [needs dependency]** (M). Expo Notifications for: daily Today reminder (user-chosen time), event T-1 day, creator decision, admin queue digest. Needs dev build, permission UX and server push tokens — extends the v1/v2 inbox, never replaces it.
- [ ] **P0 · Share** (S). Native share sheet for flows, picks and events (title, one-line why, deep link). Needs the v2 deep-link routes `/flow/[id]`, `/pick/[id]`, `/event/[id]`. Use RN `Share` — no new dependency.
- [ ] **P1 · Add to calendar [needs dependency]** (S–M). "Add to calendar" on approved/external events with IST times, venue and source link.
- [ ] **P1 · Offline mode** (M). Cache last payload, queue completions/saves while offline, sync on reconnect with a visible "Saved offline · will sync" state. Needs NetInfo/AsyncStorage **[needs dependency]** or a minimal `expo-network` check.
- [ ] **P1 · Reminders** (M). Per-flow reminder time (local notification), quiet hours, and a weekly reflection nudge. Local notifications reuse the push dependency above.
- [ ] **P2 · Home-screen widget** (L) **[needs dependency + dev build]**. Today's 1–3 steps + quick check-off. High delight, platform-specific; validate retention first.
- [ ] **P2 · Referral / invite a friend to a flow or event** (M). "Do this flow with a friend" link; hosted-event invites already exist for creators — generalise the invite primitive.
- [ ] **P0 · Help, feedback and report** (S). In-app "Report an issue / wrong price / broken link" on every pick and event, routed to an admin queue. This is the cheapest trust feature available and feeds the stale-sources process from v2.
- [ ] **P1 · Settings screen** (S). City, focus change, reminder time, notification preferences, appearance (system/light/dark), data export, delete account, licences. Today these are scattered or absent on You.
- [ ] **P2 · Multi-language scaffolding** (M). Extract strings now (cheap), translate later (Hindi first) when expanding beyond English-speaking Hyderabad.

---

## 3. User role — features and functionality to add

### Today and habit mechanics
- [ ] **P0 · Today checklist with check-off** (M). The v2 hero item: steps due today across joined flows, tap to complete (already supported by `action:'complete'`), undo within a few seconds, "done today" summary. Add per-step notes ("how it went", one line, optional).
- [ ] **P0 · Week view strip** (S). A 7-day dot/strip view of completions per flow — history without streak guilt. Data exists in `profile.completed` and analytics; needs a `habitHistory` read model beyond "today".
- [ ] **P1 · Flexible scheduling** (M). Steps currently have cues ("After breakfast") but no user schedule. Add optional preferred time / days (e.g. weekly step only on weekends), "snooze to tomorrow", and "skip today" that is not a failure state.
- [ ] **P1 · Saved weekly reflection journal** (S–M). Persist the existing weekly prompt (v2, Moment 5), show last week's note, keep a private journal list on You. Small `reflections` storage.
- [ ] **P1 · Progress insights** (M). "Your last 4 weeks" card: steps done per week, most consistent flow, focus history. Simple SVG bars (SVG already installed). Explicitly non-clinical, no scores or grades.
- [ ] **P2 · Gentle milestones** (S). Brand-safe celebrations: first flow finished, 4-week consistency, first event attended. No streaks, no leaderboards, no loss framing.
- [ ] **P2 · Flow variants and levels** (M). Beginner/regular variants of popular flows, "make it lighter this week" toggle (fewer steps), and flow completion → suggested next flow (`relatedFlowIds` already exists).
- [ ] **P1 · Custom personal flow** (M). Let users assemble 3–5 steps from existing flows into "My morning". Steps stay source-linked library items — consistent with the product's no-unreviewed-claims rule.

### Discovery and decision help
- [ ] **P0 · "Why this flow / pick?"** (S). Every recommendation shows one reason line: "Because your focus is Running", "Under your ₹500 budget", "Checked 12 Oct". The data (`pickContext`, `focusId`, `checkedAt`, tier/budget) already exists — surface it.
- [ ] **P1 · Guided pick decision** (M). Extend the swipe deck into a short decision flow: budget → use case → 3 finalists → comparison → save/buy later. Add "Save for later" list with price-check freshness badges ("price checked 20 days ago").
- [ ] **P1 · Recently viewed and continue** (S). "Continue where you left" row on Home (last flow opened, last pick compared). Local state only.
- [ ] **P1 · Collections** (S). Editorial shelves beyond categories: "Under ₹500 for runners", "Hyderabad this month", "Start CrossFit safely". Admin-curated via existing CMS kinds.
- [ ] **P2 · Ask BetterHabits in-app** (M). The backend already has an Ask endpoint (legacy `/api/rugram`); bring a constrained, source-linked version into the app: goal text → only library flow/pick IDs, with the deterministic fallback. Never free-form health advice.
- [ ] **P2 · Smart next action** (M). Rule-based first (no ML): if no step done by evening → suggest the shortest step; if an event is within 14 days of a joined flow → surface it. Explainable, testable in `shared/`.

### Events experience
- [ ] **P0 · Event reminders and status timeline** (S–M). Registration status as a timeline (Requested → Approved → Reminder → Done), not just a badge. "Check for updates" becomes unnecessary once the inbox exists.
- [ ] **P1 · Map and travel context** (S). Venue opens in Maps, area/neighbourhood label, "≈40 min from Hitech City" style context. Linking only — no maps SDK needed.
- [ ] **P1 · Attendee preview (privacy-safe)** (S). "12 going · 3 from your flows" counts without names before approval (names-after-approval rule stays).
- [ ] **P2 · Post-event loop** (S). After the date: "How was it?" one-tap rating + optional note → feeds admin curation quality and creator host profiles.
- [ ] **P2 · Waitlist** (M). For full hosted events: join waitlist, auto-promote on cancellation with inbox notice. Registration store already has the state machine shape.

### Social (careful, brand-safe)
- [ ] **P2 · Flow buddies** (L). Opt-in: see that a friend joined the same flow (no activity feed, no comparison). Requires identity beyond phone — validate demand first.
- [ ] **P2 · Creator following** (M). Follow a creator → their new picks/events appear in a "From creators you follow" shelf. CMS already knows `createdBy`.

---

## 4. Creator role — features and functionality to add

### Studio home
- [ ] **P0 · Studio dashboard** (M). Replace the submit-first Studio with: needs-attention (rejected with reason, draft expiring), pending (with age), live (with views/saves/registrations), quota meter with pending/published/archived breakdown. All data exists server-side; needs the scoped queries from v1/v2.
- [ ] **P0 · Drafts with autosave + duplicate** (M). Autosaved drafts (server `draft` status preferred over device-only), "Duplicate" for recurring events and similar products, and templates (Tech meetup, Run club, Product pick).
- [ ] **P1 · Submission checklist** (S). Pre-submit quality gate shown as a checklist: source link present, disclosure present when affiliate, image + licence, fee known or explicitly unknown. Reduces admin rejections — pairs with the v2 form fixes.
- [ ] **P1 · Preview as member** (S). The existing previews become a full member-eye preview (card → details → disclosure) before submit.

### Content creation upgrades
- [ ] **P1 · Image upload [needs dependency]** (M). `expo-image-picker` + server upload/validation, licence + source attribution fields, basic crop. Today creators cannot supply images at all.
- [ ] **P1 · Bulk / repeat event creation** (M). "Repeat weekly for 4 weeks" for run clubs and meetups; each instance respects quota rules explicitly shown before confirming.
- [ ] **P1 · Richer event tooling** (M). Co-hosts (already in data as `organizers`), agenda, what-to-bring, accessibility/wheelchair info, language of session, age guidance — structured fields, not free text.
- [ ] **P2 · Product update / price refresh** (M). Creators can submit a price/source refresh for their live picks ("price changed"), entering the same review queue as an update type.
- [ ] **P2 · Flow proposals** (L). Long-term: creators propose flow steps from the central library (never free-text health claims), assembled in a flow builder like `WorkoutBuilder`. This is the original routine-library model returning through the mobile front door.

### Audience and growth
- [ ] **P0 · Creator analytics** (M). Per-item views, saves, seller-link taps, registrations, and 7/30/90-day trends; one "audience" card (city, focus mix). Scoped to `createdBy` (v2 item).
- [ ] **P1 · Public creator profile + share** (M). Handle page with published picks/events, hosted-event history, verified mark; shareable link; "Hosted by" blocks on event cards link here.
- [ ] **P1 · Guest management upgrades** (M). Search/filter guest list, bulk approve, export approved list (CSV share), waitlist promotion, day-of check-in mode (big tap targets, search-first).
- [ ] **P1 · Announcements to guests** (S–M). One broadcast message to approved guests (via inbox) for venue/time changes — replaces off-app WhatsApp.
- [ ] **P2 · Follower updates** (M). When a followed creator publishes, followers get an inbox item. Pairs with user-side following.

---

## 5. Admin role — features and functionality to add

### Review and trust operations
- [ ] **P0 · Review queue** (M). Pending-first, oldest-first, submitter filter, age/SLA badges, reason-required reject, bulk approve (v2 item, restated as the admin home screen — the queue *is* the admin home).
- [ ] **P0 · Stale-sources worklist** (M). Picks/events sorted by `checkedAt` age with one-tap "re-verify" (opens source, confirm new date), and user-reported issues (price/link reports from section 2) merged into the same queue.
- [ ] **P1 · Duplicate and link-health detection** (M). Automatic flags: same source URL submitted twice, dead/shortened links, price missing, fee unknown at publish time. Server-side checks at submission; results shown as queue badges.
- [ ] **P1 · Trust and safety console** (M). Reports on users/events, suspend-with-reason, creator verification workflow (checklist + `verifiedAt`/`verifiedBy`), all written to the people audit (v1/v2).
- [ ] **P2 · Moderation playbooks** (S). Saved reject-reason templates ("Source not authoritative", "Fee unverified") — consistent creator feedback with two taps.

### Content operations
- [ ] **P1 · Content calendar** (M). Scheduled publish/unpublish for events and collections; expired-event auto-archive suggestions.
- [ ] **P1 · Catalogue health dashboard** (S–M). Coverage matrix: focus × category counts, flows without connected picks, events without sources, picks without images. Turns "what should we curate next?" into a screen.
- [ ] **P1 · Feature flags and remote config** (M). Toggle credit-card surfaces, new categories, or the Ask feature per role without an app release. Simple admin-managed JSON in the existing CMS, read at bootstrap.
- [ ] **P2 · Import tools** (L). CSV import for events/picks with validation preview — explicitly manual and reviewed; no scraping (product rule).

### Analytics upgrades
- [ ] **P1 · Funnel analytics** (M). Activation funnel (sign-in → focus → add flow → first completion), creator funnel (submit → decision → resubmit), event funnel (view → save → register → approved). The events already exist via `trackMobile`; this is aggregation + display.
- [ ] **P1 · Cohort and retention view** (M). Weekly cohorts, D7/D28 retention, per-focus retention. Admin-only, aggregate-only (no per-user browsing).
- [ ] **P2 · Alerting** (S). Threshold alerts (queue age > 48h, error rate, stale sources > 0 at launch) into the admin inbox.

---

## 6. UI improvements, screen by screen

Current pattern: one `ScrollView` per tab, sheets for everything, `Alert.alert` for errors, badges for status. Improvements:

### Global shell
- [ ] **P0** Root list per tab (`FlatList`/`SectionList`) with sticky section headers (Today / This week / Explore) instead of one long scroll (v1 item, restated as UI).
- [ ] **P0** Persistent top bar: wordmark, search icon, inbox with unread dot, avatar. Today the header is only a wordmark + profile button ([mobile/App.tsx](mobile/App.tsx)).
- [ ] **P1** Tab bar: restore a visible **You** tab (currently hidden; profile is avatar-only), badge counts on Studio (pending decisions) and Admin (queue size). Keep native tabs (`expo-router/unstable-native-tabs`).
- [ ] **P0** Replace `Alert.alert` errors with inline field errors + a toast/snackbar system (success, error, undo). Alerts remain only for destructive confirmations.
- [ ] **P0** Skeleton loading screens shaped like Today/cards instead of blank/spinner waits; optimistic updates for save/complete with rollback.

### Sign-in and onboarding
- [ ] **P0** OTP screen: auto-advance 6-box code input, paste-from-SMS support, resend countdown, inline error under the field, number-pad keyboard. Current flow is a generic field + Mock SMS card.
- [ ] **P0** Focus-first onboarding as designed in [docs/focus-onboarding.md](docs/focus-onboarding.md): one question, 7 focus cards with illustrations, starter preview, one CTA. Progress dots; skippable city step with "Use my city later".
- [ ] **P1** Value-first first screen: 3 swipeable intro cards ("Your today, in 3 steps", "Honest prices, checked dates", "Your city, your people") before phone entry.

### Home → Today
- [ ] **P0** Layout: greeting + date, Today checklist card (max 3 steps, expandable), next event strip, connected pick of the day, stories below the fold. Remove flow-card feed as the primary surface.
- [ ] **P0** Check-off interaction: large toggle rows (native `HabitToggle` already exists in the design system), satisfying fill animation, haptic tick **[needs dependency: expo-haptics]**, and a subtle "All done today" state — no confetti spam, one calm completion moment.
- [ ] **P1** Pull-to-refresh retained; add "last updated" caption and offline banner when showing cached data.

### Flows
- [ ] **P0** Flow details: steps as a checklist (not disclosures), sticky bottom bar ("Add flow" / "Done today"), connected picks inline under their step, next event module, sources collapsed at the bottom with checked dates.
- [ ] **P1** Flow cards: show level, rhythm, step count, "3 steps · ~10 min", and completion state ("2 of 5 done today") instead of description-only cards.
- [ ] **P1** Category browse keeps rails but adds filter chips (level, time needed) and the global search.

### Picks
- [ ] **P0** Sticky filter bar (category, tier, budget slider in INR) that stays visible while scrolling; result count; sort (price, recently checked). Budget becomes a slider + quick chips (₹500 / ₹1,000 / ₹2,500), not only a picker.
- [ ] **P0** Pick cards: image, price with "checked {date}", tier badge, disclosure icon, save toggle with optimistic state. Comparison tray: selecting 2–3 picks pins a bottom "Compare" bar.
- [ ] **P1** Swipe deck kept as "Quick decide" mode with explicit Save / Skip / Details actions (not gesture-only), progress ("3 of 8"), and an end state summarising saves.

### Events
- [ ] **P0** Event cards: date block (day/month), IST time, fee state (Free / ₹x / Fee unknown — never implied free), spots-left indicator for hosted events, save-interest toggle.
- [ ] **P1** Events list grouped: This week / This month / Later; city selector persisted (v1) with a "Near Hyderabad" grouping by area.
- [ ] **P0** Event details: sticky Register CTA, status timeline for hosted events, hosts row linking to creator profiles, add-to-calendar and share actions.

### You (profile)
- [ ] **P0** Sections: Progress (week strip + insights), My flows (manage/remove), Saved picks, My events (registrations with status), Settings, Help & feedback, Delete/export. Today it is stats text + lists.
- [ ] **P1** Avatar/initials, editable name/city/focus; role-aware (creators see Studio shortcuts).

### Creator Studio
- [ ] **P0** Dashboard layout (section 4) with status pills (Draft / In review 2d / Live / Needs changes) and one primary CTA per card (Edit, Resubmit, Manage guests, View analytics).
- [ ] **P0** Forms: stepped wizard for products like events already have; sticky save/submit bar; inline validation; autosave indicator ("Draft saved 10:42"); character counts matching server limits (v1 `Field` fix expressed as UI).
- [ ] **P1** Guest list: search-first, segmented Pending/Approved/Waitlist, swipe or bulk approve, check-in mode toggle.

### Admin
- [ ] **P0** Split into tabbed routes: Review / Content / People / Analytics / Settings, queue-first home with counts. One dense `ScrollView` ([mobile/src/AdminWorkspace.tsx](mobile/src/AdminWorkspace.tsx)) becomes five focused screens.
- [ ] **P0** Review screen: card per submission with diff-style summary, source link preview, creator history ("3 published, 1 rejected"), Approve / Reject-with-reason actions, keyboard-friendly on larger screens.
- [ ] **P1** Analytics: SVG line/bar charts for daily actives, funnel view, date-range selector shared between Overview and item analytics (v1 inconsistency fixed as UI).

---

## 7. UX experience improvements (patterns, not screens)

- [ ] **P0 · Feedback language.** Every mutation answers three states: immediate optimistic UI, confirmed state, failed state with retry/undo. No silent `catch {}` (story-seen currently swallows errors by design — keep, but log).
- [ ] **P0 · Empty states as onboarding.** Each empty state has an illustration, one sentence, one CTA ("Add your first flow", "No saved picks yet — browse under ₹500"). Never a blank list.
- [ ] **P0 · Error states with recovery.** Full-screen error only for bootstrap; inline banners elsewhere; every error shows what happened + what to do + request ID for 5xx (v1 quality bar).
- [ ] **P1 · Micro-interactions.** Check-off animation, save bookmark fill, pull-to-refresh haptic, sheet drag-to-dismiss, story progress bars with pause-on-hold. Reanimated is installed — define 150–250 ms ease-out as the house motion.
- [ ] **P1 · Haptics [needs dependency: expo-haptics].** Light tick on complete/save, success pattern on approval received, none on errors. Off by default for accessibility settings.
- [ ] **P0 · Accessibility as UX.** 44/48 pt targets everywhere, visible focus order, VoiceOver/TalkBack labels on icon buttons (top bar, toggles), Dynamic Type capped via shared `Text`, contrast-checked muted text, reduced-motion respect (stories never autoplay — also resolves the v1 docs conflict).
- [ ] **P1 · Thumb-first layout.** Primary CTAs in bottom bars/sheets, not top corners; lists avoid edge-to-edge tap rows; FAB-style "+" for Add flow / Submit where role-appropriate.
- [ ] **P1 · Perceived performance.** Image placeholders with blur/fade-in, list item memoisation, bootstrap cache-first paint (render cached Today, refresh behind).
- [ ] **P1 · Trust moments.** Before external seller/event taps: disclosure interstitial line ("You're leaving BetterHabits · price checked 12 Oct · we may earn a commission") with "Continue" — one consistent pattern.
- [ ] **P2 · Delight, sparingly.** Focus illustrations animate subtly on selection; milestone moments get one calm full-screen card; seasonal Hyderabad touches (monsoon running tips shelf) via collections, not code.

---

## 8. Design elements — add or update

### Audit of the current system
- `theme.ts` hard-codes `scheme='dark'` and [mobile/app.json](mobile/app.json) sets `userInterfaceStyle:"dark"`, while [mobile/DESIGN_SYSTEM.md](mobile/DESIGN_SYSTEM.md) promises system light/dark — the light palette exists but is unreachable (v1 item, design-owned).
- Docs say "platform system font"; the app actually loads **Inter** via `FontReadyContext` ([mobile/src/design/Text.tsx](mobile/src/design/Text.tsx)). Pick one story — Inter is a fine brand choice; update the docs and keep Inter.
- Token drift: radius `card:20` in code vs 16 in docs; type scale matches docs. Reconcile in one tokens file.
- `NeonBackdrop` (static green glow circles) is the only ambient brand element; there is no logo mark beyond the wordmark "BetterHabits." with a lime full stop, no app icon/splash system in `app.json`, and only focus/flow illustrations as artwork.

### Add
- [ ] **P0 · Brand mark and app icon set.** A simple mark (e.g. check-step glyph) derived from the wordmark full stop; icon, adaptive icon, splash, favicon. Define clear-space and minimum size.
- [ ] **P0 · Light theme enabled.** Wire `Appearance`, set `userInterfaceStyle:"automatic"`, StatusBar follows scheme, verify both palettes for contrast (esp. `muted` on `card`).
- [ ] **P0 · Component state library.** Document and build the missing primitives in `mobile/src/design/`: `Skeleton`, `Toast`, `Banner`, `EmptyState`, `SearchBar`, `FilterChips`, `StickyActionBar`, `StatusPill`, `ProgressRing/WeekStrip`, `Avatar`, `Stepper`, `SegmentedControl`. Each with default/pressed/disabled/loading/error states.
- [ ] **P1 · Iconography set.** One consistent set (SF Symbols / Material symbols via existing native tabs pattern) for focus areas, pick categories, event topics, status states; no emoji in UI.
- [ ] **P1 · Illustration system.** Extend `FocusIllustration`/`FlowIllustration` style to empty states, onboarding, milestones and error screens; one illustrator style, dark/light variants.
- [ ] **P1 · Data-viz style.** Chart colours from tokens, INR/IST formatting helpers (`formatInr`, `formatEventTime`, `habitDay` from v2) used by every chart and card.
- [ ] **P1 · Motion language.** Shared durations/easing (150/250/400 ms), sheet and check-off animations, reduced-motion fallbacks. Reanimated only — no new dependency.
- [ ] **P2 · Sound/haptic language.** Defined with haptics above; no UI sounds by default.

### Update
- [ ] **P0 · Colour semantics.** Tokens for `success/warning/danger/info` plus status colours for Draft/In review/Live/Needs changes; today only `lime/lavender/danger` exist, so status is carried by text badges alone.
- [ ] **P0 · Typography roles.** Add `display` (onboarding/milestones), `label` (chips/pills), numeric tabular style for prices/countdowns; cap Dynamic Type in shared `Text` (`maxFontSizeMultiplier`).
- [ ] **P1 · Elevation and surfaces.** Define card/sheet/overlay elevation + border rules for both themes (dark currently relies on `line` borders); `NeonBackdrop` usage rules (Home/Onboarding only, never behind forms/lists).
- [ ] **P1 · Spacing/layout grid.** 4-pt scale already exists; add screen padding, section spacing and max-content-width rules (tablet is unsupported by config — keep phone-first, state it).
- [ ] **P1 · Design-system governance.** Finish `DESIGN_SYSTEM.md` as the source of truth (tokens, components, states, do/don't), resolve the font and radius drift, and add a simple visual component catalogue screen hidden behind an admin/dev flag for QA.
- [ ] **P2 · Brand voice in design.** Copy tokens: CTA verbs ("Add flow", "Save pick", "Request a spot"), status words, error tone (plain Indian English, no guilt) — written into the design doc so creators/admins reuse them.

---

## 9. Prioritised build order for v3 items

**Now (with the hero release):** global search entry, notification centre (in-app), share + deep links, report-an-issue, Today checklist UX + sticky bars, filter/compare trays, event status timeline, Studio dashboard + wizard parity, admin queue-first split, toast/skeleton/empty-state primitives, light theme, status colours, brand icon set, trust interstitial.

**Next (first updates):** push + local reminders, calendar add, offline cache/queue, week strip + insights, reflection journal, guided pick decision, collections, creator analytics + public profile + guest tooling, admin funnels + catalogue health, haptics + motion pass.

**Later (validate first):** widgets, flow buddies, creator following, waitlist, post-event ratings, flow proposals by creators, Ask BetterHabits in-app, smart next action, i18n scaffolding, CSV import.

---

## 10. Decisions needed from you

1. **Dependencies:** approve `expo-notifications` (+ local reminders), `expo-haptics`, `expo-image-picker`, and a network/cache package when their phase arrives? Each is flagged above; nothing gets added silently.
2. **Social scope:** are flow buddies / creator following in scope for this year, or does BetterHabits stay single-player + events?
3. **Custom flows:** should users assemble personal flows from library steps (P1), or is that creator-only territory?
4. **Typeface:** keep Inter as the brand font (update docs) or follow the docs and go system font?
5. **Admin on mobile:** invest in the five-screen mobile admin, or move heavy admin (analytics, imports) to a desktop web console later and keep mobile admin queue-only?
