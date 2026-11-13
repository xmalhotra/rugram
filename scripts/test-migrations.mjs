import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import {Pool} from 'pg';
import {applyPostgresMigration} from './migration-runner.mjs';
dotenv.config({path:'.env.local',quiet:true});
const url=new URL(process.env.DATABASE_URL??'');
if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/betterhabits_local')throw new Error('Use the isolated betterhabits_local database.');
const pool=new Pool({connectionString:url.toString()});
const suffix=crypto.randomUUID().replaceAll('-','');
const table=`migration_test_${suffix}`;const file=`test-${suffix}.sql`;
try {
  await assert.rejects(applyPostgresMigration(pool,file,`CREATE TABLE ${table}(id INT); SELECT missing_column_for_rollback;`));
  assert.equal((await pool.query('SELECT to_regclass($1) AS name',[table])).rows[0].name,null);
  assert.equal((await pool.query('SELECT filename FROM schema_migrations WHERE filename=$1',[file])).rowCount,0);
  const source=`CREATE TABLE ${table}(id INT); DO $$ BEGIN INSERT INTO ${table} VALUES(1); INSERT INTO ${table} VALUES(2); END $$;`;
  const outcomes=await Promise.all([applyPostgresMigration(pool,file,source),applyPostgresMigration(pool,file,source)]);
  assert.deepEqual(outcomes.sort(),[false,true]);
  assert.equal((await pool.query(`SELECT count(*) FROM ${table}`)).rows[0].count,'2');
  console.log('PASS: rollback leaves no DDL/history residue; whole SQL function bodies execute; concurrent runners apply once.');
} finally {
  await pool.query(`DROP TABLE IF EXISTS ${table}`);
  await pool.query('DELETE FROM schema_migrations WHERE filename=$1',[file]);
  await pool.end();
}
