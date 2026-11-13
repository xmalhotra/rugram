import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import {Pool} from 'pg';
dotenv.config({path:'.env.local',quiet:true});
async function main() {
const url=new URL(process.env.DATABASE_URL??'');
if(!['localhost','127.0.0.1'].includes(url.hostname)||url.pathname!=='/betterhabits_local')throw new Error('Phone integration tests require the dedicated local betterhabits_local database.');
process.env.RUGRAM_DEMO_MODE='false';process.env.DATABASE_DRIVER='postgres';
const {phoneChallengeStore:store}=await import('../src/lib/phone-challenge-store');
const {verifiedPhoneUser}=await import('../src/lib/store');
const {Msg91WidgetProvider}=await import('../src/lib/msg91-widget');
const pool=new Pool({connectionString:url.toString()});
const phone='+12025550179';
let createdUser:string|undefined;
try {
  assert.equal((await pool.query('SELECT id FROM users WHERE phone_e164=$1',[phone])).rowCount,0,'Reserved test phone must be unused');
  const send:typeof fetch=async input=>Response.json({type:'success',message:String(input).endsWith('sendOtp')?'test-provider-request':String(input).endsWith('verifyOtp')?'test-token':phone.slice(1)});
  const provider=new Msg91WidgetProvider('test-key','test-widget',store,send,undefined,6,'test-widget-token');
  const item=await provider.request(phone);
  await assert.rejects(provider.request(phone),{status:429});
  const attempts=await Promise.allSettled(Array.from({length:10},()=>provider.verify(item.challengeId,'123456')));
  assert.equal(attempts.filter(row=>row.status==='fulfilled').length,1);
  const users=await Promise.all(Array.from({length:10},()=>verifiedPhoneUser(phone)));
  createdUser=users[0].id;
  assert.ok(users.every(user=>user.id===createdUser&&user.role==='member'));
  const row=(await pool.query('SELECT password_hash,phone_verified_at FROM users WHERE id=$1',[createdUser])).rows[0];
  assert.equal(row.password_hash,null);assert.ok(row.phone_verified_at);
  await pool.query('UPDATE users SET is_disabled=true WHERE id=$1',[createdUser]);
  await assert.rejects(verifiedPhoneUser(phone),/Account is suspended/);
  // Same-phone identity is unique; unrelated legacy profiles are not linked.
  assert.equal((await pool.query('SELECT id FROM users WHERE phone_e164=$1',[phone])).rowCount,1);
  console.log('PASS: local Postgres widget challenges, concurrent single-use verification, unique member identity, nullable password and suspension guard. No SMS sent.');
} finally {
  if(createdUser)await pool.query('DELETE FROM users WHERE id=$1',[createdUser]);
  await pool.query('DELETE FROM phone_otp_challenges WHERE phone_e164=$1',[phone]);
  await pool.end();await globalThis.betterHabitsPgPool?.end();
}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
