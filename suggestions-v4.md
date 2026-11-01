# BetterHabits suggestions v4 — detailed per-item prompts

This document replaces the shorthand in [suggestions-v3.md](suggestions-v3.md). Every P0 and P1 item from v3 is expanded below into a **standalone prompt** you can hand to a developer or an AI agent one at a time. P2 items are given as short briefs at the end.

**How to use this file**

1. Parts are grouped by area (A cross-cutting, B user, C creator, D design system, E admin, UI screens and UX patterns, then P2 briefs). Use the **Prompt index and run order** at the end of this file to decide what to run next; it lists every prompt's dependencies.
2. Before any single prompt, paste the **Master preamble** below. It carries the project rules that every prompt assumes.
3. One prompt = one reviewable change. Do not combine prompts unless a prompt explicitly says it depends on an earlier one.
4. Where a prompt says **[needs dependency]**, stop and get approval before adding any package. No prompt in this file authorises changing dependencies, rebuilding, committing or deploying.

**Master preamble (prepend to every prompt below)**

```text
Work in the existing BetterHabits project at /Users/gauravmalhotra/Documents/Rugram.
Mobile is Expo/React Native in mobile/, backend is Next.js in src/, shared logic in shared/.
Read AGENTS.md first — this Next.js version has breaking changes; check node_modules/next/dist/docs/ before using unfamiliar APIs.
Preserve all existing uncommitted changes. Do not change dependencies, rebuild, commit or deploy unless this prompt says so.
Roles are user, creator, admin; the server must enforce every permission — UI visibility is not authorisation.
Product rules: content is non-prescriptive and source-linked; never render an unknown price or fee as free; show affiliate disclosure before the tap; show price-check / source-check dates; plain Indian English; "done today" language, never streak guilt.
Reuse the design tokens in mobile/src/design/theme.ts and components in mobile/src/design/ before creating new ones.
Verify with the narrowest relevant checks (typecheck / targeted tests) and report files changed.
```

---

# Part A — Cross-cutting functionality

## Prompt A1 · P0 · Global search

**Goal.** A member can find any flow, pick, event or exercise from anywhere in the app in under three taps, instead of browsing category rails.

**What to build.** Add a search icon in the top bar of Home, Flows, Picks and Events that opens one shared search screen. The screen has an auto-focused search field with a recent-searches list (stored locally, last 8, clearable) and, below it, focus-scoped suggestions ("Popular in Running", "Checked this week"). Results are grouped in sections — Flows, Picks, Events, Exercises — each row showing the same card summary used in browse (title, one-line cue, price with check date for picks, date block for events). Tapping a result opens the existing detail sheet/route for that item and records a `search_open` analytics event with result kind, never the raw query text.

**Behaviour and states.** Search filters the already-loaded payload client-side first; if the catalogue grows past payload bounds, add a `?q=` server parameter rather than shipping more data. Show a specific empty state ("No matches for 'whey' in Picks — try Supplements") with a browse CTA. Debounce input by 250 ms, keep the keyboard up while typing, and preserve the query when returning from a detail.

**Data and files.** Client filter helpers go in `shared/` (for example `shared/search.ts`) operating on `HabitFlow`, `Product`, `CityEvent` and `Exercise` from `shared/mobile.ts`; UI in a new `mobile/src/SearchScreen.tsx`; top-bar wiring in `mobile/App.tsx`. No schema change, no new dependency.

**Acceptance.** Searching a known flow title, pick title and event city each returns the item in the correct group; empty query shows recents and suggestions, not a blank screen; VoiceOver announces result counts; unit tests cover the filter helpers including tier/city constraints.

## Prompt A2 · P0 · In-app notification centre (inbox)

**Goal.** Members, creators and admins each get one reliable place inside the app where important outcomes arrive, replacing "Check for updates" and off-app WhatsApp messages.

**What to build.** A bell icon in the top bar with an unread-count badge opens an inbox screen. Items are typed: `registration_approved`, `registration_declined` (with host-visible reason if provided), `event_cancelled`, `event_changed`, `listing_published`, `listing_rejected` (with reason), `admin_queue_digest` (new pending submissions count) and `report_resolved`. Each item shows an icon, plain-language title, one-line body, relative time and a deep link to the related flow/pick/event/submission. Items can be marked read individually and all at once; read items remain visible for 30 days.

**Behaviour and states.** The inbox is the source of truth — later push notifications (Prompt A3) only point here. Generating an item must be idempotent per business event (approving a guest twice creates one item). Empty state: "Nothing here yet. Approvals and updates will appear here." Polling may reuse the existing invite-notification pattern (`mobile/src/EventInviteNotifications.tsx`) until push exists.

**Data and files.** New `notifications` storage (table in database mode, in-memory/demo equivalent), created by the same server actions that approve/decline/cancel/review; read model added to `MobilePayload`; UI in `mobile/src/NotificationCentre.tsx`; shared types in `shared/mobile.ts`. Requires the migration discipline from suggestions.md section 0.

**Acceptance.** Approving a guest produces exactly one inbox item for that guest with a working deep link; rejecting a listing produces one item for the creator including the reason; unread badge clears on mark-all-read; a non-recipient cannot read another user's items via the API.

## Prompt A3 · P1 · Push notifications [needs dependency]

**Goal.** Time-sensitive inbox items (Prompt A2) also reach the user when the app is closed, without making push a second source of truth.

**What to build.** Integrate Expo Notifications (requires explicit dependency approval and a development build — Expo Go limits apply). Request permission contextually, never on first launch: the first time a user enables a flow reminder, registers for an event, or a creator submits a listing, explain in one sentence what they will receive and ask then. Store device push tokens per user, remove them on logout and on token-invalid errors from the push service. Server sends pushes only for: event approval/decline/cancellation, listing decision, and user-scheduled reminders (Prompt A6). Tapping a push opens the inbox item's deep link.

**Behaviour and states.** If permission is denied, the app must keep working fully on the in-app inbox, with a Settings row explaining how to enable notifications later. Respect quiet hours (default 22:00–07:00 IST) for non-critical pushes. Every push has a mute control by type in Settings (Prompt A8).

**Data and files.** Token storage on the user/profile record; send logic beside the notification creation in the server notification module; client registration in `mobile/src/session.tsx` after sign-in; permission copy in Settings. No push content may include health details beyond the flow/event title.

**Acceptance.** With permission granted, a server-side approval delivers a push whose tap lands on the correct event; with permission denied no crash or repeated prompting occurs; logout stops pushes to that device; tokens are never exposed to other users.

## Prompt A4 · P0 · Sharing flows, picks and events

**Goal.** A member can send a flow, pick or event to a friend with enough context that the friend understands it before opening the app.

**What to build.** Add a Share action (icon + label) on flow details, pick details and event details using React Native's built-in `Share` (no new dependency). The message contains the title, one plain-language line ("3 steps · about 10 minutes", "₹499 · price checked 12 Oct · sources linked", "Sat 18 Oct, 9:00 AM IST · Hitech City"), and a `betterhabits://` deep link (`/flow/[id]`, `/pick/[id]`, `/event/[id]`). Add the matching expo-router routes so links open the correct detail for a signed-in user and route a signed-out user through sign-in first, preserving the destination. Share taps are recorded as analytics (`share_opened` with item kind/id only).

**Behaviour and states.** If the item is archived or unpublished when a link is opened, show a respectful unavailable state with a related-items suggestion, never a dead screen. Sharing a hosted event must never expose the guest list. Private data (saved state, registrations) is indicated after opening, not inside the shared message.

**Data and files.** Route files under `mobile/app/` for the three item kinds; share-message builders as pure functions in `shared/` so copy is testable; buttons in `FlowDetails`, `PickDetails` and the event detail components.

**Acceptance.** Sharing each item kind produces the specified message format; opening a link cold-starts into the right detail after sign-in; an archived item link shows the unavailable state; unit tests cover the message builders.

## Prompt A5 · P1 · Add to calendar [needs dependency]

**Goal.** An approved or externally-registered event lands in the user's own calendar with correct IST timing, so attendance does not depend on reopening the app.

**What to build.** Add an "Add to calendar" action on event details (and on the registration timeline once approved) using an approved calendar package or, as a dependency-free first step, generating and opening an `.ics` via the share/open flow — decide during implementation and record the choice. The calendar entry contains title, start/end in IST with explicit time zone, venue plus area, source/registration link, and "Saved from BetterHabits" in the notes. For external events (Luma/Meetup), the notes must say registration happens with the provider.

**Behaviour and states.** If the event is cancelled or rescheduled, the app cannot edit the user's calendar entry reliably: the inbox item (Prompt A2) must say "Update your calendar entry" and the event screen shows the new time prominently. Never write to the calendar without an explicit tap.

**Data and files.** Event detail and registration panel components; a small `shared/calendar.ts` for entry/ICS text generation with tests. No schema change.

**Acceptance.** Adding a hosted event creates an entry with the correct IST start/end and venue; a date-only event is stored as a date-only entry; unknown end times are not invented (a stated default duration is labelled as such).

## Prompt A6 · P1 · Reminders (flow and reflection)

**Goal.** Users can ask BetterHabits to nudge them at a time they choose, per flow, plus one weekly reflection nudge — helpful, never nagging.

**What to build.** On each joined flow, a Reminder row: Off / Daily at a chosen time / Weekdays / Custom days, implemented with local notifications (depends on Prompt A3's dependency approval). One reminder per flow maximum. Default suggestion comes from the step cue ("After breakfast" → 08:00) but is never enabled without a tap. A separate weekly reflection reminder (day/time picker) supports the journal in Prompt B4. Settings lists all reminders in one place with toggles.

**Behaviour and states.** Reminders pause automatically when the flow is removed and resume copy explains notifications permission if it is off. Copy is neutral: "Time for your Running flow — 2 steps today", never "You missed yesterday". Quiet hours apply.

**Data and files.** Reminder preferences on the profile (`reminderPrefs` by flowId); scheduling in a client notifications helper; UI in `FlowDetails` and Settings (`mobile/App.tsx` You section becomes Settings per Prompt A8).

**Acceptance.** Setting, changing and removing a reminder schedules/cancels exactly one local notification; removing the flow cancels its reminder; permission-denied state shows inline guidance and no crash.

## Prompt A7 · P0 · Report an issue / wrong price / broken link

**Goal.** Every pick and event can be reported in two taps, giving admins a user-powered trust signal that feeds the stale-sources worklist.

**What to build.** A "Report" action in the overflow of pick and event details opens a short sheet: reason chips (Wrong price, Broken link, Wrong date/venue, Misleading claim, Other), optional one-line note, and a note that reports are anonymous to creators. Submitting creates a `report` record targeted at the item, enters the admin queue (Prompt E2), and confirms with "Thanks — our team will re-check this." Rate-limit reports per user/item and require sign-in.

**Behaviour and states.** Reporting never hides the item for other users automatically; admins decide. A user who reported sees "You reported this on {date}" instead of the form. Reason chips are shared constants so analytics stays clean.

**Data and files.** `reports` storage + create action in the mobile API with validation; admin read in the admin content store; UI sheet component reused by picks and events; types in `shared/mobile.ts`.

**Acceptance.** A report appears in the admin worklist with item, reason and date; duplicate reports by the same user on the same item are merged or blocked politely; creators never see reporter identity.

## Prompt A8 · P1 · Settings screen

**Goal.** Everything about "my account and preferences" lives in one predictable place instead of being scattered across the profile tab.

**What to build.** Promote the You tab into Profile + Settings with sections: **Profile** (name, handle, city — editable, focus — changeable), **Reminders and notifications** (per-flow reminders link, push preferences by type, quiet hours), **Appearance** (System / Light / Dark, wired to Prompt D2), **Data** (export my data, delete account — the endpoints from suggestions.md section 0), **Help** (report a problem, contact, licences including the Inter licence), and **About** (version, demo-mode indicator when active). Role-specific rows (Studio shortcuts, Admin) appear only for those roles and remain server-enforced.

**Behaviour and states.** Destructive actions (delete account) use a typed-confirmation sheet, never a bare alert. Saving profile fields is inline-validated and confirms with a toast. Signing out lives here and must work offline (clear local session first, per suggestions.md).

**Data and files.** New settings route/screen in `mobile/app/`; profile update actions already partly exist (`action:'city'`) — extend, do not duplicate; shared form validation in `shared/`.

**Acceptance.** Changing city/focus persists across restart and reflects in Events/Today; appearance choice persists; delete/export entries are reachable within two taps from Settings; no setting can change another user's data.

## Prompt A9 · P1 · Offline mode: cached payload and queued actions [needs dependency]

**Goal.** The app stays useful on poor Indian mobile networks: the last known Today, saved picks and registered events are always readable, and check-offs or saves made offline are never lost.

**What to build.** Three parts. (1) **Connectivity awareness:** detect online/offline (an approved network package such as `expo-network` or NetInfo — record which) and show a slim, non-blocking banner at the top of every tab: "You're offline · showing what you saw at 9:42". (2) **Cache-first paint:** persist the last successful `MobilePayload` per signed-in user on device (approved storage package; the session token itself stays in SecureStore and is never written to this cache), render it immediately on launch, then refresh in the background and replace it. (3) **Action queue:** `complete`, `save`, `flow` (join/leave) and `story-seen` actions made while offline are applied optimistically and appended to a durable queue with their existing explicit `enabled` state and request IDs; on reconnect the queue flushes in order, one at a time. Rows affected by queued actions show a small "Saved offline · will sync" caption until confirmed.

**Behaviour and states.** Actions that cannot be safely queued — event registration, creator submissions, admin actions, profile/role changes, account deletion — are disabled offline with an inline explanation ("Needs a connection"), never silently queued. If a queued action is rejected by the server on flush (for example, the flow was archived), drop it, roll back that row, and show one toast summarising what could not be synced. Logout clears both the cache and the queue. The cache is bounded (one payload per user, overwritten) and is deleted on account deletion.

**Data and files.** Client cache and queue helpers in `mobile/src/` (for example `offline.ts`), wired into `mobile/src/session.tsx` (initial load, refresh) and the `change()` mutation path in `mobile/App.tsx` (or its extracted module after the v1 file split). Queue item shape and the "safe to queue" action list as a pure, tested module in `shared/`. The backend already treats these actions as idempotent with explicit desired state — no server change should be needed; if one is, stop and describe it first.

**Acceptance.** In airplane mode the app opens to the cached Today within one second; completing two steps offline and reconnecting records exactly two completions on the server; registration and submission buttons are disabled offline; logout leaves no cached payload or queued action on the device.

---

# Part B — User (member) features

## Prompt B1 · P0 · Today checklist with step check-off

**Goal.** Home becomes "Today": the 1–3 steps a member can actually do today, each tappable to complete — the core daily interaction the backend already supports but the UI lacks.

**What to build.** Replace the flow-card feed at the top of Home with a Today card: for each joined flow, the steps relevant today (daily steps always; weekly steps on their rhythm) rendered as large toggle rows using the existing native `HabitToggle` in `mobile/src/design/components.shared.tsx`, sending explicit desired state via `action:'complete'` with the step id `flowId:stepId` and the device time zone (helper already sketched in `mobile/App.tsx`). Completing animates the row (Prompt D7) and updates the "done today" count immediately (optimistic), rolling back with a toast if the request fails. An undo affordance is available for a few seconds after each toggle. When all of today's steps are done, show a calm completion state ("That's today done. See you tomorrow.") plus tomorrow's first step as a preview.

**Behaviour and states.** Empty (no flows): illustration + "Add your first flow" CTA. Loading: skeleton rows. Offline: cached Today with the offline banner and queued completions (Prompt A9). Steps already completed today render checked and remain un-checkable. The full step list still lives in FlowDetails; Today never shows more than today's steps.

**Data and files.** Read model: derive today's steps from `profile.flowIds`, flows and `profile.completed` in a pure helper in `shared/` (testable); UI in `mobile/src/HomeFeed.tsx` restructured around the Today card; state stays in session context (Prompt UI1).

**Acceptance.** Tapping a step records exactly one completion for today in the device time zone; un-tapping removes it; You stats and Today agree; killing and reopening the app preserves state; screen readers can toggle every row with a correct label.

## Prompt B2 · P0 · Week view and completion history

**Goal.** Members can see their recent consistency at a glance — history that encourages without streak pressure.

**What to build.** A `WeekStrip` component (new design primitive, Prompt D3): seven day cells for the current week showing, per selected flow or across flows, whether any step was done. Place it on Today (compact, across flows) and on You/Profile (per flow). Tapping a day shows that day's completed steps in a small list. Data comes from completion history: today the profile only reliably exposes today's completions, so extend the read model to return the last 28 days of completion day-keys per flow (bounded, consistent with the 90-day analytics pruning in the backend).

**Behaviour and states.** No streak counters, no red "missed" days — empty days are neutral dots. Weeks start Monday (Indian convention). Time-zone handling uses the same `habitDay(timeZone)` helper everywhere (Prompt D5).

**Data and files.** Server: bounded history field on the profile payload; client: `mobile/src/design/` `WeekStrip` plus usage in Home/You; helpers and tests in `shared/`.

**Acceptance.** A completion made today appears in the strip immediately and after restart; the strip renders identically in light/dark and at large text sizes; history never returns more than the bounded window.

## Prompt B3 · P1 · Flexible scheduling, snooze and skip

**Goal.** Flows adapt to real life: a weekly step should not demand daily attention, and a busy day should not feel like failure.

**What to build.** Each step gains optional user scheduling: preferred days (for weekly steps), and per-step actions "Snooze to tomorrow" and "Skip today" on the Today row overflow. Snoozed steps appear in tomorrow's Today with a small "snoozed" tag; skipped steps simply leave today's list and are recorded distinctly from completions (analytics event `step_skipped`, never counted as done). Defaults come from the flow's `rhythm` so most users never touch settings.

**Behaviour and states.** Snooze/skip are one tap with undo. Copy never uses "failed" or "missed". Admin/creator views of analytics must be able to distinguish completed, skipped and untouched.

**Data and files.** Step scheduling preferences keyed `flowId:stepId` on the profile; Today derivation helper from Prompt B1 extended; actions in the mobile API alongside `complete`.

**Acceptance.** Snoozing moves the step to tomorrow exactly once; skipping removes it from today without affecting completion counts; analytics distinguishes the three outcomes.

## Prompt B4 · P1 · Saved weekly reflection journal

**Goal.** The weekly reflection prompt that exists in flow content becomes a private, saved journal the member can look back on.

**What to build.** At week's end (or anytime from the flow/You), the flow's `review` prompt opens a small editor: the prompt, a multiline field (about three lines), and Save. Saved reflections list privately on You under "Reflections" (date, flow, prompt, note), editable and deletable by the owner only. Last week's note is shown above the new prompt ("Last week you wrote…") to close the loop described in suggestions-v2.

**Behaviour and states.** Entirely optional and private: never shared, never used for recommendations copy, never shown to creators/admins except as aggregate counts ("reflections written"). Empty state invites a first reflection without pressure. Optional reminder ties into Prompt A6.

**Data and files.** Small `reflections` storage (userId, flowId, weekKey, prompt, note, timestamps); API actions create/update/delete/list (owner-scoped); UI in FlowDetails (entry) and You (list).

**Acceptance.** A saved reflection persists across devices for the same account; another user cannot read it; deleting removes it; exports (Prompt A8) include reflections.

## Prompt B5 · P1 · Progress insights

**Goal.** Members get a simple, honest picture of their last four weeks — enough to feel progress, never a clinical score.

**What to build.** A "Your last 4 weeks" card on You: steps done per week (SVG bar chart, Prompt D5), most consistent flow ("Running — done on 9 days"), current focus and when it was chosen, and flows completed. All numbers derive from the bounded history in Prompt B2. Insights are descriptive only: no grades, percentiles, health claims or comparisons with other users. Include a "What counts?" disclosure line explaining the numbers.

**Behaviour and states.** New users see an encouraging empty state ("Your first week will appear here"). Charts have text equivalents for screen readers (the same values as a list).

**Data and files.** Pure aggregation helpers in `shared/` with unit tests (week boundaries in the profile time zone); chart component in `mobile/src/`; placement in You.

**Acceptance.** Chart values match raw history for fixture data across a month boundary; VoiceOver reads the same values as text; no insight renders with fewer than one recorded week of data.

## Prompt B6 · P1 · Personal flow builder (assemble my own flow)

**Goal.** A member can build "My morning" from existing, source-linked library steps without the app ever publishing unreviewed health claims.

**What to build.** From Flows, "Build your own" opens a builder: name your flow, then add 3–5 steps chosen from a searchable list of steps drawn from published flows (each step keeps its source flow attribution and cue). Reorder by drag or up/down controls, set simple cues, save. The personal flow appears in My Flows, feeds Today (Prompt B1), supports reminders and check-off exactly like editorial flows, and is private by default. Steps are references, not copies — if a source flow is archived, the step shows "from {flow}, no longer available" and can be removed.

**Behaviour and states.** Minimum 1, maximum 7 steps. No free-text step creation in this version (that is the creator flow-proposal path, Prompt C10 brief). Deleting a personal flow never touches editorial flows or history.

**Data and files.** `personalFlows` on the profile (id, title, stepRefs); derivation into the same Today pipeline; builder UI reusing sheet/stepper patterns; types in `shared/mobile.ts`.

**Acceptance.** A personal flow's steps can be completed and appear in the week strip; archiving a source flow degrades gracefully; personal flows are invisible to other users.

## Prompt B7 · P0 · "Why am I seeing this?" reasons

**Goal.** Every suggested flow, pick and event explains itself in one line, turning recommendations into trust.

**What to build.** A shared `ReasonLine` component and pure reason builders in `shared/`: for flows — "Because your focus is Running" / "Beginner · about 10 minutes a day"; for picks — "Fits your ₹1,000 budget · Essential tier · price checked 12 Oct"; for events — "Hyderabad · this Saturday · matches your Coding focus". Reason data comes from fields that already exist (`focusId`, tier, budget filter, `checkedAt`, city, topic). Show the reason on browse cards, Today modules, story cards and search results — same position, same typography (`caption`, muted) everywhere.

**Behaviour and states.** If no honest reason exists (purely editorial ordering), say so: "Editor's pick · checked {date}". Never fabricate personalisation ("Trending near you" without data is banned). Affiliate-bearing picks append "· may earn us a commission" or rely on the screen-level disclosure (Prompt UI7) — choose one pattern and apply it consistently.

**Data and files.** `shared/reasons.ts` builders with tests; `ReasonLine` in `mobile/src/design/`; adoption across `BrowseShelf`, `HomeFeed`, `PicksBrowser`, `HyderabadEvents`.

**Acceptance.** Every card type in browse and Today shows a reason line; unit tests pin the wording for budget/checked-date/focus cases; no card claims a reason its data cannot support.

## Prompt B8 · P1 · Guided pick decision and save-for-later

**Goal.** Turn the pick catalogue from a list into a decision: answer two questions, get three finalists, compare, decide later if needed.

**What to build.** A "Help me decide" entry on Picks launches a three-step sheet: (1) use case (from `pickUseCases` with plain labels), (2) budget slider with quick chips, (3) up to three finalists using existing comparison data (`PickDecisionComparison`, `PickInsight`) with specifications, assessment and the "nothing to buy / water instead" alternative where one exists. Each finalist can be Saved, opened in full details, or opened at the seller (through the trust interstitial, Prompt UI7). "Save for later" is a first-class list on You with price-freshness badges ("checked 3 days ago" / "checked 34 days ago — may have changed").

**Behaviour and states.** The swipe deck remains as "Quick decide" but gains explicit Save/Skip/Details buttons and an end summary (Prompt UI5). Saved picks never auto-notify about price changes in this version; freshness is shown, not pushed.

**Data and files.** Decision flow component beside `mobile/src/PickDecisionComparison.tsx`; finalist selection as pure logic in `shared/pick-decision.ts` (extend, test it); saved list reuses `SavedPicks`.

**Acceptance.** Answering use case + budget never returns items above budget or outside the use case; finalists show checked dates and disclosures; saved-for-later shows freshness for every item.

## Prompt B9 · P1 · Continue where you left, and collections

**Goal.** Home remembers intent ("continue") and editors can merchandise beyond raw categories ("collections").

**What to build.** Two Home modules under Today: **Continue** — last opened flow (with today's progress), last compared pick, next registered event; stored client-side from navigation events, cleared on logout. **Collections** — admin-curated shelves ("Under ₹500 for runners", "Hyderabad this month", "Start CrossFit safely") managed as a CMS kind in the existing admin content system, each collection an ordered list of existing flow/pick/event IDs with a title and one-line description. Collections render through the existing shelf components with reason lines (Prompt B7).

**Behaviour and states.** Continue hides itself when empty — no placeholder box. Collections with fewer than two live items are not rendered; archived members drop out automatically.

**Data and files.** Client continue-state in session-adjacent local state; collection kind in `shared/admin-content.ts`, admin editing via existing `ContentFields`, rendering via `BrowseShelf`.

**Acceptance.** Reopening the app shows the last flow in Continue; an admin can create a collection that appears on Home without an app release; removing an item from the catalogue removes it from the collection view.

## Prompt B10 · P0 · Event registration status timeline and reminders

**Goal.** A member always knows where their event request stands and is reminded before the day — no manual "Check for updates".

**What to build.** On event details and on You → My events, render registration as a vertical timeline: Requested {date} → Approved/Declined {date, reason if given} → Reminder (a day before, via inbox/push per Prompts A2/A3) → Event day → Done. The current badge becomes the timeline's current step. "Add to calendar" (Prompt A5) appears once approved. Hosted-event changes (time/venue/cancellation) insert a highlighted timeline entry and an inbox item.

**Behaviour and states.** External events (Luma/Meetup) show a simpler timeline: Saved interest → Register with provider (link) → Event day, and never imply BetterHabits controls the registration. Declined and cancelled are terminal states with respectful copy and a "Browse similar events" action.

**Data and files.** Status derivation in `shared/event-registration.ts` (extend the existing state machine, keep names hidden until approval); UI in `EventRegistrationPanel` and You; events emitted by host actions in `src/lib/event-registration-store.ts`.

**Acceptance.** Each host action advances the guest's timeline and creates the matching inbox item exactly once; external events never show approval steps; past events move to a Past section automatically.

## Prompt B11 · P1 · Event context: maps, area and attendee counts

**Goal.** Event cards answer "where exactly, how far, who else" without exposing private guest data.

**What to build.** Event details gain: venue + neighbourhood, a "Open in Maps" action (system maps link, no maps SDK), and a privacy-safe social line — "12 going · 3 people from your flows" (counts only, computed from approved registrations and shared flow membership; names remain hidden until approval per the existing rule). Cards show a spots-left indicator for hosted events ("4 spots left" under a threshold, "Full" at capacity) using the existing capacity guards.

**Behaviour and states.** Counts under 3 approved attendees are shown as "Small group" rather than a number, to avoid identifying individuals. Distance text is only shown if the member's city/area is known; never request location permission for this feature in this version.

**Data and files.** Counts from the registration store (aggregate query, no guest rows to clients); UI in `HyderabadEvents`/event details; helpers in `shared/event-presentation.ts`.

**Acceptance.** Pending guests' names never appear in any payload; spots-left matches the server's capacity count during concurrent approvals; maps link opens the venue query correctly on iOS and Android.

---

# Part C — Creator features

## Prompt C1 · P0 · Studio dashboard

**Goal.** Studio stops being a submit form and becomes the creator's home: what needs attention, what is waiting, what is live and how it is doing.

**What to build.** Studio opens with four sections: **Needs attention** (rejected items with the admin's reason and a Resubmit action; drafts older than 7 days), **In review** (pending items with submitted date and age, "In review for 2 days"), **Live** (published items with views/saves/registrations summary from Prompt C6), and **This month** (event quota meter showing used/total with pending/published/archived breakdown). Below, the two primary actions: Submit a product, Host an event. Withdraw and edit actions for own pending items live on each card (depends on the v1/v2 lifecycle work). Every card's primary button is the single next action (Edit, Resubmit, Manage guests, View analytics).

**Behaviour and states.** Empty Studio (new creator) explains the loop in three lines with one CTA. Quota at limit disables Host with an explanation of when it resets (India calendar month). All lists come from a dedicated own-items query — never filtered out of the public catalogue page (suggestions.md, creator section).

**Data and files.** Scoped creator read model in `src/lib/mobile-store.ts` (or a split creator module after the v1 file split); Studio UI extracted from `mobile/App.tsx` into `mobile/src/CreatorStudio.tsx`; status pills from Prompt D3.

**Acceptance.** A rejected item appears under Needs attention with its reason; quota numbers match the server count for fixtures across a month boundary; a creator never sees another creator's items.

## Prompt C2 · P0 · Drafts with autosave, duplicate and templates

**Goal.** Creators never lose work and never retype recurring submissions.

**What to build.** Product and event forms autosave as server-side drafts (status `draft`, invisible to members and to the review queue until submitted). The form header shows "Draft saved 10:42" after each debounced save. Studio lists drafts with Resume and Delete. Published or past items gain **Duplicate**: products copy all fields for a variant; events copy everything except date, opening the wizard at the date step. **Templates** ("Tech meetup", "Run club", "Product pick") pre-fill structure (topics, agenda fields, disclosure text) without pre-filling facts. Drafts do not consume event quota; submitting does, and the UI says so before the submit tap.

**Behaviour and states.** Leaving a dirty form asks "Keep draft?" only if autosave somehow failed; normally closing just keeps the draft. Deleting a draft confirms. Request IDs remain stable per draft so retries never duplicate submissions.

**Data and files.** Draft status in the catalogue store with owner scoping; autosave calls debounced in the editor components; template definitions in `shared/`; wizard reuse from `EventLinkFields`/`ProductFields`.

**Acceptance.** Killing the app mid-form and reopening restores the draft; duplicate creates an independent editable copy; quota is unchanged until submit; drafts never appear in member payloads.

## Prompt C3 · P1 · Pre-submit checklist and member preview

**Goal.** Most rejections are preventable: show creators the exact quality bar before an admin ever sees the item.

**What to build.** The final step of both wizards is a checklist that evaluates the actual form: source link present and HTTPS; disclosure present if any affiliate signal (URL/tag) exists — required, resolving the v1 "optional" label conflict; image attached with source and licence (Prompt C4); for events, fee entered or explicitly marked "I don't know the fee"; date in the future; capacity set for hosted events. Each row links back to its step. Beside it, **Preview as member** renders the real member card and detail (using the production components) so creators see disclosure placement and truncation before submitting. Submit stays disabled until required rows pass; warnings (for example "price not checked recently") never block.

**Behaviour and states.** Checklist state updates live as fields change. The preview uses demo-safe rendering: seller links in preview do not navigate away.

**Data and files.** Pure validators shared between client and server (`shared/purchases.ts`, `src/lib/product-validation.ts` — one source of truth); checklist UI in the wizard shell; preview reuses `ProductPreview`/`EventPreview` with member components.

**Acceptance.** Removing the disclosure while an affiliate tag exists blocks submit with an inline explanation; the preview matches the published member view for the same data; server rejects what the checklist would have blocked (no client-only rules).

## Prompt C4 · P1 · Image upload with licence [needs dependency]

**Goal.** Creator products and events can carry a real image, with provenance recorded, instead of an optional URL the form never collected.

**What to build.** Add image selection (approved image-picker dependency) to product and event forms: pick from library, basic preview with crop guidance, upload to server storage (or a validated remote URL as an interim step — record which), then required fields: source (where the image came from) and licence/permission ("I own this", "Licensed from supplier", "Organiser-provided"). Members see the image with an unobtrusive source credit in details. Submissions without an image remain allowed but the checklist (Prompt C3) marks it as a quality warning. Reject oversized or non-image files client- and server-side.

**Behaviour and states.** Upload progress and failure retry inline; removing an image confirms. The preview never renders an `Image` with an undefined source (current bug noted in suggestions.md). Admins can remove an image during review without rejecting the whole item, recording it in the audit.

**Data and files.** Upload endpoint with type/size validation and ownership of stored files; `imageUrl`, `imageSource`, `imageLicence` on the catalogue record; form fields in `ProductFields`/`EventLinkFields`; rendering guards in previews.

**Acceptance.** A creator can submit a product with an image that members see credited; a licence-free image cannot be submitted; an admin image removal is audited; broken image URLs fall back to the illustrated placeholder.

## Prompt C5 · P1 · Recurring events and richer event fields

**Goal.** Run clubs and meetups — the events creators actually host repeatedly — take seconds to schedule, and event pages carry the structured detail members ask about.

**What to build.** Two parts. (1) **Recurrence:** in the event wizard, "Repeat" with weekly/fortnightly × N occurrences (cap 6); the confirmation screen lists every date and the exact quota consumption ("This uses 3 of your 4 October slots") before creating. Each occurrence is its own event (own guest list) linked by a `seriesId`, so the creator can later edit or cancel "this date" or "this and all future dates". (2) **Richer fields:** optional structured fields — co-hosts (the existing `organizers` array), agenda (up to 6 rows of time + item), what to bring, accessibility (step-free access: yes / no / not confirmed; accessible toilet: yes / no / not confirmed), session language, age guidance, kit or dress notes, and how guests may contact the host. Each renders in a fixed order on event details and is hidden when empty.

**Behaviour and states.** Quota follows the current rule — each occurrence is one submission counted in the India calendar month it is submitted — and the confirmation screen must state that plainly. If the series exceeds the remaining allowance, only the dates that fit are created and the rest are listed as "Not created — over this month's limit (resets 1 Nov)". If you want a series to count once, raise it as a product decision before implementing. In the admin review queue (Prompt E1) a series appears as one grouped item that can be approved whole or per date. Editing "all future dates" never changes past occurrences or existing guest lists; cancelling one occurrence notifies only that occurrence's guests (Prompt A2). Accessibility "not confirmed" renders as "Not confirmed — ask the host", never as an assumption.

**Data and files.** `seriesId` and the new optional fields on `CityEvent` in `shared/mobile.ts`; validation in `src/lib/event-validation.ts` (agenda ≤ 6 rows, bounded text lengths that match the form's `maxLength`); quota computation in `shared/creator-events.ts` and the store; wizard steps in `mobile/src/EventLinkFields.tsx` and `EventEditorControls.tsx`; rendering in event details and `EventPreview.tsx`. Keep the capacity and cancellation guards in `db/migrations/013_hosted_event_guards.sql` intact for every occurrence.

**Acceptance.** Creating a 4-week series with 2 slots left creates exactly 2 events and explains the other 2; editing one occurrence leaves the others unchanged; empty optional fields never render; the server rejects a 7-row agenda even if the client is bypassed.

## Prompt C6 · P0 · Creator analytics

**Goal.** Creators can see whether their picks and events are actually helping people, which is the main reason to keep contributing.

**What to build.** Two surfaces. (1) **Studio Live cards** (Prompt C1) show a compact 30-day summary: detail views, saves, seller-link taps (picks) or requests and approvals (events). (2) **Item analytics screen** opened from the card: 7 / 30 / 90-day selector, a daily line chart (Prompt D5), totals with one-line definitions, and for hosted events a capacity fill bar ("28 of 40 approved") plus request-to-approval rate. An **Audience** card shows the aggregated city and focus mix of people who saved or registered — only when at least 10 distinct people are in the range, so no individual can be identified.

**Behaviour and states.** Every metric has a definition line ("A view is a detail open; repeat opens by the same person count once per day"). New items show "Numbers appear after your first day live". Creators never see per-user lists, names or phone numbers. Admins keep their existing, broader analytics.

**Data and files.** `itemAnalytics` in `src/lib/mobile-store.ts` is admin-only today; add a creator-scoped path that checks `createdBy = user.id` on the server before aggregating, rather than loosening the admin check. Reuse existing `trackMobile` events; add a `seller_opened` event at the seller-link tap if it is not already recorded. Aggregation stays in SQL (as the production-readiness audit requires), with the same 90-day retention.

**Acceptance.** Creator A requesting analytics for creator B's item gets 403; the audience card is hidden below the threshold; creator totals equal the admin's item analytics for the same item and range.

## Prompt C7 · P1 · Public creator profile and share

**Goal.** Each creator has a credible public page showing what they have published, linked from every card they made, so members can judge who is behind a pick or event.

**What to build.** A mobile route `/creator/[handle]` showing avatar or initials, name, handle, bio, Instagram link (fields that already exist on users), a verified mark when the admin has recorded verification (Prompt E4), published picks with their endorsement disclosures, and upcoming and past hosted events. Add "Hosted by" and "Backed by" chips on event and pick cards that open this page. Share uses the Prompt A4 pattern. The legacy web page `src/app/creators/[handle]/page.tsx` currently shows old routine components; leave it unchanged in this prompt and note it for a later web pass.

**Behaviour and states.** Only published items appear. A suspended or demoted creator's page shows "This profile is unavailable" and their cards drop the chip. No follower counts until following exists (brief B19). A creator with nothing published shows a short "New on BetterHabits" state rather than an empty page.

**Data and files.** A public read endpoint by handle returning only public profile fields and published items `createdBy` that user (reuse `getCreatorAccount` in `src/lib/store.ts`); new route under `mobile/app/`; chips in pick and event card components; types in `shared/mobile.ts`. The payload must never include phone numbers, role internals or drafts.

**Acceptance.** The profile lists only published items; a suspended creator returns the unavailable state; the deep link opens the profile after sign-in; a payload snapshot test confirms no private fields.

## Prompt C8 · P1 · Guest management upgrades

**Goal.** Hosting 40 people is manageable on a phone: find, approve and check in guests quickly without leaving the app.

**What to build.** In the host view of `mobile/src/EventRegistrationPanel.tsx`: a segmented control (Pending / Approved / Declined, plus Waitlist once brief B17 exists), name search, multi-select with bulk Approve / Decline and an optional reason that the guest sees in their inbox (Prompt A2), a capacity meter, and **Export approved list** through the share sheet as CSV text containing name and request time only. Add **Check-in mode**: a full-screen, search-first list with large tap targets to mark guests as attended on the day.

**Behaviour and states.** A bulk approval that would exceed capacity approves in request order up to capacity and explains how many were left pending. Check-in is available from two hours before start until the end of the event day. Attendance is private to the host and admins. Check-in requires a connection unless Prompt A9 has been implemented and attendance is added to its safe-to-queue list.

**Data and files.** Bulk actions in `src/lib/event-registration-store.ts`, executed in one transaction using the existing event-row lock; an `attendedAt` field on registrations (migration); state machine changes in `shared/event-registration.ts`; host-only authorisation on every new action (`createdBy === user.id` or admin).

**Acceptance.** Concurrent bulk approvals never exceed capacity (reuse the existing last-seat race test pattern); the exported CSV contains no phone numbers or user IDs; a non-host calling any of these actions gets 403.

## Prompt C9 · P1 · Announcements to guests

**Goal.** Hosts can tell approved guests about changes inside the app instead of relying on WhatsApp groups.

**What to build.** A "Message guests" action in the host panel: type chips (Venue change, Time change, Reminder, General), a message of up to 300 characters, and an audience choice (approved guests, optionally also pending). Sending creates an inbox item for each recipient (Prompt A2) and a push where enabled (Prompt A3). The event shows a list of sent announcements with time and recipient count. Choosing Venue change or Time change prompts the host to also edit the event field, so the event page and the message agree.

**Behaviour and states.** Limit of 3 announcements per event per day, refused with a clear reason. Messages may contain no links other than the event's own registration or source link. Declined guests receive nothing. Guests can report a message using the Prompt A7 pattern, and admins can see all announcements for moderation.

**Data and files.** `event_announcements` storage (event, author, type, body, created time, recipient count); fan-out creates notifications idempotently; validation in `src/lib/event-validation.ts`; UI in the host panel.

**Acceptance.** Sending creates exactly one inbox item per approved guest; the fourth message in a day is refused; a message containing an unrelated link is rejected by the server.

---

# Part D — Design system

Run D2–D5 early: most UI prompts reuse their tokens, components and helpers.

## Prompt D1 · P0 · Brand mark, app icon and splash

**Goal.** BetterHabits is recognisable on a home screen and in the stores, with one mark used consistently in the app.

**What to build.** A simple mark derived from the wordmark's lime full stop ("BetterHabits."), for example a rounded dot containing a small check-step glyph, with no text inside the icon. Deliver an SVG master plus: iOS icon (1024 × 1024, no transparency), Android adaptive icon (foreground within the 66% safe zone, solid background), Android monochrome/themed icon, Android notification small icon (white silhouette), and splash artwork for light and dark appearance. Wire them in `mobile/app.json` (`icon`, `android.adaptiveIcon`, splash settings). Update the in-app top bar to show the mark beside the wordmark. Write clear-space and minimum-size rules (legible at 29 pt) into `mobile/DESIGN_SYSTEM.md`.

**Behaviour and states.** The icon must read on both light and dark wallpapers. If splash configuration in this Expo SDK requires the `expo-splash-screen` config plugin and it is not installed, that is a dependency change — stop and ask.

**Data and files.** New assets under `mobile/assets/`; `mobile/app.json`; top bar in `mobile/App.tsx` (or its extracted shell, Prompt UI1). Verify read-only with `npx expo config`; do not prebuild or rebuild.

**Acceptance.** All required icon sizes exist with correct transparency rules; `npx expo config` shows the icon and adaptive-icon paths; the top bar mark has an accessibility label of "BetterHabits".

## Prompt D2 · P0 · Light theme and system appearance

**Goal.** The app follows the device's light or dark setting, as `mobile/DESIGN_SYSTEM.md` and the README already promise.

**What to build.** `useTheme()` in `mobile/src/design/theme.ts` currently hard-codes `scheme='dark'`. Make it read `useColorScheme()` combined with the user's preference from Settings (Prompt A8: System / Light / Dark) and return the matching palette (the light palette already exists). Set `userInterfaceStyle` to `"automatic"` in `mobile/app.json`. Make the StatusBar style in `mobile/app/_layout.tsx` follow the active scheme. Hide `NeonBackdrop` in light mode (it is designed for dark surfaces) unless a light variant is designed. Find and replace hard-coded colours in `mobile/src/` (search for `#` hex values and `rgba(`) with tokens, documenting any intentional exception such as illustration artwork.

**Behaviour and states.** Changing the OS appearance updates the app live, without restart. Store the user's appearance preference on the profile (server-side) to avoid a new storage dependency. Check every text/background token pair for WCAG AA contrast (4.5:1 for body text, 3:1 for large text and icons) in both palettes and adjust tokens that fail.

**Data and files.** `theme.ts`, `mobile/app/_layout.tsx`, `mobile/app.json`, `NeonBackdrop.tsx`, profile preference field and its update action, Settings row.

**Acceptance.** Toggling OS appearance switches all five main tabs correctly; a search finds no unexplained hard-coded colours outside `theme.ts`; the contrast table in the design doc shows every pair passing.

## Prompt D3 · P0 · Component state library

**Goal.** Every screen uses the same small set of primitives, so loading, empty, error and status look and behave identically everywhere.

**What to build.** Add to `mobile/src/design/`: `Skeleton` (line, block and card shapes), `Toast` (success / error / info, optional Undo, queued, auto-dismiss after 4 seconds, announced to screen readers), `Banner` (offline, demo mode, info; persistent, dismissible per type where appropriate), `EmptyState` (illustration slot, title, one sentence, one CTA), `SearchBar`, `FilterChips` (single and multi-select), `SegmentedControl` (native where Expo UI offers one), `StickyActionBar` (bottom, safe-area aware, one primary and one optional secondary action), `StatusPill` (Draft, In review, Live, Needs changes, Pending, Approved, Declined, Cancelled), `WeekStrip` (Prompt B2), `ProgressRing`, `Avatar` (image or initials), `Stepper` (wizard progress) and `ReasonLine` (Prompt B7). Also fix `Field` in `components.shared.tsx`: accept explicit `maxLength`, `keyboardType` and `multiline` props and remove the behaviour that branches on label text.

**Behaviour and states.** Every interactive primitive supports default, pressed, disabled, loading and error states. Icon-only primitives require an accessibility label in their TypeScript props. Follow the existing `components.ios.tsx` / `components.tsx` split where a native control exists on one platform.

**Data and files.** New files in `mobile/src/design/`, exported from `components.tsx`; colours from Prompt D4; motion from Prompt D7; one usage line per component in `mobile/DESIGN_SYSTEM.md`.

**Acceptance.** Typecheck fails if an icon-only button omits its label; every primitive appears in the catalogue screen (Prompt D9) in every state; existing forms keep working after the `Field` change, with limits now matching the server.

## Prompt D4 · P0 · Colour semantics and typography roles

**Goal.** Status and hierarchy are readable at a glance, without relying on text colour alone.

**What to build.** Extend the palettes in `theme.ts` with `success`, `warning` and `info` (alongside the existing `danger`), each with an on-colour foreground, plus a status map (Draft → muted, In review → warning, Live/Approved → success, Needs changes/Declined → danger, Info → info) for both themes. Rename or remove `lavender` if it has no clear role. Add typography roles: `display` (onboarding and milestone moments), `headline`, `label` (chips and pills, semibold), and a `numeric` style with tabular figures (`fontVariant: ['tabular-nums']`) for prices, counts and countdowns. In `mobile/src/design/Text.tsx`, set a default `maxFontSizeMultiplier` (around 1.6) with tighter caps for `display`. Reconcile the card radius (20 in code, 16 in the design doc) and update the doc.

**Behaviour and states.** Status is always carried by text or an icon as well as colour. Prices and counts do not shift width as numbers change.

**Data and files.** `theme.ts`, `Text.tsx`, `StatusPill` (Prompt D3), `mobile/DESIGN_SYSTEM.md`.

**Acceptance.** Every new colour pair passes WCAG AA in both themes; the five main screens do not clip or overlap at the largest accessibility text size; no component defines its own status colours.

## Prompt D5 · P1 · Data visualisation and shared formatting helpers

**Goal.** Every price, date, time and chart in the app looks and reads the same, with Indian conventions built in once.

**What to build.** A `shared/format.ts` module: `formatInr(amount)` with Indian digit grouping (₹1,23,456); `formatEventTime(startsAt, endsAt?, dateOnly?)`, always in IST with an "IST" suffix; `habitDay(date, timeZone)` returning the day key used for completions; `weekKey(date, timeZone)` with Monday as the first day; and `checkedAgo(checkedAt)` ("checked 3 days ago"). Replace ad-hoc `toLocaleString` calls and hand-built `₹` strings in `mobile/src/` and `mobile/App.tsx` with these helpers. Add small chart components using the installed `react-native-svg`: `BarChart`, `LineChart` and `Sparkline`, with token colours, minimal gridlines, value labels and a text alternative for screen readers.

**Behaviour and states.** A missing price renders "Price unknown" and a null entry fee renders "Fee not confirmed" — never ₹0 or "Free". Charts with no data render an `EmptyState`, not an empty axis.

**Data and files.** `shared/format.ts` with tests in `tests/`; chart components in `mobile/src/design/`; call sites in pick, event, You and analytics components.

**Acceptance.** Tests cover lakh grouping, UTC-to-IST across midnight, date-only events and `habitDay` in two time zones; a search finds no remaining direct `toLocaleString` for money or dates in mobile code; VoiceOver reads chart values as a list.

## Prompt D6 · P1 · Iconography and illustration system

**Goal.** One consistent visual language for icons and artwork, replacing ad-hoc glyphs.

**What to build.** An icon map at `mobile/src/design/icons.ts` from semantic names (focus areas, pick categories, event topics, statuses, and actions such as share, report, save, calendar and inbox) to an SF Symbol name and a Material symbol name. Render with the installed `expo-symbols` on iOS. On Android, first check what can render Material symbols in content without a new package; if nothing can, use code-drawn SVG fallbacks and say so. Remove text glyphs used as icons (for example the `←` fallback in the top bar). Extend the code-drawn style of `FocusIllustration` and `FlowIllustration` to empty states (no flows, no saves, no events, empty inbox, offline, error), onboarding and milestones, with light and dark variants from tokens.

**Behaviour and states.** Decorative illustrations are hidden from screen readers; icons that carry meaning have labels.

**Data and files.** `icons.ts`, an `Icon` component in `mobile/src/design/`, new illustration components beside `FocusIllustration.tsx`.

**Acceptance.** No emoji or arrow characters used as icons remain (add a simple test that scans UI strings); every icon-only button has an accessibility label; illustrations render correctly in both themes.

## Prompt D7 · P1 · Motion language

**Goal.** Motion is calm, consistent and always optional.

**What to build.** Motion tokens at `mobile/src/design/motion.ts`: durations of 150, 250 and 400 ms; ease-out for entering, ease-in for leaving; one spring configuration for toggles. Implement with the installed `react-native-reanimated`: the check-off fill and checkmark (Prompt B1), save-bookmark fill, toast slide-in, skeleton shimmer, `WeekStrip` day fill and story progress bars.

**Behaviour and states.** When the system "reduce motion" setting is on, replace movement with a simple opacity change or no animation. Nothing loops except the skeleton shimmer, which also stops under reduced motion. Haptics are handled separately in Prompt UI11.

**Data and files.** `motion.ts`, the primitives from Prompt D3, `StoryViewer.tsx`, the Today rows.

**Acceptance.** No hard-coded animation durations remain in components (search for numeric `duration:` values); reduced motion removes all movement; the check-off animation stays smooth on a mid-range Android phone (manual check, recorded in the change summary).

## Prompt D8 · P1 · Surfaces, elevation, spacing and layout

**Goal.** Screens feel ordered and consistent in both themes.

**What to build.** Surface tokens (`bg`, `card`, `raised` for sheets and popovers, `scrim` for overlays) with rules per theme: dark uses `line` borders, light uses a subtle shadow. Layout tokens: screen padding 16, section spacing 24 and 32, card padding 16, list-row minimum height 56, maximum content width 640. Usage rule for `NeonBackdrop`: Home and onboarding only, never behind forms, lists or long text. Apply these to the main screens as they are touched by UI prompts, not as one large rewrite.

**Behaviour and states.** Phones only — tablets are disabled in `app.json` (`supportsTablet: false`); state that in the doc.

**Data and files.** `theme.ts`, `NeonBackdrop.tsx` usage sites, `mobile/DESIGN_SYSTEM.md`.

**Acceptance.** Refactored screens use layout tokens rather than literal padding numbers; `NeonBackdrop` is rendered only on the allowed screens.

## Prompt D9 · P1 · Design-system governance and catalogue screen

**Goal.** `mobile/DESIGN_SYSTEM.md` becomes an accurate source of truth that matches the code.

**What to build.** Update the doc: the typeface (the doc says system font, but the code loads Inter through `FontReadyContext` in `Text.tsx` — keep Inter as recommended in suggestions-v3 unless you decide otherwise, and keep the licence in `font-license.ts`), the radius, the appearance claim (after Prompt D2), token tables, a component inventory with states, do/don't examples and copy tokens (CTA verbs such as "Add flow", "Save pick", "Request a spot"; status words; plain, guilt-free error tone). Add a design catalogue screen (`mobile/app/design-catalogue.tsx`) rendering every primitive in every state and both themes, reachable only in development builds or by an admin in demo mode.

**Behaviour and states.** The catalogue must not be reachable by members or creators in production builds.

**Data and files.** `mobile/DESIGN_SYSTEM.md`, the new route, a guard using `__DEV__` and the session role.

**Acceptance.** Every component in `mobile/src/design/` is documented; the catalogue route is unreachable for non-admins outside development; a spot check of ten doc claims against the code finds no drift.

---

# Part E — Admin features

E1 depends on the moderation-loop fixes in suggestions.md (rejection reason, creator edit and withdraw). Do those first.

## Prompt E1 · P0 · Review queue as the admin home

**Goal.** Admins clear pending creator submissions quickly and consistently, and every decision carries a reason the creator can act on.

**What to build.** Admin opens on a Review screen listing pending submissions (products, events, and event series grouped per Prompt C5), oldest first, each with an age badge: under 24 hours neutral, 24–48 hours warning, over 48 hours danger (the 48-hour target comes from suggestions-v2 metrics). Filters: kind, submitter, search. Each card shows title, kind, submitter name with history ("3 published, 1 rejected"), submitted time, the pre-submit checklist results (Prompt C3), automatic flags (Prompt E3), image (Prompt C4) and an Open source action. Actions: **Approve**, or **Reject** with a required reason — reason chips ("Source not authoritative", "Disclosure missing", "Price or fee unverified", "Duplicate", "Other") plus up to 300 characters of explanation. Multi-select allows bulk approve; bulk reject requires one shared reason.

**Behaviour and states.** The admin list currently remaps creator `pending` to `draft`; keep `pending` as its own status. Each decision writes an audit entry with the reason and creates an inbox item for the creator (Prompt A2). If two admins act on the same item, the second gets a 409 ("Already decided by {name}") using the existing optimistic version check. Empty queue: "Nothing waiting. Oldest decision today took {time}."

**Data and files.** Extend `reviewItem` in `src/lib/mobile-store.ts` with `reason` and `reasonCode`, required by the server when rejecting or archiving. Extend `src/app/api/mobile/admin/route.ts` with `status=pending`, `sort=oldest` and `createdBy` filters, and paginate in the database for this list instead of filtering an in-memory 5,000-row snapshot. Add a `reason` column to the content audit (migration). UI in the Review route from Prompt UI10.

**Acceptance.** Rejecting without a reason returns 400; the creator sees the reason in Studio; two simultaneous approvals produce one success and one 409; queue counts match the database.

## Prompt E2 · P0 · Stale sources and user reports worklist

**Goal.** The trust metadata the app already stores (check dates, sources) becomes a daily operating process, together with member reports.

**What to build.** A Trust worklist with two tabs. **Stale:** published picks whose `checkedAt` is older than a threshold (default 30 days) and events whose source check is older than 14 days, plus events whose date has passed but which are still published. **Reports:** member reports from Prompt A7, grouped per item with counts and reasons. Row actions: Open source; **Re-verify** (confirms the item is unchanged and sets `checkedAt` to now, recording the admin as verifier); Edit (opens the content editor focused on price or date); Archive with reason; **Resolve report** with an outcome (Fixed / No issue found / Archived), which sends the reporter an inbox item.

**Behaviour and states.** Re-verify is enabled only after the admin has tapped Open source for that item in the session, to discourage blind date bumps. The Admin tab shows the worklist count as a badge (Prompt UI1). Empty state: "All sources checked in the last 30 days."

**Data and files.** Database queries by `checkedAt` (add an expression index if needed), the reports table from Prompt A7 with a status column, audit entries for re-verify and resolve, thresholds read from remote config (Prompt E7).

**Acceptance.** An item past the threshold appears; re-verifying updates its date and removes it from the list; resolving a report notifies the reporter exactly once; an event whose date has passed is listed automatically.

## Prompt E3 · P1 · Duplicate and link-health detection

**Goal.** Common problems are flagged automatically before a human reviews the item.

**What to build.** On every submission, compute flags on the server: duplicate source URL or duplicate normalised title within the same kind; affiliate links that use a URL shortener (for example `amzn.to`, `fkrt.it`, `bit.ly`) flagged "Short link — verify destination"; missing price or unconfirmed fee; event date in the past or more than 12 months away. Optionally run a link check: a request with a 3-second timeout, following at most 3 redirects, recording the final host and status code.

**Behaviour and states.** Flags never block submission; they appear as badges on Review cards (Prompt E1). A link check that times out is recorded as "Unchecked", never as a failure. The link checker must guard against server-side request forgery: only public HTTPS hosts, never private, loopback or link-local IP ranges, and re-check the resolved address after each redirect.

**Data and files.** A flag computation module in `src/lib/` with unit tests, including the request-forgery guard; flags stored on the submission record; badges in the Review UI.

**Acceptance.** Submitting a duplicate URL shows the flag; a URL resolving to a private IP is never fetched (test); a timeout does not fail or slow the submission noticeably.

## Prompt E4 · P1 · Trust and safety console

**Goal.** Admins can handle problems with people — reports, suspensions, creator verification — with a complete and reasoned record.

**What to build.** A People detail screen: profile fields, role, account status, verification status, a history of every role, suspension and verification change (actor name, before and after, reason), reports against the person or their content, and a submissions summary. Actions, each with a confirmation and a required reason: change role; suspend or unsuspend (suspension deletes all of the person's sessions, per suggestions.md section 0); **verify creator** using a short checklist (identity confirmed, public profile matches, contact confirmed), recording `verifiedAt`, `verifiedBy` and notes; revoke verification.

**Behaviour and states.** Keep the existing protections (an admin cannot demote or suspend themselves; the last active admin cannot be removed). Reasons are visible only to admins. A suspended person sees "Your account is suspended" with a contact route the next time they open the app, instead of a generic error.

**Data and files.** A people-audit table (migration); verification fields on users; the person-update path in `src/lib/store.ts`; `src/app/api/mobile/admin/route.ts`; People UI in the admin routes (Prompt UI10).

**Acceptance.** Every role, suspension and verification change creates an audit row with a reason; a suspended person's sessions are deleted immediately; the verified mark appears on the public profile (Prompt C7) and disappears when revoked.

## Prompt E5 · P1 · Content calendar and scheduled publishing

**Goal.** Admins can plan content ahead, and ended events stop lingering in the app.

**What to build.** Optional "Publish at" and "Unpublish at" fields on content items, collections (Prompt B9) and events. A Calendar view lists scheduled changes by week. A "Still published after ending" list offers one-tap archive with reason.

**Behaviour and states.** Evaluate visibility at read time (published, and publish time empty or in the past, and unpublish time empty or in the future), so correctness never depends on a scheduled job; use the existing `npm run db:maintenance` job only for cleanup. All times are entered and displayed in IST. Scheduled changes and the actual transitions are recorded in the audit.

**Data and files.** Schedule fields in `shared/admin-content.ts` and the catalogue record (migration); visibility filter in the member read paths of `src/lib/mobile-store.ts`; calendar UI in the admin Content route.

**Acceptance.** An item scheduled for tomorrow is absent from member payloads today and present after the time passes; ended events appear in the archive list; every displayed time says IST.

## Prompt E6 · P1 · Catalogue health dashboard

**Goal.** Admins can answer "what should we curate next?" from one screen.

**What to build.** A Coverage section in admin analytics: a matrix of focus areas against content types (flows; picks connected through `pickContext` use cases; events by topic in the next 30 days) with gaps highlighted, plus lists of flow steps whose `pickContext` use case has no published picks, picks without an image, events without a source or check date, and collections with fewer than two live items. Each row opens the relevant editor.

**Behaviour and states.** Admin-only; aggregate counts computed on the server with bounded queries.

**Data and files.** An admin endpoint in `src/app/api/mobile/admin/route.ts` backed by a coverage helper; UI in the Analytics route.

**Acceptance.** Archiving the last published pick for a use case makes that gap appear; counts match a fixture test.

## Prompt E7 · P1 · Feature flags and remote configuration

**Goal.** Admins can turn product surfaces on or off without an app release — for example, parking credit-card research as suggestions-v2 recommends.

**What to build.** A single versioned `config` content document in the existing admin CMS with typed flags and settings: card research enabled (per role), electronics as a top-level category, Ask BetterHabits enabled, collections enabled, stale-source threshold, review target hours, default quiet hours. Bootstrap returns only the resolved flags for the user's role. The mobile app hides disabled features, and the server also enforces them (a disabled feature's endpoint returns 404).

**Behaviour and states.** Unknown or missing flags default to off. Changes take effect on the next refresh. Changes are audited through the existing content history.

**Data and files.** A typed flag schema with defaults in `shared/`; the content kind in `shared/admin-content.ts` and `src/lib/admin-content-store.ts`; bootstrap in `src/lib/mobile-store.ts`; reads from the session in mobile.

**Acceptance.** Turning off card research removes it from member navigation and its endpoint returns 404; flags are type-checked; the change appears in content history.

## Prompt E8 · P1 · Funnel analytics

**Goal.** Admins can see where members, creators and events drop off.

**What to build.** Three funnels with a shared 7 / 30 / 90-day selector. **Activation:** signed in → chose a focus → added a flow → first completion within 24 hours. **Creator:** submitted → decided → published, or rejected → resubmitted. **Events:** detail opened → interest saved → registration tapped (external) or requested (hosted) → approved → attended (Prompt C8). Each step shows distinct people, conversion and a definition.

**Behaviour and states.** Aggregates only, never a per-person drill-down.

**Data and files.** SQL aggregation over `trackMobile` events with an index on action and time. Add any missing events (for example `focus_selected`, `flow_added`, `listing_submitted`, `registration_requested`, `attended`), listing which were added in the change summary.

**Acceptance.** Fixture data produces the expected counts at every step; the response contains no identities; the query stays within the existing SQL timeout.

## Prompt E9 · P1 · Cohort and retention view

**Goal.** Admins can tell whether people come back.

**What to build.** A grid of weekly sign-up cohorts against weeks 0–8, where "active" means any completion or app open in that week (stated on screen); headline day-7 and day-28 retention; a split by focus area.

**Behaviour and states.** Weeks are computed in IST, starting Monday. Cohorts with fewer than 20 people show "—" so individuals cannot be identified.

**Data and files.** SQL aggregation, optionally cached daily by the maintenance job; UI in the Analytics route with charts from Prompt D5.

**Acceptance.** A fixture cohort is computed correctly across a week boundary in IST; small cohorts are suppressed.

---

# Part UI — Screens and UX patterns

UI1 and UI2 come first, because every other screen prompt assumes the shared shell and feedback primitives. Do the v1 file split (suggestions.md section 5) before UI1.

## Prompt UI1 · P0 · App shell: tab state, root lists, top bar and tabs

**Goal.** Switching tabs never loses what the user was doing, long lists scroll smoothly, and every screen has the same predictable frame.

**What to build.** Each tab route in `mobile/app/(tabs)/` currently mounts its own `BetterHabitsScreen` from `mobile/App.tsx`, so selection and open sheets reset on every tab switch. Move selection and sheet state into a shared context (or the tabs layout) so each tab renders only its own pane. Make each tab's root scroller a `FlatList` or `SectionList` with sticky section headers, replacing the single `ScrollView`; keep horizontal shelves as horizontal lists with fixed item sizes, never nested vertical lists. Top bar: brand mark and wordmark (Prompt D1), search (Prompt A1), inbox bell with unread badge (Prompt A2), avatar opening You. Tabs: make **You** visible for every role (currently `hidden`), keep Studio for creators, show **Admin** for admins (the trigger is currently always `hidden` and admins rely on `mobile/app/management.tsx`). Tab badges: Studio shows the needs-attention count (Prompt C1); Admin shows review plus trust worklist counts (Prompts E1, E2). Pull-to-refresh on every root list with an "Updated 9:42" caption.

**Behaviour and states.** Switching tabs preserves scroll position and any open sheet. A deep link opens the correct tab with the item's sheet. Primary actions sit in bottom bars or sheets, within thumb reach.

**Data and files.** The extracted screen modules from the v1 split, `mobile/app/(tabs)/_layout.tsx`, `mobile/src/session.tsx` (separate session data from UI state so UI changes do not re-render everything).

**Acceptance.** Open a pick, switch to Events and back: the pick is still open; a 300-item list scrolls without visible stutter in a development build; You is visible for members; badge counts match the server.

## Prompt UI2 · P0 · Feedback system: toasts, inline errors, skeletons, empty and error states

**Goal.** Every action and every screen tells the user what is happening and what to do next.

**What to build.** Replace `Alert.alert` used for errors with inline field errors (forms) or a `Toast` (actions); keep alerts only for destructive confirmations. Show skeletons on the first load of each tab and detail. Make save, complete and join-flow optimistic, with rollback and a toast on failure. Give every list an `EmptyState` with this copy, adjusted as needed:

- Home with no flows: "Add your first flow."
- Picks with no results: "Nothing under ₹{budget} here — try a higher budget or another category."
- Saved picks: "Save picks to compare them later."
- Events: "No events this week in {city}."
- Inbox: "Nothing here yet."
- Studio: "Share your first pick or host an event."
- Admin review: "Nothing waiting."

Errors: a bootstrap failure shows a full-screen state with Retry; other failures show an inline banner with Retry; server errors (5xx) show "Reference: {request ID}" from the `X-Request-Id` response header.

**Behaviour and states.** Also fix in `mobile/src/api.ts` and `session.tsx` (suggestions.md section 1): parse responses defensively so an HTML 502 does not surface as a JSON error; expose the request ID; on 401 clear the session data and show one "Session expired, please sign in again" message.

**Data and files.** Primitives from Prompt D3; `api.ts`; `session.tsx`; every screen's list.

**Acceptance.** A search finds no `Alert.alert` used for non-destructive errors; every list has an empty state; launching in airplane mode shows an offline or error state, never a blank screen; a forced 500 shows the reference ID.

## Prompt UI3 · P0 · Sign-in and focus-first onboarding

**Goal.** A new person gets from opening the app to their first flow in under 60 seconds.

**What to build.** **Sign-in** (`mobile/src/PhoneSignIn.tsx`): a phone field with a fixed +91 prefix, number pad and inline validation; a 6-box code entry with auto-advance, paste support and SMS autofill (`textContentType="oneTimeCode"` on iOS, `autoComplete="sms-otp"` on Android); a resend countdown that respects the server cooldown; errors shown under the code. Keep the mock SMS card in demo mode only. **Onboarding** (`mobile/app/onboarding.tsx`), matching `docs/focus-onboarding.md`: one question ("What would you like to focus on?"), seven focus cards in a two-column grid using `FocusIllustration` → a starter-flow preview (steps, time needed, sources, the shared health note from Prompt UI7) → "Try this flow" → an optional city step (Hyderabad preselected, with "Choose later") → Today. Progress dots and Back are available throughout. Three short value cards before phone entry are optional within this prompt.

**Behaviour and states.** Returning users never see onboarding again. The rail-based explorer (`FlowTopicBrowser.tsx`) stays as the Flows tab browser, not the onboarding path. If you change the documented journey instead of matching it, update `docs/focus-onboarding.md` in the same change.

**Data and files.** `PhoneSignIn.tsx`, `onboarding.tsx`, `shared/focus.ts`; analytics events `focus_selected` and `flow_added`.

**Acceptance.** After entering the code, a new user reaches Today with a flow in four taps; the docs and the UI describe the same journey; both analytics events are recorded.

## Prompt UI4 · P0 · Home layout and flow screens

**Goal.** Home is about today, and flow screens are places to act, not only to read.

**What to build.** **Home**, top to bottom: greeting and date ("Good morning, Asha · Sat 18 Oct"); the Today card (Prompt B1) with a compact `WeekStrip` (Prompt B2); a next-event strip when a relevant event is within 14 days (from joined flows' `eventContext` and the user's registrations); one connected pick from a joined flow's `pickContext`, with its reason line and disclosure; Continue and Collections (Prompt B9); Stories below the fold. **Stories** (`mobile/src/StoryViewer.tsx`): stop autoplay (the current `setInterval` contradicts `docs/home-feed.md`), advance on tap left or right, pause on hold. **Flow details:** header with illustration, title, level, rhythm and "3 steps · about 10 min"; steps as toggle rows ("Done today"), with connected picks under the step they belong to; next-event module; weekly reflection entry (Prompt B4); reminder row (Prompt A6); sources collapsed at the bottom with check dates; a sticky bottom bar with "Add flow" when not joined, Share (Prompt A4), and Remove in an overflow menu when joined. **Flow cards:** level, step count, time, today's progress ("2 of 3 done today") and a reason line. **Flows tab:** keep the rails and add level and time filter chips plus search.

**Behaviour and states.** Rename the Home "Options" control, which currently only removes a flow, to "Remove from Home", or make it open a real action sheet.

**Data and files.** `HomeFeed.tsx`, `StoryViewer.tsx`, `FlowDetails.tsx`, `FlowPreview.tsx`, `BrowseShelf.tsx`, `FlowTopicBrowser.tsx`.

**Acceptance.** Stories never advance without a tap; flow-detail steps can be completed; the sticky bar sits above the home indicator; flow cards show today's progress.

## Prompt UI5 · P0 · Picks screens: filters, cards, compare tray and quick decide

**Goal.** Picks helps people decide, within budget and honestly, instead of just listing products.

**What to build.** A sticky filter bar with category chips, a tier segmented control, budget chips (₹500 / ₹1,000 / ₹2,500 / Any) plus a custom slider, a result count, and sort (Price low to high, Recently checked). **Pick card:** image or category illustration, title, price via `formatInr` with "checked {time ago}", tier pill, a disclosure icon when the pick has affiliate links, an optimistic save toggle and a reason line. **Compare tray:** a Compare checkbox on up to three cards pins a bottom tray ("Compare 2") that opens the existing `PickDecisionComparison`. **Quick decide** (`mobile/src/SwipeDeck.tsx`): explicit Save / Skip / Details buttons below the card (gestures optional), progress ("3 of 8"), an end summary ("You saved 2 — view saved"), and respect for the active filters. Add the screen-level disclosure footer from Prompt UI7. Hide card research when its flag is off (Prompt E7).

**Behaviour and states.** Items above the chosen budget never appear. The deck is fully usable with a screen reader through the buttons alone.

**Data and files.** `PicksBrowser.tsx`, `SwipeDeck.tsx`, `PickDetails.tsx`, `PickDecisionComparison.tsx`, `SavedPicks.tsx`, `shared/mobile.ts` (`budgetProducts`).

**Acceptance.** The filter bar stays visible while scrolling; no over-budget item is ever shown; the compare tray caps at three; VoiceOver can complete the deck.

## Prompt UI6 · P0 · Events screens

**Goal.** Members can scan, judge and register for events quickly, with fees and times never misrepresented.

**What to build.** **Event card:** a date block (day and month), title, IST time via `formatEventTime`, area, fee state ("Free" only when the fee is confirmed as zero, otherwise "₹499" or "Fee not confirmed"), the existing registration-status pill, spots left for hosted events, a save-interest toggle and a reason line. **List:** grouped This week / This month / Later with sticky headers; the city selector saves to the profile. **Event details:** a hero (topic illustration or image); a facts block (date and time in IST, venue with Open in Maps from Prompt B11, fee, organiser chips from Prompt C7); description; the richer fields from Prompt C5; the registration timeline (Prompt B10); and a sticky call to action — "Register on {provider}" through the interstitial in Prompt UI7, "Request a spot", or "Cancel request" — plus Add to calendar (Prompt A5), Share (Prompt A4) and Report (Prompt A7). `EventDiscovery.tsx` is never mounted: either fold its useful parts into the Events tab or delete it, and record the decision.

**Behaviour and states.** Grouping uses IST day boundaries. External and hosted registration modes show different calls to action.

**Data and files.** `HyderabadEvents.tsx`, `EventPreview.tsx`, `EventRegistrationPanel.tsx`, `EventHosts.tsx`, `shared/event-presentation.ts`, `shared/hyderabad-tech.ts`.

**Acceptance.** No event with an unknown fee ever shows "Free"; the call to action matches the registration mode; an event at 11:30 PM IST groups into the correct day.

## Prompt UI7 · P0 · Trust patterns: disclosure, leaving the app, health note

**Goal.** The product's trust rules are visible at the exact moments they matter, in one consistent form.

**What to build.** Three shared patterns. (1) **Commercial disclosure footer** on Picks and on any shelf containing affiliate picks: "Some links may earn BetterHabits a commission. Prices are seller snapshots; check dates are shown." (2) **Leaving-the-app interstitial** before any seller or external registration link opens: destination host; for picks, the price and check date; for events, "Registration happens on {provider}"; the affiliate line when applicable; "Continue to {host}" and "Cancel". A per-host "Don't show again" is allowed only for non-affiliate links. (3) **Health note:** one shared non-clinical disclaimer component, shown at focus selection (Prompt UI3), in fitness, nutrition and sleep flow details, and in the supplement and workout guides. It replaces the general wording repeated across `MagnesiumGuide`, `SupplementDiscovery`, `WorkoutJourney` and `GymSupportGuide`, while keeping each guide's specific safety notes.

**Behaviour and states.** All copy lives in one place in `shared/`. Every outbound open records `outbound_opened` with the host and whether the link is an affiliate link.

**Data and files.** Extend `mobile/src/Disclosure.tsx`; route `SellerLinks.tsx` and the `openLink` helper in `mobile/App.tsx` (or its extracted module) through the interstitial.

**Acceptance.** Every caller of `Linking.openURL` or `openLink` goes through the interstitial (verify with a search); the affiliate disclosure is visible before navigation; the general disclaimer text exists in exactly one place.

## Prompt UI8 · P0 · You (profile) screen

**Goal.** You is a clear personal home, not a block of statistics text.

**What to build.** Sections: header (avatar, name, handle, city, focus with a Change action); Progress (`WeekStrip` per flow and the insights card from Prompt B5); My flows (reorder, remove with confirmation, reminder status); Saved picks with freshness badges (Prompt B8); My events (upcoming registrations with a status summary, saved interests, past events); Reflections (Prompt B4); Settings (Prompt A8); Help and feedback; and a demo-mode indicator when active. Creators see a Studio row with the needs-attention count; admins see an Admin row.

**Behaviour and states.** Every section has an empty state. Removing a flow updates Today immediately. Every row has an accessibility role and label, including the event-registration rows flagged in suggestions.md.

**Data and files.** The You section extracted from `mobile/App.tsx`, `mobile/app/profile.tsx`, primitives from Prompt D3.

**Acceptance.** Each section renders its empty state for a new user; removing a flow asks for confirmation and updates Today; an accessibility scan finds no unlabelled rows.

## Prompt UI9 · P0 · Creator forms: stepped product wizard and form behaviour

**Goal.** Submitting a product is as guided as creating an event, and form errors are caught where they happen.

**What to build.** Turn the single product sheet into a wizard sharing one shell with the event wizard: **Basics** (title, category, subcategory, tier, use case, summary) → **Price and sellers** (price, pack label, up to five purchase options with URL keyboards and live affiliate detection) → **Proof** (source link; disclosure, required when affiliate signals are present; safety note; image from Prompt C4) → **Review** (checklist and member preview from Prompt C3). The shell provides a `Stepper`, a `StickyActionBar` (Back / Next / Submit), the autosave indicator (Prompt C2), inline errors on blur and on Next, character counters matching server limits, keyboard avoidance that scrolls the focused field into view, and moving to the next field from the return key.

**Behaviour and states.** Server validation errors map back to the matching field and step. The wizard works at the largest text size.

**Data and files.** `ProductFields.tsx`, `PurchaseFields.tsx`, `EventLinkFields.tsx`, a new wizard shell component, `Field` changes from Prompt D3, `src/lib/product-validation.ts` as the single source of limits.

**Acceptance.** No alert is used for validation errors; a field cannot exceed its limit and shows a counter; a server-side error highlights the right field.

## Prompt UI10 · P0 · Admin workspace split into routes

**Goal.** Admin work happens on focused screens instead of one dense scrolling page.

**What to build.** Replace the single scroll in `mobile/src/AdminWorkspace.tsx` with nested admin routes: **Review** (Prompt E1, the default), **Trust** (Prompt E2), **Content** (filterable list, editor, history, scheduling from Prompt E5), **People** (paginated list and the detail screen from Prompt E4), **Analytics** (overview with a shared date selector, item analytics, funnels, cohorts and coverage from Prompts E6, E8 and E9) and **Settings** (creator allowances, remote config from Prompt E7, and Simulation in demo mode only). Editors get a sticky save bar showing version and unsaved state, collapsed advanced fields, confirmation before removing nested items in `ContentFields.tsx`, a keep-or-replace choice when restoring a revision over an existing draft, and conflict recovery on 409 (refetch, then "Reload latest" or "Keep mine as a new draft"). Role and suspension saves always confirm. Allowance saves confirm when setting zero and show a success toast (`CreatorEventSettings.tsx`).

**Behaviour and states.** Every admin section is reachable within two taps of the Admin tab (Prompt UI1). Non-admins never see the tab, and the API refuses them regardless.

**Data and files.** New route files for the admin section under `mobile/app/`, split from `AdminWorkspace.tsx`, `ContentFields.tsx`, `CreatorEventSettings.tsx` and `mobile/app/management.tsx`.

**Acceptance.** A 409 recovers without reopening the editor; every destructive action asks for confirmation; a member calling any admin endpoint gets 403.

## Prompt UI11 · P1 · Micro-interactions and haptics [needs dependency for haptics]

**Goal.** Key moments feel responsive and satisfying, without becoming noisy.

**What to build.** Apply the motion tokens from Prompt D7 to check-off, save, toast, sheet content, pull-to-refresh and a single (non-looping) pulse when a tab badge count increases. With approval for `expo-haptics`: a light impact on complete and save, a selection tick on chip changes, a success pattern when opening an approval in the inbox, and no haptics on errors. Add a Haptics toggle in Settings (on by default). Without dependency approval, ship the motion part only.

**Behaviour and states.** Reduced motion is respected everywhere; haptics follow only the Settings toggle.

**Data and files.** Components touched by Prompts B1, D3 and UI1; Settings (Prompt A8).

**Acceptance.** Haptics fire only for the listed events and stop when the toggle is off; reduced motion removes movement.

## Prompt UI12 · P0 · Accessibility pass

**Goal.** Every core task can be completed with VoiceOver or TalkBack at the largest text size.

**What to build.** Audit every screen for: minimum touch targets (44 pt on iOS, 48 dp on Android); `accessibilityRole` and `accessibilityLabel` on every pressable and icon button (top bar, toggles, chips, event-registration rows); `accessibilityState` for checked toggles and selected chips; cards grouped as single accessible elements with summary labels; logical focus order in sheets; toasts announced; story controls labelled and stories paused for screen readers (already implemented — keep it); Dynamic Type caps from Prompt D4; contrast from Prompts D2 and D4; reduced motion from Prompt D7; form fields with real labels rather than placeholder-only labels, and errors announced. Add a static scan script (no new dependency) that flags `Pressable` or touchable elements in `mobile/src/` and `mobile/app/` without a role and label.

**Behaviour and states.** Record a manual VoiceOver and TalkBack checklist of ten tasks: sign in, choose a focus, complete a step, save a pick, compare picks, register for an event, submit a product, approve a guest, approve a submission, and delete the account.

**Data and files.** All screens; a script under `scripts/` that can run in CI.

**Acceptance.** The scan reports zero unlabelled pressables; the ten-task checklist passes and is recorded in the change summary.

## Prompt UI13 · P1 · Perceived performance

**Goal.** The app feels instant on a mid-range Android phone over Indian mobile networks.

**What to build.** Cache-first paint (with Prompt A9), or at least keep the last payload in memory across tab switches; image placeholders (category illustrations) with fixed aspect ratios and fade-in, so nothing shifts when images load; memoised list rows with stable keys and fixed row heights where possible; split session data from UI state so unrelated changes do not re-render whole screens; a slimmer bootstrap (card research moved to a lazy endpoint, per suggestions.md section 4, and omitted when its flag is off). Measure cold start to Today and the member bootstrap payload size, against the suggestions-v2 targets of under 2 seconds and under 150 KB.

**Behaviour and states.** No visual change beyond placeholders; this is a performance prompt.

**Data and files.** List components, `session.tsx`, `src/lib/mobile-store.ts` bootstrap, a small measurement script under `scripts/`.

**Acceptance.** A member fixture's bootstrap payload is under 150 KB; images load without layout shift; the measured cold-start time is recorded in the change summary.

---

# Part P2 — Short briefs (validate before building)

These are deliberately brief. Before turning one into a full prompt, confirm demand with the metrics in suggestions-v2 section 7.

- **A10 · Home-screen widget [needs dependency and development build].** Today's 1–3 steps with check-off from the home screen, using the same completion action and time-zone rules as Prompt B1. Platform-specific native work; build only if day-7 retention shows people forget to open the app.
- **A11 · Invite a friend to a flow or event.** A share link (Prompt A4) that, after sign-up, adds the same flow or opens the same event for the friend. Generalise the existing hosted-event invite pattern; no rewards or referral payments.
- **A12 · Multi-language scaffolding.** Move UI strings into a catalogue now (cheap, no new dependency if you write a small helper), translate later — Hindi first — when expanding beyond English-speaking Hyderabad. Keep health and disclosure copy reviewed per language.
- **B12 · Gentle milestones.** Calm one-time moments: first flow finished, four weeks of activity, first event attended. No streaks, leaderboards or loss framing. Uses the history from Prompt B2 and the illustration system from Prompt D6.
- **B13 · Flow variants and lighter weeks.** Beginner and regular versions of popular flows, a "make it lighter this week" toggle that shows fewer steps, and a suggested next flow on completion using the existing `relatedFlowIds`.
- **B14 · Ask BetterHabits in the app.** Bring the legacy `/api/rugram` recommendation idea into a new mobile endpoint: goal text in, only central-library flow and pick IDs out, a constrained response schema, the deterministic fallback kept, and the shared rate limiter (suggestions.md section 4). Never free-form health advice. Gate behind a flag (Prompt E7).
- **B15 · Smart next action.** Rule-based, explainable suggestions written in `shared/` with tests: if nothing is done by evening, suggest the shortest step; if a related event is within 14 days, surface it. No machine learning in this version.
- **B16 · Post-event feedback.** After an attended event, a one-tap "How was it?" with an optional note, feeding host profiles (Prompt C7) and admin curation. Aggregates only shown publicly, and only above a minimum count.
- **B17 · Waitlist for hosted events.** Join a waitlist when full; automatic promotion in request order when a place frees up, with an inbox item and a time limit to accept. Extend the registration state machine and keep the row-lock guarantees.
- **B18 · Flow buddies.** Opt-in: see that a chosen friend joined the same flow, with no activity feed and no comparison. Requires a friend-connection model and privacy review.
- **B19 · Follow creators.** Follow from the creator profile (Prompt C7); a "From creators you follow" shelf on Home. Follower counts shown only above a threshold.
- **C10 · Flow proposals by creators.** Creators propose flows assembled only from central-library steps (never free-text health claims), reviewed in the admin queue like other submissions. Reuses the personal flow builder (Prompt B6) and the original routine-library model.
- **C11 · Price and source refresh submissions.** Creators submit an update to a live pick's price or source ("price changed"), entering the review queue as an update rather than a new listing; approval updates `checkedAt`.
- **C12 · Follower updates.** When a followed creator publishes, followers get an inbox item, limited to a daily digest. Depends on B19 and Prompt A2.
- **D10 · Brand voice guide.** Expand the copy tokens from Prompt D9 into a short guide for creators and admins: tone, banned phrases (guarantees, "clinically proven", streak guilt), how to write disclosures and reasons.
- **E10 · Moderation playbooks.** Saved reject-reason templates with editable text, so feedback stays consistent and takes two taps in Prompt E1.
- **E11 · CSV import with validation preview.** Manual, reviewed import of events or picks: upload, row-by-row validation preview, import as drafts. No scraping, per product rules.
- **E12 · Admin alerting.** Threshold alerts in the admin inbox: review queue older than 48 hours, stale sources above zero, error-rate or latency spikes from the telemetry in suggestions.md section 4.
- **UI14 · Delight moments.** Subtle focus-illustration animation on selection, milestone cards, seasonal Hyderabad collections (for example monsoon running) delivered through collections rather than code changes.

---

# Prompt index and run order

**60 full prompts** (A1–A9, B1–B11, C1–C9, D1–D9, E1–E9, UI1–UI13) and **19 P2 briefs**.

## Stage 0 — From suggestions.md, before anything in this file

These have no prompt here; implement them directly from the audit items, one per chat.

- suggestions.md section 0: phone identity schema, explicit demo mode, transactional migrations, account deletion and export, session revocation on suspend.
- suggestions.md section 5: format and split `mobile/App.tsx` and `src/lib/mobile-store.ts` (no behaviour change).
- suggestions.md sections 2 and 3, moderation loop: rejection reason stored and shown, creator withdraw, creator edit of own pending items.

## Stage 1 — Foundations

D2 → D4 → D3 → D5 → UI1 → UI2

## Stage 2 — The hero loop (user)

B1 → B7 → UI3 → UI7 → UI4 → B2 → UI5 → UI6 → UI8 → A1 → A4 → A7 → UI12

## Stage 3 — Inbox, creator flywheel and admin trust

A2 → B10 → E1 → C1 → C2 → C6 → UI9 → UI10 → E2 → D1

## Stage 4 — Fast follow

A8, A9, A3, A6, A5, B3, B4, B5, B6, B8, B9, B11, C3, C4, C5, C7, C8, C9, E3, E4, E5, E6, E7, E8, E9, D6, D7, D8, D9, UI11, UI13

Run E7 early in this stage if you decide to park credit-card research.

## Stage 5 — P2 briefs

Only after the hero release, and only those the metrics justify.

## Dependencies

- **Needs a dependency approved first:** A3, A5 (unless the `.ics` route is used), A6 (shares A3's package), A9, C4, UI11 (haptics part only), A10.
- **A3** needs A2. **A6** needs A3's package. **A8** uses D2 and the account endpoints from suggestions.md section 0.
- **B2** needs B1. **B5** needs B2. **B4** can use A6 for its reminder. **B8** uses UI7. **B10** needs A2 and can use A5.
- **C1** needs the Stage 0 moderation loop; its live statistics come from C6. **C3** pairs with C4. **C5** relies on E1 for grouped review. **C7** shows the verified mark from E4. **C8** and **C9** need A2.
- **D3** uses D4 for colours and D7 for motion (D7 can follow later).
- **E1** needs the Stage 0 moderation loop. **E2** needs A7. **E4** builds on the people audit and session revocation from suggestions.md. **E7** should precede parking card research.
- **UI1** needs the Stage 0 file split. **UI2** needs D3. **UI3** uses UI7's health note. **UI4** needs B1 and B2. **UI5** uses UI7 and D5. **UI6** uses D5 and B10. **UI10** needs E1. **UI11** needs D7.