import assert from 'node:assert/strict';
import {simulateJourney} from '../src/lib/demo-journey';
import {mockPhoneUser} from '../src/lib/store';
import {GET,POST} from '../src/app/api/mobile/registrations/route';
import {createSession} from '../src/lib/store';
import {tokenId} from '../src/lib/session';
import {adminCatalogSnapshot} from '../src/lib/mobile-store';
process.env.RUGRAM_DEMO_MODE='true';
async function main(){const admin=await mockPhoneUser('+12025550103');const result=await simulateJourney(admin);assert.equal(result.events,12);assert.equal(result.accounts.length,4);assert.ok(result.checks.length>=4);assert.deepEqual(await simulateJourney(admin),result);
  const tokens:Record<string,string>={};const people:Record<string,string>={};for(const account of result.accounts){const user=await mockPhoneUser(account.phone);const token=crypto.randomUUID();await createSession(user.id,tokenId(token),new Date(Date.now()+600000));tokens[account.phone]=token;people[account.phone]=user.id;}
  const event=(await adminCatalogSnapshot(admin)).find(item=>item.title==='DEMO · Developer gathering 01')!;
  async function call(phone:string,body?:unknown){const request=new Request(`http://localhost/api/mobile/registrations?eventId=${event.id}`,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(tokens[phone]?{authorization:`Bearer ${tokens[phone]}`}:{})},...(body?{body:JSON.stringify(body)}:{})});const response=await(body?POST(request):GET(request));return {status:response.status,data:await response.json()};}
  assert.equal((await call('none')).status,401);assert.equal((await call('+12025550204')).data.guests.length,0);
  assert.equal((await call('+12025550204',{action:'approve',eventId:event.id,guestId:people['+12025550204']})).status,403);
  assert.equal((await call('+12025550201')).data.canViewAttendees,true);assert.equal((await call('+12025550201',{action:'cancel',eventId:event.id})).data.canViewAttendees,false);assert.equal((await call('+12025550201')).data.guests.length,0);
  assert.equal((await call('+12025550201',{action:'request',eventId:event.id})).status,200);assert.equal((await call('+12025550202',{action:'approve',eventId:event.id,guestId:people['+12025550201']})).status,200);
  console.log('Registration route checks passed: no unauthenticated access, pending roster privacy, self-approval blocked, cancellation revokes names, organizer approval restores access.');console.log(JSON.stringify(result,null,2));}
main().catch(error=>{console.error(error);process.exitCode=1;});
