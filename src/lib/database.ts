import 'server-only';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';

type Row = Record<string, unknown>;
export type DatabaseQuery = PromiseLike<Row[]> & { text: string; values: unknown[] };
declare global { var betterHabitsPgPool: Pool | undefined; }
function postgresPool(url:string) {
  if(!globalThis.betterHabitsPgPool) {
    const pool=new Pool({ connectionString:url,max:10,connectionTimeoutMillis:5000,idleTimeoutMillis:10000,statement_timeout:10000 });
    pool.on('error',()=>console.error(JSON.stringify({event:'database_idle_connection_error'})));
    globalThis.betterHabitsPgPool=pool;
  }
  return globalThis.betterHabitsPgPool;
}
/** The same parameterized queries run against Neon or an ordinary Postgres test/staging host. */
export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required.');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname);
  const postgres = local || process.env.DATABASE_DRIVER === 'postgres';
  const pool = postgres ? postgresPool(url) : null;
  const remote = pool ? null : neon(url);
  const run = async (text: string, values: unknown[] = []): Promise<Row[]> => pool ? (await pool.query(text, values)).rows : await remote!.query(text, values) as Row[];
  function sql(strings: TemplateStringsArray, ...values: unknown[]): DatabaseQuery {
    const text = strings.reduce((result, part, index) => result + (index ? `$${index}` : '') + part, '');
    let result: Promise<Row[]> | undefined;
    return { text, values, then(onfulfilled, onrejected) { result ??= run(text, values); return result.then(onfulfilled, onrejected); } };
  }
  sql.query = run;
  sql.transaction = async (queries: DatabaseQuery[]): Promise<Row[][]> => {
    if (!pool) return await remote!.transaction(queries.map(query => remote!.query(query.text, query.values)), { isolationLevel: 'ReadCommitted' }) as Row[][];
    const client = await pool.connect();
    try { await client.query('BEGIN ISOLATION LEVEL READ COMMITTED'); const result: Row[][] = []; for (const query of queries) result.push((await client.query(query.text, query.values)).rows); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  };
  return sql;
}
