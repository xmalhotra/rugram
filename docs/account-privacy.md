# Account export and deletion

Authenticated members and creators can export their own data from Profile → Your
data (`GET /api/mobile/account`) and share the JSON using the native share sheet.
Credentials, bearer tokens, password hashes and other attendees are not exported.
The endpoint accepts no target account ID and responds with `Cache-Control: no-store`.

Deleting requires a native destructive confirmation and `DELETE /api/mobile/account`
with `{ "confirm": "DELETE" }`. Profile data, sessions, saves, personal analytics,
RSVPs and registration requests are removed immediately. Creator-owned listings
and their registrations are removed too; the confirmation explains this. Hosts
must contact guests before deletion. No payment records exist in this app.
Administrators must transfer responsibility and be demoted before self-deletion;
the database repeats this guard under a row lock.

Submitted content revisions and actor-linked content audit entries are erased.
Public endorsements on other listings are removed. Backups are outside this API:
deployment operators must configure a finite backup expiry and prevent deleted
accounts being restored into the live service. Local development has no managed
backup schedule. This is implementation documentation, not a claim of legal compliance.

Routine maintenance deletes expired sessions and request buckets and analytics
older than 90 days. Phone challenges are purged after expiry. Deletion also clears
the account's current phone challenge immediately. No OTP values are stored in
Postgres, and provider keys remain server-only.
