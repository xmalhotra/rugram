import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
const cluster=process.env.PG_TEST_CLUSTER;const connectionString=process.env.DATABASE_URL;const secret=process.env.AUTH_SECRET;const origin='http://127.0.0.1:3100';
if(!cluster || !/^\/private\/tmp\/betterhabits-postgres\.[A-Za-z0-9]+$/.test(cluster) || !connectionString || new URL(connectionString).port!=='55432' || new URL(connectionString).hostname!=='127.0.0.1' || !secret) throw new Error('Only the isolated temporary test cluster on port 55432 can be stopped.');
const pid=(await readFile(`${cluster}/data/postmaster.pid`,'utf8')).split('\n');assert.equal(pid[3],'55432');
const pool=new Pool({connectionString});const token=randomUUID();const expiredToken=randomUUID();await pool.query("INSERT INTO sessions(id,user_id,expires_at) VALUES($1,'load-user-1',now()+interval '1 hour')",[createHmac('sha256',secret).update(token).digest('hex')]);await pool.query("INSERT INTO sessions(id,user_id,expires_at) VALUES($1,'load-user-1',now()-interval '1 hour')",[createHmac('sha256',secret).update(expiredToken).digest('hex')]);await pool.end();
async function request(authToken=token){const response=await fetch(`${origin}/api/mobile`,{headers:{Authorization:`Bearer ${authToken}`},signal:AbortSignal.timeout(15000)});return {status:response.status,data:await response.json(),requestId:response.headers.get('x-request-id')};}
assert.equal((await request(expiredToken)).status,401);
const before=await request();assert.equal(before.status,200);let stopped=false;
try {
  execFileSync('pg_ctl',['-D',`${cluster}/data`,'-m','fast','-w','stop'],{stdio:'pipe'});stopped=true;
  const failed=await request();assert.equal(failed.status,503);assert.ok(failed.requestId);assert.equal(failed.data.error,'Service temporarily unavailable. Please try again.');
  execFileSync('pg_ctl',['-D',`${cluster}/data`,'-l',`${cluster}/server.log`,'-o',`-h 127.0.0.1 -p 55432 -k ${cluster} -c shared_buffers=32MB -c max_connections=30`,'-w','start'],{stdio:'pipe'});stopped=false;
  const after=await request();assert.equal(after.status,200);assert.deepEqual(after.data.profile,before.data.profile);
  const report={expiredSessionStatus:401,databaseFailureStatus:failed.status,recoveredStatus:after.status,profilePreserved:true,sensitiveErrorDetailsExposed:false,requestIdPresent:true};await writeFile('reports/mobile-resilience.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {if(stopped) execFileSync('pg_ctl',['-D',`${cluster}/data`,'-l',`${cluster}/server.log`,'-o',`-h 127.0.0.1 -p 55432 -k ${cluster} -c shared_buffers=32MB -c max_connections=30`,'-w','start'],{stdio:'pipe'});}
