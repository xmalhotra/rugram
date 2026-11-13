# Creator submission lifecycle

Creators can edit or withdraw only their own pending product/event submissions.
Published and archived records cannot be changed through this endpoint. The server
validates input again, never accepts identity/owner/publication fields from it,
removes verified recommendation flags and prevents creator-authored shortlist ranks.
Event edits retain the original submission timestamp and monthly quota key.

Withdrawal archives the item with `withdrawnAt` and **does not return the monthly
event slot**. Studio explains this before confirmation. Database migration 016
prevents withdrawn submissions being published through any write path, including
the admin CMS. A new submission is required if the creator wants to try again.

Rejection/archive requires a reason code and a 5–500 character note. The decision
is recorded in content audit data and attached to the listing so the creator can
read the feedback in Studio. This is in-app feedback on refresh, not push or SMS.
The global inbox and notifications remain later v4 work.

`scripts/test-moderation.ts` checks these rules against disposable local Postgres
fixtures. Current automatic checks are not a substitute for native device UX QA.
