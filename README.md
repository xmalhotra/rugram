# Qram

## Native mobile app

For phone testing, run `npm run dev:mobile` (backend port 3001), then `npm run mobile`.
The app derives the computer's LAN host from Expo and uses port 3001 by default.
This avoids silently connecting to an unrelated project on the common port 3000.
`EXPO_PUBLIC_API_URL` overrides the full address; `EXPO_PUBLIC_API_PORT` overrides
only the local development port. Deployed builds still require an HTTPS API URL.

The current product is the React Native + Expo app in `mobile/`. Next.js now runs the API backend; the previous web homepage is archived in `legacy/web-page.tsx`.

The app has habit flows, budget-filtered product picks, and an admin-curated Hyderabad tech events shortlist. Users can save event interest and register on the provider website; saves are not RSVPs. The three roles are user, creator and admin. Creators submit products and up to two events per India calendar month for review. Admins configure creator allowances, verify/publish events and see usage analytics. See [mobile setup and features](mobile/README.md).

The native [Admin workspace](docs/admin-workspace.md) now manages content,
categories, profiles/roles, creator limits, drafts/publication/history and
per-item/activity analytics without source-code or JSON editing. Free in-app
events support approval-gated private guest lists and cancellation; external
event registrations remain with the provider. Admin → Simulation creates and
tests the labelled end-to-end demo, including 12 events inside the next year.

Start the backend with `npm run dev`, then start the native app with `npm run mobile`. Use a physical phone to avoid emulators. Sign-in uses phone OTP. Mock SMS is available only in explicitly enabled local demo mode; it is not the database-backed authentication service. MSG91 and verified-phone database identities are implemented, but live delivery and provider configuration still require verification. See [phone authentication](docs/phone-auth.md). No production admin or celebrity endorsements are seeded.

The sections below describe the original routine API that remains available during the migration.

Production-readiness results and release gates are in [the audit report](docs/production-readiness.md). Run `npm run test:simulation` for the 10,000-profile isolated business simulation. `npm run test:load` requires the dedicated local database/API fixture environment described in that report. These checks are now included in CI; cloud/device certification remains outstanding.

Qram helps people build a routine from small, source-linked components. A creator can publish components from the shared library into a public week; a member can follow the creator, inspect the source, and add a separate scheduled copy to their own timeline.

This is deliberately not a prescription engine. Creator routines are context and inspiration, while evidence, safety notes, and the member's own schedule remain visible at every step.

## Product model

The production data model keeps three things separate:

- **Routine component** — the canonical, reviewable building block in the central library (for example, “Water on waking”). It has a category, source, evidence status, safety note, and publishing lifecycle.
- **Creator publication** — a creator's public placement of an approved component in their week. A creator cannot create an unreviewed health claim by typing directly into a public routine.
- **Timeline item** — a member's own scheduled copy of a component, with a local date, time, time zone, and optional attribution to the creator publication that inspired it.

Following a creator, liking a publication, and adding something to a timeline are separate actions. The server is the authority for all of them.

## Requirements

- Node.js 24.12.0 (`nvm use`; mobile uses Expo SDK 58 to match the user's updated iPhone Expo Go)
- Postgres for any non-demo environment; local Postgres is supported for development
- An environment file based on [`.env.example`](.env.example)

## Quick start: local demo

Demo mode is for product evaluation and UI work only. It must never be enabled on a public deployment.

```bash
npm ci
cp .env.example .env.local
```

Set these values in `.env.local`:

```dotenv
APP_ENV=local
QRAM_DEMO_MODE=true
APP_URL=http://localhost:3000
AUTH_SECRET=replace-with-a-local-random-value
```

Demo mode requires this explicit opt-in. The example file defaults to database
mode; a missing database URL never silently enables demo data or mock OTP.
Startup rejects demo mode in production and in declared preview/staging environments.

Then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The local demo identities exist only to exercise the member and creator journeys; they are not a real authentication system and must not be reused outside demo mode.

The original username/password login is retired. Use the mobile phone OTP flow described above. Legacy celebrity profile records are references, not phone-authentication accounts or verified endorsements.

## Database-backed local development

1. Set `DATABASE_URL` to a dedicated local Postgres database (current development database: `betterhabits_local`) or a hosted Postgres connection. Hosted connections should use the provider's required TLS settings; never disable TLS for a public database.
2. Set `QRAM_DEMO_MODE=false` and generate a strong `AUTH_SECRET`:

   ```bash
   openssl rand -base64 48
   ```

3. Point `APP_URL` at the local origin.
4. Apply the schema and load the curated local catalog:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

Use a dedicated development database. Do not point local seed or test commands at a production database.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes unless local demo is explicitly enabled | Postgres connection string, server-only. Use SSL and a pooled connection for application traffic. |
| `APP_ENV` | Set on non-Vercel deployments | `local`, `test`, `preview`, `staging` or `production`. Declare deployed environments explicitly; `local` cannot override `NODE_ENV=production`. |
| `AUTH_SECRET` | Yes | Long, random secret used to HMAC-protect server-side session identifiers. Never expose it with a `NEXT_PUBLIC_` prefix. |
| `APP_URL` | Yes | Canonical application origin, such as `https://app.example.com`. |
| `QRAM_DEMO_MODE` | Yes | `true` only for local evaluation; `false` for staging and production. `BETTERHABITS_DEMO_MODE` and `RUGRAM_DEMO_MODE` are still accepted as aliases; if more than one is set they must match. |
| `OPENAI_API_KEY` | Optional | Server-only key for model-guided Ask Qram recommendations. If omitted, Ask Qram uses the curated, profile-aware library fallback. |
| `OPENAI_QRAM_MODEL` | Optional | (aliases `OPENAI_BETTERHABITS_MODEL`, `OPENAI_RUGRAM_MODEL`) Overrides the model used by Ask Qram; defaults to `gpt-5-mini`. |

See [`.env.example`](.env.example) for safe placeholders. Do not commit `.env.local`, database URLs, session secrets, or monitoring tokens.

## Commands

```bash
# Code quality
npm run lint
npm run typecheck

# Database lifecycle
npm run db:migrate
npm run db:seed

# Verification
npm run test
npm run test:e2e
npm run build
npm run deploy:check

# Production server (after a successful build)
npm start
```

`db:migrate` is a forward-only schema deployment step. Run it independently in CI before switching production traffic, never automatically on application startup. `db:seed` is intended for local and staging data; production catalog updates should go through the reviewed publishing workflow.

`test:e2e` must run against an isolated test database and test origin. It must never run against a shared staging or production database.

## Deployment checklist

1. Create separate Neon databases or branches for preview, staging, and production. Enable backups and point-in-time recovery for production.
2. Add `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, and `QRAM_DEMO_MODE=false` in the hosting provider's encrypted environment settings.
3. Use a new, high-entropy `AUTH_SECRET` for every environment. Rotate it deliberately: rotation invalidates existing sessions.
4. In CI, run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and `npm run deploy:check`.
5. Run `npm run db:migrate` against the target database as a separate, logged release step. Review migrations and have a backup/rollback plan before applying them.
6. Deploy the built application with `QRAM_DEMO_MODE=false`.
7. Smoke-test sign-in, sign-out, member/creator authorization, public creator profiles, following, likes, adding/removing a timeline item, and source links.
8. Watch error reporting and database health after release.

## Production safeguards

- Passwords must be hashed server-side; sessions must use `HttpOnly`, `Secure`, and appropriate `SameSite` cookies.
- Every mutation must validate input and check authorization on the server. UI visibility is not authorization.
- Public routine claims need source URLs, a lifecycle state (`draft`, `review`, `published`, or `archived`), a reviewer, and a last-verified date.
- Respect image licences and creator consent. Link to Instagram profiles only; do not scrape Instagram or imply endorsement.
- Treat routine and fitness content as general information. Keep safety notes visible and avoid personalised medical, nutritional, or training claims.
- Ask Qram sends only the member goal plus routine-library and profile context to the model, never credentials. It uses a constrained response schema and accepts only central-library routine IDs; retain the deterministic fallback for availability.
- Add rate limits, audit logs for creator publishing and review actions, security headers, privacy/terms pages, and account deletion/export before a public launch.

## Architecture at a glance

```text
Browser
  └─ Next.js routes / server actions
       ├─ session and role checks
       ├─ validation and scheduling rules
       └─ Neon Postgres
            ├─ users and sessions
            ├─ canonical routine components + evidence
            ├─ creator publications + follows + likes
            └─ member timeline items
```

The database owns state; the client only renders it and requests authorised changes. This prevents demo data, passwords, follows, and personal timelines from leaking through browser state or disappearing on refresh.
