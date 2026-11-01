# Hosted and external events

External listings open the provider's registration page. Qram does not claim to know their guest list, purchases, cancellations, or live ticket availability.

Hosted events are free, approval-based registrations managed inside Qram. Hosts choose a capacity, organizer, venue, start/end, deadline, category, and audience. Events must start within the next calendar year.

## Roles

| Role | Actions |
| --- | --- |
| User | Request a place, see pending/approved/declined status, cancel before the event starts, see guest names only after approval |
| Creator | Submit within the admin-configured monthly quota; manage their published event's requests; approve/decline; close/reopen registration; cancel the event |
| Admin | Review/edit/publish submissions, manage all hosted registrations, change quotas and catalogue content |

Creators cannot publish themselves or manage another creator's event. Pending requests do not reserve seats. Approval checks capacity; cancellation releases a confirmed seat and removes guest-list access. Cancelled events cannot reopen; create a replacement. Capacity cannot drop below the confirmed count, and events with registration records cannot become external listings.

The Admin Events workspace links directly to editing/publication and registration management. The creator's Studio contains their submissions and guest controls.

## Try locally

In demo mode, the catalogue includes **DEMO · Hosted tech meetup**, with 100 places. It is not a real gathering or venue booking. It belongs to the sample creator; no attendee names/counts are fabricated. Demo data is in-memory and resets on server restart.

- `npm run test:hosted-events`: isolated creator submission, admin publication, 102 mock users, 101 concurrent approval attempts against 100 places, privacy, cancellation, role enforcement and lifecycle checks.
- `npm run test:demo-journey`: broader cross-role journey.
- `npm run test:admin-content`: CMS editing/publication checks.

## Deployment boundary

Apply migrations through **013_hosted_event_guards.sql** before deploying against PostgreSQL. Capacity approval uses a transaction locking the event row; the new trigger protects edits against existing registrations. The local concurrency simulation tests the in-memory implementation, not PostgreSQL under production load. Database concurrency and migration execution still require a configured test database.

No payment collection/refunds, automatic waitlist promotion, check-in, or attendee email/SMS notifications are implemented. Lifecycle changes are visible when the app refreshes; hosts must communicate changes separately. Do not market these missing features as available.
