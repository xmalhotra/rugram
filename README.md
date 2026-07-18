# Rugram

Rugram helps people build a routine from small, source-linked components. A creator can publish components from the shared library into a public week; a member can follow the creator, inspect the source, and add a separate scheduled copy to their own timeline.

This is deliberately not a prescription engine. Creator routines are context and inspiration, while evidence, safety notes, and the member's own schedule remain visible at every step.

## Product model

The production data model keeps three things separate:

- **Routine component** — the canonical, reviewable building block in the central library (for example, “Water on waking”). It has a category, source, evidence status, safety note, and publishing lifecycle.
- **Creator publication** — a creator's public placement of an approved component in their week. A creator cannot create an unreviewed health claim by typing directly into a public routine.
- **Timeline item** — a member's own scheduled copy of a component, with a local date, time, time zone, and optional attribution to the creator publication that inspired it.

Following a creator, liking a publication, and adding something to a timeline are separate actions. The server is the authority for all of them.

## Requirements

- Node.js 20.9 or newer
- A Neon Postgres database for any non-demo environment
- An environment file based on [`.env.example`](.env.example)

## Quick start: local demo

Demo mode is for product evaluation and UI work only. It must never be enabled on a public deployment.

```bash
npm ci
cp .env.example .env.local
```

Set these values in `.env.local`:

```dotenv
RUGRAM_DEMO_MODE=true
APP_URL=http://localhost:3000
AUTH_SECRET=replace-with-a-local-random-value
```

Then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The local demo identities exist only to exercise the member and creator journeys; they are not a real authentication system and must not be reused outside demo mode.

Local demo handles are `john`, `cristiano`, `messi`, and `bolt`; each uses the demo password `12345`.

## Database-backed local development

1. Create a Neon project and copy its pooled Postgres connection string into `DATABASE_URL`. Keep `sslmode=require` in the URL.
2. Set `RUGRAM_DEMO_MODE=false` and generate a strong `AUTH_SECRET`:

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
| `DATABASE_URL` | Yes when `RUGRAM_DEMO_MODE=false` | Neon Postgres connection string, server-only. Use SSL and a pooled connection for application traffic. |
| `AUTH_SECRET` | Yes | Long, random secret used to HMAC-protect server-side session identifiers. Never expose it with a `NEXT_PUBLIC_` prefix. |
| `APP_URL` | Yes | Canonical application origin, such as `https://app.example.com`. |
| `RUGRAM_DEMO_MODE` | Yes | `true` only for local evaluation; `false` for staging and production. |

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
2. Add `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, and `RUGRAM_DEMO_MODE=false` in the hosting provider's encrypted environment settings.
3. Use a new, high-entropy `AUTH_SECRET` for every environment. Rotate it deliberately: rotation invalidates existing sessions.
4. In CI, run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and `npm run deploy:check`.
5. Run `npm run db:migrate` against the target database as a separate, logged release step. Review migrations and have a backup/rollback plan before applying them.
6. Deploy the built application with `RUGRAM_DEMO_MODE=false`.
7. Smoke-test sign-in, sign-out, member/creator authorization, public creator profiles, following, likes, adding/removing a timeline item, and source links.
8. Watch error reporting and database health after release.

## Production safeguards

- Passwords must be hashed server-side; sessions must use `HttpOnly`, `Secure`, and appropriate `SameSite` cookies.
- Every mutation must validate input and check authorization on the server. UI visibility is not authorization.
- Public routine claims need source URLs, a lifecycle state (`draft`, `review`, `published`, or `archived`), a reviewer, and a last-verified date.
- Respect image licences and creator consent. Link to Instagram profiles only; do not scrape Instagram or imply endorsement.
- Treat routine and fitness content as general information. Keep safety notes visible and avoid personalised medical, nutritional, or training claims.
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
