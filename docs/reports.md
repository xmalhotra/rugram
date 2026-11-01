# Member reports (A7 and the reports part of E2)

Signed-in people can report published picks/events for a canonical reason with
an optional single-line 200-character note. The server derives reporter identity,
validates the target kind/publication and limits submissions. One report per
account and target prevents duplicate spam; repeat submissions return that report.
It does not hide, edit or archive the listing automatically.

Admin workspace → Trust lists open reports, grouped by item within loaded pages,
with pagination and the full open-report total. Creator roles cannot read this
worklist or reporter identity. Resolution is admin-only, compare-and-set, and
records an outcome. A database trigger adds an audit entry and one recipient-only
inbox item in the same transaction. “Archived” records an already-performed
moderation outcome; resolving by itself never archives a listing.

Reports are included only in their owner's account export. Account deletion
cascades report records; resolving-admin references are nulled on their deletion.
Demo mode provides the equivalent member/decision/inbox state in process memory,
not durable storage. Production-mode tests use isolated local Postgres fixtures.

E2 is not complete: stale-source thresholds/worklists, source-open gating before
re-verification, direct focused edits and the combined Trust badge remain pending.
No claim is made that the new report list performs those operations yet.
