import dotenv from "dotenv";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { Pool } from 'pg';
import {applyPostgresMigration} from './migration-runner.mjs';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH ?? ".env.local" });

const command = process.argv[2];
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is required. Copy .env.example to .env.local and configure Neon Postgres.");
  process.exit(1);
}

if (command !== "migrate" && command !== "seed") {
  console.error("Usage: node scripts/db.mjs <migrate|seed>");
  process.exit(1);
}

const local=['127.0.0.1','localhost','[::1]'].includes(new URL(connectionString).hostname) || process.env.DATABASE_DRIVER==='postgres';
// Migrations require a dedicated connection for transaction and advisory locking.
const pool=local || command==='migrate' ? new Pool({connectionString}) : null;
const sql = pool ? {query:async(text,values=[]) => (await pool.query(text,values)).rows} : neon(connectionString);

async function runStatements(source) {
  const statements = source.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean);
  for (const statement of statements) await sql.query(statement);
  return statements.length;
}

if (command === "seed") {
  const count = await runStatements(await readFile(resolve("db/seed.sql"), "utf8"));
  console.log(`Seed complete (${count} statements).`);
  process.exit(0);
}

await sql.query("CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
const applied = new Set((await sql.query("SELECT filename FROM schema_migrations")).map((row) => row.filename));
const files = (await readdir(resolve("db/migrations"))).filter((file) => file.endsWith(".sql")).sort();
let appliedCount = 0;
for (const file of files) {
  if (applied.has(file)) continue;
  const changed=await applyPostgresMigration(pool,file,await readFile(resolve("db/migrations", file),"utf8"));
  if(!changed)continue;
  appliedCount += 1;
  console.log(`Applied ${file} (transactional).`);
}
console.log(`Migration complete (${appliedCount} new migration${appliedCount === 1 ? "" : "s"}).`);
await pool?.end();
