# Build prompts

One prompt per step of `docs/vision.md`, section 4. Each is written to be handed to a coding model
(Cursor Grok, Opus, or Claude) as it stands. Run them in number order, one at a time. A later prompt
assumes the earlier ones are done and checked on a phone.

How to run one with Cursor:

```bash
cursor-agent -p --model grok-4.7-high --force "Read docs/build-prompts/README.md, then docs/build-prompts/01-rest-from-effort.md, and do exactly what it says."
```

| Prompt | Step | Kind | Suggested model |
|---|---|---|---|
| `01-rest-from-effort.md` | Rest that follows the set just done | Pure logic, tests | Grok high |
| `02-set-rows.md` | Workout screen: edit in place, one row at a time | Screen | Strongest available; review on phone |
| `03-body-flow-picture.md` | Body flow as a picture, details behind a panel | Screen | Strongest available |
| `04-predicted-body-flow.md` | Predicted Body flow from a plan | Pure logic, tests, one component | Grok high |
| `05-daily-flow.md` | Routine becomes Daily flow; one day | Rename, merge, screen | Grok high, then review |
| `06-items-that-matter.md` | Items say what they help; Picks link | Data, logic, screen | Grok high |
| `07-map-flow-data.md` | Map flow storage and API | Migration, store, tests | Grok high |
| `08-map-flow-home.md` | Home → Yours: figure, Today, Map flow shelf | Screen | Strongest available |
| `09-first-run.md` | First questions end on a Map flow | Screen | Grok high |
| `10-follow-a-flow.md` | Follow someone's flow, time-boxed | Logic, store, sheet | Grok high |
| `11-share-attachment.md` | Posts with a flow attached | Store, API, screen | Grok high |

## Rules for every prompt

Read these before any task. A prompt can add to them but not remove them.

**Read first**

- `AGENTS.md` (this is not the Next.js you know; read the guide in `node_modules/next/dist/docs/` before
  touching route handlers).
- `docs/vision.md` and `docs/journey-framework.md`. The names in the app are exactly: Flow, Custom flow,
  Daily flow, Map flow, Body flow, Picks. Do not invent others.
- The files the prompt lists, in full, before changing them.

**How the code is laid out**

- `shared/` is pure logic used by both the app and the server. No React, no database, no network there.
  The app uses zod 3 and the server zod 4, so use only what both have (`z.string().uuid()`, never `z.uuid()`).
  `tests/shared-zod-compat.test.ts` guards this.
- `mobile/` is the Expo app. `src/` is the Next.js API. `db/migrations/` continues from `047`.
- Demo mode (`QRAM_DEMO_MODE=true`) keeps data in memory. Every store needs both the demo path and the
  Postgres path.
- There is no "week" in the model of a Map flow. A Map flow is a pattern of Daily flows of any length.
- Rules are data, not code: anything a non-engineer would want to add later (a purpose, an item, a style,
  a ready Map flow, a sharing threshold) lives in a data file with a schema, and is addable without touching logic.

**Product rules that never bend**

- A value the member set themselves is never overridden (Default ← Personalised ← Custom).
- Every screen that takes input follows ask → confirm → result → next, and every suggestion shows its reason.
- Use the shared parts in `mobile/src/design` (`Sheet`, `EmptyState`, `FilterChips`, `StickyActionBar`,
  `ReasonLine`, `Stepper`, `Toast`, `Chip`, `Card`, tokens). Add a part there if one is missing; do not
  hand-draw a one-off.
- Button words mean one thing (`journey-framework.md`, section 6). "Start" only ever begins a workout.
- Nothing may sit under the tab bar or the workout pill (`mobile/src/RunPip.tsx`).
- Weights, body weight and logs are private and never appear in anything shared.
- Any health claim needs a source that is linked in the data. No paid licences. Do not copy other sites' content.
- Plain words. Say "chest is missed this week", not "volume deficit".

**Do not**

- Commit, push, or switch branch.
- Restart or stop the dev servers.
- Touch `.loop-work/`, `.env.local`, or files the prompt does not need.
- Use a founder account for API tests; use demo mode.

**Checks, all must pass before you report**

```bash
QRAM_DEMO_MODE=true AUTH_SECRET=x APP_URL=http://localhost:3000 npm test
npx tsc --noEmit -p .
(cd mobile && npx tsc --noEmit)
npm run lint
npm run lint:mobile
npm run test:mobile-accessibility
```

`lint:mobile` has 9 old warnings; add none. New logic in `shared/` and every new store gets tests in `tests/`.

**Report**

Write `.loop-work/<prompt-number>-report.md` with: files changed, what each check printed, anything you
were unsure about, and what could not be verified (screens cannot be opened here; say so plainly).
Update the feature doc the prompt names, so the docs match the code.
