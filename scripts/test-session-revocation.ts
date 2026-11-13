import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import {Pool} from 'pg';
dotenv.config({path:'.env.local',quiet:true});
async function main() {
  const url=new URL(process.env.DATABASE_URL??'');
  if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/betterhabits_local')throw new Error('Use the isolated betterhabits_local database.');
  process.env.RUGRAM_DEMO_MODE='false';
  const {adminUpdatePerson,adminPersonHistory,getUser,createSession,getSessionUser}=await import('../src/lib/store');
  const pool=new Pool({connectionString:url.toString()});const ids=[crypto.randomUUID(),crypto.randomUUID()];
  try {
    for(const [index,id]of ids.entries())await pool.query('INSERT INTO users(id,handle,name,role) VALUES($1,$1,$1,$2)',[id,index===0?'admin':'creator']);
    const admin=(await getUser(ids[0]))!;
    const input={id:ids[1],handle:ids[1],name:'Session fixture',bio:'',instagramUrl:'',avatarUrl:'',role:'creator' as const,disabled:false};
    await createSession(ids[1],'test-suspended-token',new Date(Date.now()+600000));
    await assert.rejects(adminUpdatePerson(admin,{...input,disabled:true}),/need a reason/);
    assert.equal((await getSessionUser('test-suspended-token'))?.id,ids[1],'A rejected change leaves sessions intact');
    assert.deepEqual(await adminUpdatePerson(admin,{...input,disabled:true,reason:'Spam submissions'}),{sessionsRevoked:1});
    assert.equal(await getSessionUser('test-suspended-token'),null);
    assert.equal((await pool.query('SELECT count(*) FROM sessions WHERE user_id=$1',[ids[1]])).rows[0].count,'0');
    await assert.rejects(createSession(ids[1],'forbidden-token',new Date(Date.now()+600000)));
    await adminUpdatePerson(admin,{...input,reason:'Appeal accepted'});
    assert.equal(await getSessionUser('test-suspended-token'),null,'Unsuspension cannot revive a session');
    await createSession(ids[1],'test-role-token',new Date(Date.now()+600000));
    await adminUpdatePerson(admin,{...input,role:'member',reason:'Creator programme ended'});
    assert.equal(await getSessionUser('test-role-token'),null);
    await adminUpdatePerson(admin,{...input,role:'member',name:'Renamed fixture'});
    await assert.rejects(adminUpdatePerson(admin,{...input,id:admin.id,handle:admin.handle,role:'member',reason:'Self demotion'}));
    assert.equal((await getUser(admin.id))?.role,'admin');
    const history=await adminPersonHistory(admin,ids[1]);
    assert.deepEqual(history.map(entry=>[entry.reason,entry.before.role,entry.after.role,entry.before.disabled,entry.after.disabled,entry.sessionsRevoked]),[
      [null,'member','member',false,false,0],
      ['Creator programme ended','creator','member',false,false,1],
      ['Appeal accepted','creator','creator',true,false,0],
      ['Spam submissions','creator','creator',false,true,1],
    ]);
    assert.equal(history[0].after.name,'Renamed fixture');
    assert.ok(history.every(entry=>entry.actor===admin.id&&entry.actorName?.includes(`@${admin.handle}`)));
    console.log('PASS: role and suspension changes need a reason and are audited with before/after values; sessions are revoked and counted; unsuspend never revives them; disabled accounts cannot create sessions; admin self-demotion denied.');
  } finally {
    await pool.query('DELETE FROM users WHERE id=ANY($1::text[])',[ids]);await pool.end();await globalThis.betterHabitsPgPool?.end();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
