import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import {Pool} from 'pg';
dotenv.config({path:'.env.local',quiet:true});
async function main() {
  const url=new URL(process.env.DATABASE_URL??'');
  if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/betterhabits_local')throw new Error('Use the isolated betterhabits_local database.');
  process.env.RUGRAM_DEMO_MODE='false';
  const {exportAccount,deleteAccount}=await import('../src/lib/account-store');
  const {getUser,createSession,getSessionUser}=await import('../src/lib/store');
  const pool=new Pool({connectionString:url.toString()});
  const ids=[crypto.randomUUID(),crypto.randomUUID(),crypto.randomUUID()];const event=crypto.randomUUID();
  try {
    for(const [index,id]of ids.entries())await pool.query('INSERT INTO users(id,handle,name,role) VALUES($1,$1,$2,$3)',[id,`Privacy fixture ${index}`,index===2?'admin':'member']);
    await createSession(ids[0],'privacy-test-session',new Date(Date.now()+600000));
    await pool.query('INSERT INTO mobile_profiles(user_id,data) VALUES($1,$2)',[ids[0],{city:'Hyderabad',flowIds:['sleep'],completed:[],eventIds:[],savedProductIds:[]}]);
    await pool.query('INSERT INTO mobile_catalog(id,kind,data) VALUES($1,$2,$3)',[event,'event',{id:event,title:'Privacy test event',createdBy:ids[0],status:'pending'}]);
    await pool.query('INSERT INTO mobile_event_registrations(event_id,user_id,status) VALUES($1,$2,$3)',[event,ids[1],'pending']);
    await pool.query('INSERT INTO mobile_analytics(id,user_id,role,action) VALUES($1,$2,$3,$4)',[crypto.randomUUID(),ids[0],'user','test']);
    const actor=(await getUser(ids[0]))!;const admin=(await getUser(ids[2]))!;
    const exported=await exportAccount(actor);
    assert.ok(exported.account&&'id'in exported.account);
    assert.equal(exported.account.id,actor.id);
    assert.equal(JSON.stringify(exported).includes('privacy-test-session'),false);
    assert.equal(JSON.stringify(exported).includes(ids[1]),false,'Other guest identities must not leak');
    await assert.rejects(deleteAccount(admin),{status:409});
    await deleteAccount(actor);
    assert.equal(await getUser(ids[0]),null);assert.equal(await getSessionUser('privacy-test-session'),null);
    for(const table of ['mobile_profiles','mobile_analytics','mobile_event_registrations'])assert.equal((await pool.query(`SELECT count(*) FROM ${table} WHERE user_id=$1`,[ids[0]])).rows[0].count,'0');
    assert.equal((await pool.query('SELECT count(*) FROM mobile_catalog WHERE id=$1',[event])).rows[0].count,'0');
    assert.ok(await getUser(ids[1]));assert.ok(await getUser(ids[2]));
    console.log('PASS: Postgres account export, no guest/token leakage, self-deletion cascade, session invalidation, unrelated accounts intact and admin guard.');
  } finally {
    await pool.query('DELETE FROM mobile_catalog WHERE id=$1',[event]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::text[])',[ids]);
    await pool.end();await globalThis.betterHabitsPgPool?.end();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
