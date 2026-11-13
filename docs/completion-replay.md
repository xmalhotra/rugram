# Date-safe completion replay

The approved additive API contract accepts `completionDay` (`YYYY-MM-DD`) and
`requestId` on completion actions. Old clients without these fields still work.
New mobile completions stamp the original device day/timezone and a unique ID;
Undo creates a new request ID rather than reusing the completed request's ID.

Dates must be real calendar days between today and 27 days ago in the supplied
valid timezone. Future/impossible/expired days are rejected. The client optimistic
helper uses that same original day, including when rendering a rollback.

Migration 019 adds a per-account receipt and transactional completion function.
The profile row lock serialises requests. The same ID/body is a no-op even after
a later opposite action; reusing an ID for another body is rejected. Profile
update, receipt and analytics commit together. Joining the flow and having a
currently available canonical step are still required. Receipts are deleted on
account deletion and after 90 days by the maintenance job; the 28-day replay
window prevents an expired receipt from enabling old completion replay.

Local Postgres tests cover five concurrent retries, original-day persistence,
one analytics row, a delayed retry after undo, changed-body conflicts, date
bounds, removed-flow rejection and erasure. This is a server foundation, not a
claim that the app's durable offline queue or airplane-mode launch exists yet.
