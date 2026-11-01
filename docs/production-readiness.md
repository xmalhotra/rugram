# BetterHabits production readiness

Verdict: the API is significantly hardened and passes local simulations. The application is **not yet approved for a public production launch**. Local results do not establish cloud capacity, mobile UI performance, or 10,000 simultaneous users.

The admin CMS / complete-journey update has separate evidence: 71 unit tests,
actual route-handler authorization checks, a populated live local demo, the
10,000-profile in-memory simulation, iOS bundling and isolated PostgreSQL tests
for private drafts, revision conflicts, content projection, story read-state,
account suspension and concurrent guest approval/cancellation/privacy. These
are not production hosting or physical-device certification. Apply migrations
011/012 for persistent deployment. See `admin-workspace.md`.

The Hyderabad tech shortlist update was checked with unit tests, the isolated
10,000-profile function simulation, live local demo API calls and an iOS bundle.
Its new event metadata, saved-interest SQL and admin editing paths have not yet
been exercised against the production database or on a physical iPhone. Earlier
database benchmark results below do not certify those new paths. See
`event-discovery.md` for source limitations and admin-only curation.

Authentication update: password sign-in is removed. Phone OTP currently uses a
development-only SMS simulator and is blocked in production/database mode.
MSG91 and verified-phone database identity still need implementation; see
`phone-auth.md`. Historical reports below predate this auth change. The database
load runner now provisions isolated sessions directly and cannot certify OTP
delivery or login load. These tests do not establish production authentication
readiness.

## What was actually exercised

- `reports/mobile-simulation.json`: 10,000 synthetic profiles, 70,000 calls to the actual business functions, 100 actors in flight. Checks cover isolation, repeated writes, authorization, moderation visibility, pagination, analytics counts, and last-seat races. This is an isolated in-memory function simulation, not an HTTP benchmark.
- `reports/mobile-database-load.json`: a production Next.js build on port 3100 against a real isolated PostgreSQL 15 database. The database contains 10,000 user accounts and 600 product fixtures. Every account joins a flow and reloads its persisted profile over HTTP. The runner also ramps 10/25/50/100 concurrent clients and measures p50/p95/p99, status codes, throughput and errors, then runs a 30-second paced stability check.
- `reports/mobile-resilience.json`: an actual database stop/restart while the API stays running. The expected response during failure is 503 with a request ID and no internal database details. The same profile must be readable after recovery.
- Type checks, domain tests, lint, production backend compilation and an Android native bundle are separate checks. No iOS/Android physical-device UI automation has been performed.

HTTP scenario coverage includes expired/forged/revoked session rejection, role escalation, invalid IDs, missing desired-state flags, invalid time zones, oversized bodies, concurrent duplicate completion/save/submission requests, pending catalog isolation, admin publication, 100 users competing for 10 event places, repeated RSVP, archived event cancellation, catalog pagination, throttling, admin analytics, and logout revocation.

Final local measurements: 25,656 HTTP requests; all 10,000 accounts exercised; 100-client ramp p95 103 ms with zero unexpected errors. The 30-second paced check made 3,500 requests with p95 24 ms. The separate function simulation made 70,000 calls. These are local observations only.

The load account passwords use reduced-cost fixture hashes; the measured workload is mostly authenticated reads and idempotent writes. It is not a password-intensive login-storm test. Network latency is loopback. API, database, and generator share one computer. Synthetic sessions are created only in the isolated test cluster. These facts prevent interpreting the observed request rate as a hosting guarantee.

## Changes made during the audit

- Saves, flow membership, completion and RSVP requests set an explicit `enabled` state. Retrying the same intent does not undo it. Completion/save conversion events are recorded only for an actual state change.
- Creator/admin submissions use a stable request ID with a database uniqueness constraint. Repeated submissions create one listing.
- PostgreSQL transactions serialize seat allocation using an event-row lock; repeat RSVP is accepted without an extra seat. Database status/date are rechecked during allocation. Demo races check the live count rather than a stale snapshot.
- Catalog responses use keyset pagination (100 items per page) and city filtering, preserving saved products and joined events. Native screens can load subsequent pages.
- Admin analytics aggregate in SQL instead of transferring all raw activity records to the API process. Habit history is pruned to 90 days; saved arrays are bounded.
- Production mobile read/write/login throttles use an atomic shared PostgreSQL table. This applies across API instances. The process-local limiter remains only for demo/legacy flows.
- Mobile request bodies are capped at 16 KB. Unexpected database errors return a generic 503. Responses include a request ID and Server-Timing. Structured request logs (no credentials, goals, or request bodies) are on by default in preview, staging and production; set `API_TELEMETRY=false` to opt out or `true` to enable locally. Rate limits key on the client address taken `TRUSTED_PROXY_HOPS` entries from the right of `X-Forwarded-For` (default 1).
- An ordinary PostgreSQL driver is supported for repeatable integration tests and staging; Neon remains available. Connection pools and SQL query timeouts are bounded. Idle database connection errors have a listener so a database restart does not terminate the process.
- Backend dependencies were updated within compatible versions. The backend runtime audit has zero reported advisories at the time of this run.

## Security audit status

`npm audit --omit=dev` at the backend root: zero reported runtime advisories. The full root audit still reports five high findings in the lint tool dependency chain rooted in `braces`.

The mobile dependency tree still reports 22 findings (15 high, seven moderate), rooted in `braces`, `node-forge`, and `uuid`, propagated through Expo/Metro/Xcode tooling. A compatible audit fix was attempted. The automated alternative proposes downgrading Expo to SDK 44, which would break the current native app; that downgrade was not applied. These findings need upstream patches or a reviewed compatible remediation before release. Do not describe the overall project as security-cleared.

The 22-finding count above is the pre-redesign audit snapshot. Expo UI/native-navigation dependencies were added afterward; rerun the complete mobile audit for the current release candidate. Native iOS and Android bundling was checked after that integration, but device and security release gates remain outstanding.

## How to interpret “10,000 users”

Registered accounts, daily active users, and simultaneous clients are different loads. For planning only, 10,000 daily users × four sessions × 20 requests is 800,000 requests/day, about nine requests/second on average; a tenfold peak would be about 93 requests/second. This is an assumed workload, not a prediction. Creator publishing, event registration spikes, real login cost, image traffic and mobile connection retries require their own traffic profiles.

The current evidence exercises 10,000 distinct accounts with up to 100 concurrent clients. It does **not** exercise 10,000 simultaneous clients.

## Release gates still outstanding

1. Run the same workload against the intended hosting provider and managed database, with real network latency, production password cost, at least two API instances and the intended pool limits. Target p95 <1 second and unexpected error rate <1%; define stricter product targets as traffic is measured.
2. Run a 1–2 hour staging soak, sudden-event registration spikes, realistic login storms and deployment/restart tests. Verify no growing memory, connections, response sizes, or analytics backlog.
3. Test physical Android and iPhone devices: login expiry, background/resume, poor network, retry after a timeout, pagination, creator/admin forms, keyboard behavior, accessibility and older-device memory. Large native lists currently use ScrollView; virtualized-list performance is a release gate.
4. Resolve or review the outstanding mobile/toolchain advisories. Confirm creator identity and moderation policies; supplied endorsement links are not proof of celebrity verification. Populate verified product prices and source-backed creator data; current examples are labelled demo fixtures.
5. Configure HTTPS hosting, `BETTERHABITS_DEMO_MODE=false`, migrations 006/007, provisioned real accounts, backups and a tested restore. Schedule `npm run db:maintenance` in the hosting scheduler and forward structured logs to monitoring with error/latency/database alerts.
6. Finish account lifecycle flows needed for public users (registration/invitations, recovery, deletion/export), and an auditable admin operating process. Payments, external Meetup/Luma integrations and event checkout are not implemented.

## Reproducing the local checks

`npm run test:simulation` runs without a database in its own process. `npm run test:mobile-api` is a smoke test for a dedicated demo backend. Do not run fixture tests on shared production accounts.

For the real database test, initialize a disposable PostgreSQL cluster in a newly created `/private/tmp/betterhabits-postgres.*` directory, listening only on `127.0.0.1:55432`. With that local connection string set in `DATABASE_URL`, run `node scripts/prepare-load-database.mjs`. The loader deliberately resets only `load-*` fixtures and refuses other hosts/ports. Start a production build on port 3100 with `BETTERHABITS_DEMO_MODE=false`, the test database URL and a test-only `AUTH_SECRET`. Run `npm run test:load` with the same URL and secret. The resilience runner additionally requires `PG_TEST_CLUSTER` pointing to that exact disposable cluster. It deliberately stops and restarts that test database.

Raw reports contain counts and timings, not session tokens or production credentials. Local test database/API processes are stopped after the audit; the regular demo app can continue on ports 3000/8081.
