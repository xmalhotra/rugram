# Durable inbox

Migration 017 stores notifications per recipient, with a unique business-event key.
Postgres triggers create registration outcomes and catalogue review/change updates
inside the same transaction as the business change. A rollback cannot leave a
notification behind. Repeating an unchanged approval creates no duplicate.

The inbox API derives recipient identity from the authenticated session. It never
accepts a recipient ID from the client. Read-one updates include both item ID and
recipient ID; mark-all is scoped to the current user. Pages contain 50 items;
read items remain visible for 30 days. Maintenance removes expired read items.
Unread items are not silently discarded. Account export includes one's inbox;
account deletion cascades recipient records.

Implemented events: registration requested (to the organiser), approved/declined
(to the guest), event time/venue changes and cancellation (to pending/approved
guests), pending-submission queue updates (to admins), and publication/rejection
(to the creator, including the review reason). No email, SMS or push is sent.
`report_resolved` is reserved for the report worklist, which is not implemented yet.

Demo mode has equivalent in-memory notification storage and catalogue/registration
hooks. Foreground mobile polling refreshes every 15 seconds while focused and
active. Both user/creator and admin screens have the inbox bell. Event entries
open the registration panel; missing/archived items degrade to unavailable copy.
Full cold-start deep links and direct review-queue routing are still pending.

Verification: `npm run test:notifications` uses only disposable fixtures in
`betterhabits_local`. It checks recipient privacy, API identity protection,
idempotency, rejection reasons, cancellation, transaction rollback and retention.
Physical-device presentation and push delivery are not verified.
