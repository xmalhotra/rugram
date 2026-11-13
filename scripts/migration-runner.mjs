/** Execute whole SQL files: splitting on semicolons corrupts PL/pgSQL bodies. */
export async function applyPostgresMigration(pool, filename, source) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('betterhabits-schema-migrations'))");
    const existing=await client.query('SELECT filename FROM schema_migrations WHERE filename=$1',[filename]);
    if(existing.rows.length){await client.query('COMMIT');return false;}
    await client.query(source);
    await client.query('INSERT INTO schema_migrations(filename) VALUES($1)',[filename]);
    await client.query('COMMIT');return true;
  } catch(error) {
    await client.query('ROLLBACK');throw error;
  } finally {client.release();}
}
