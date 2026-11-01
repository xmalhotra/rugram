# Hyderabad tech shortlist

The native Events tab defaults to Hyderabad, India, and Tech; admins can change
the enabled scope in App settings. It is a
selected shortlist, not every event on the internet. Ordinary users cannot create events. Creators submit source-linked entries for
admin review, with a default allowance of two per India calendar month. Admins
configure per-creator allowances, verify details and publish entries. Existing HYROX
references remain inside their related flows, and legacy RSVPs remain cancellable.

## User journey

Open an event for schedule in IST, venue, published price / ticket conditions,
registration window, intended audience, expected benefits, sources and source
check time. Unknown price is not free. An unpublished deadline is unknown, not
the start time. Editorial priority (1–5 with a reason) is subjective shortlist
relevance, not an attendee rating or promised outcome.

Save an event as interested, filter saved events, or find them in You. Saves
are private to the account, idempotent, and do not claim registration or approval.
External registration opens the provider without a BetterHabits token. Free
in-app approval events additionally support pending/approved/declined/cancelled
registrations and approval-gated attendee names. See `admin-workspace.md` for
the creation, approval, privacy, cancellation and simulation journey.
Cancelled, ended, sold-out and closed-registration listings cannot use that CTA;
waitlists open the provider waitlist. Saved records can still be removed after
archiving. Admins can update changed terms or cancel/archive a listing.

## Administration and data

`event-link` accepts admin and creator submissions. Admin submissions publish;
creator submissions stay pending and require admin source review and an editorial
priority before publication. Creator input cannot set ratings, ownership or status.
`event-update` remains admin-only and
edits an existing Hyderabad tech listing while preserving its ID and moderation
status. Required metadata includes source URLs, checked timestamp, audience,
benefits and an explained editorial priority. A source-check hold prevents
publishing the conflicting HydPy seed until an admin verifies and saves its
editor. A saved edit is a human assertion of review, not automated verification.

Creator allowances use `profile.creatorMonthlyEventLimit` (default 2; 0 disables,
maximum 100). Admins set this via `creator-event-limit` using a creator username.
Studio shows used/remaining slots and the reset time. All submission statuses count,
including rejected/archived listings; edits and retries do not consume new slots.
The period is based on server submission time, not event date or client timestamps.
PostgreSQL serializes creation using a creator profile row lock and checks counts
in the next READ COMMITTED statement; demo mode rechecks before synchronous insert.
The allowance is independent of product submission permissions.

Catalog metadata and `profile.savedEventIds` use existing JSONB storage. No
schema changes are needed for those JSONB fields. Migration 010 adds an index for
creator/month quota queries; apply it with `npm run db:migrate` before deployment.
`npm run db:seed-flow-resources`
inserts absent research IDs without overwriting existing moderation decisions.
Database deployments must run it; local demo mode imports absent IDs.

Analytics distinguish `event_saved`, `event_unsaved`, `event_updated` and
`event_link_opened`; none measure actual attendance or completed registration.
The shortlist deduplicates canonical registration URLs after removing tracking
parameters. It cannot yet detect different URLs for the same real-world event.

## Research snapshot: 15 October 2026

- Published: DevFest Hyderabad 2026, 24 October, JRC Convention. Official site
  lists 08:30–18:00 IST, student ₹1,199 and professional ₹1,499. No verified
  registration-closing deadline is supplied. Confirm final checkout charges,
  availability and non-refundable/non-transferable terms with the organiser:
  https://devfest.gdghyd.in/
- Pending: HydPy October meetup listing, 31 October. The Meetup search listing
  has conflicting September registration wording and unverified price/agenda.
  It is not a public recommendation until reviewed:
  https://www.meetup.com/hydpygroup/events/316972226/
  and https://luma.com/3qnxpuua

## Not implemented

No automatic scraper, live cross-site import, provider API connection, registration
callback, reminders or attendee reviews exist. This is manually reviewed curation.
Before automated ingestion, obtain appropriate provider access/permission, review
terms/rate limits, deduplicate provider IDs and handle reschedules, cancellation,
freshness and source conflicts. Do not bypass sign-in or access controls. Importing
a WhatsApp group's private content requires separate authorization and access.

Unit tests, in-memory simulations and iOS bundling do not establish production
database readiness or substitute for testing on an iPhone.

The quota was separately tested against isolated local PostgreSQL: 20 concurrent
unique requests created exactly two pending events; 20 accepted-request retries
created none; rejection retained usage; admin allowance changes, disabling and
verified approval passed. `npm run test:creator-quota-db` requires a disposable
cluster using `quota_test` at `127.0.0.1:55433`, `RUGRAM_DEMO_MODE=false` and its
local `DATABASE_URL`. Never point fixture scripts at the app or production database.
