# Safe schema changes

`npm run db:migrate` executes each complete SQL file on one PostgreSQL connection,
with a transaction covering the DDL and its schema_migrations entry. An advisory
transaction lock serialises concurrent runners. Errors roll back the entire file.
PL/pgSQL function bodies are not split at semicolons. Migration execution uses
the existing `pg` driver, including for Neon; the environment needs PostgreSQL
TCP access. Runtime application queries may still use Neon HTTP.

For destructive changes, use expand/contract:

1. Add nullable columns/tables without deleting old fields.
2. Deploy code that reads old and new data safely; backfill in bounded batches.
3. Verify counts, constraints, rollback compatibility and backups in staging.
4. Switch writes and reads, observe, then remove old fields in a later migration
   only after old app versions no longer need them. Obtain explicit approval
   before applying a destructive migration to real data.

Do not edit an applied migration. Add another file. Operations that cannot run
inside a transaction, such as CREATE INDEX CONCURRENTLY, need a separately
reviewed operational procedure; do not silently bypass the transaction wrapper.

`node scripts/test-migrations.mjs` verifies rollback, function-body execution and
concurrent application using disposable objects in betterhabits_local only.

Migration 021 creates its indexes inside the transaction (not CONCURRENTLY). This is fine
at current catalogue sizes; schedule a maintenance window before applying it to a large table.
