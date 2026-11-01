import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
const origin=process.env.MOBILE_TEST_URL ?? 'http://127.0.0.1:3100'; const connectionString=process.env.DATABASE_URL; const secret=process.env.AUTH_SECRET;
if(new URL(origin).hostname!=='127.0.0.1' || !connectionString || new URL(connectionString).port!=='55432' || !secret) throw new Error('This load runner requires the isolated loopback API/database and test AUTH_SECRET.');
const pool=new Pool({connectionString,max:5}); const assertions=[]; let requests=0;
async function call(token,body,path='/api/mobile') {const started=performance.now(); const response=await fetch(`${origin}${path}`,{method:body ? 'POST':'GET',headers:{'Content-Type':'application/json',...(token ? {Authorization:`Bearer ${token}`}:{})},...(body ? {body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)}); const data=await response.json(); requests++; return {status:response.status,data,ms:performance.now()-started};}
async function expectCall(token,body,status=200,path) {const result=await call(token,body,path);assert.equal(result.status,status,JSON.stringify(result.data));return result.data;}
async function session(userId) {const token=randomUUID();const hash=createHmac('sha256',secret).update(token).digest('hex');await pool.query("INSERT INTO sessions(id,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",[hash,userId]);return token;}
async function main(){
  const health=await fetch(`${origin}/api/health`).then(r=>r.json());assert.equal(health.mode,'database','Never use this as a substitute for a database-backed test.');
  const users=Number((await pool.query("SELECT count(*) FROM users WHERE id LIKE 'load-user-%'")).rows[0].count);assert.equal(users,10000);
  const tokens=await Promise.all(Array.from({length:200},(_,n)=>session(`load-user-${n+1}`)));const admin=await session('load-admin');const creator=await session('load-creator');
  const user=tokens[0]; await expectCall(null,null,401);await expectCall(randomUUID(),null,401);
  await expectCall(null,{handle:'load-user-1',password:'wrong-password'},400,'/api/mobile/auth');
  await expectCall(null,{action:'request',phone:'+12025550101'},503,'/api/mobile/auth');
  // Exercise authenticated database workflows using isolated fixture sessions.
  // This does not load-test SMS delivery or prove a production OTP integration.
  const login={token:await session('load-user-1')};
  await expectCall(user,{action:'review',id:'load-product-0001',status:'archived'},403);
  await expectCall(user,{action:'complete',id:'morning:water',enabled:true},400);
  await expectCall(user,{action:'flow',id:'not-a-flow',enabled:true},400);
  await expectCall(user,{action:'flow',id:'morning'},400);
  await expectCall(user,{action:'flow',id:'morning',enabled:true,timeZone:'invalid-zone'},400);
  await expectCall(user,{action:'city',id:'x'.repeat(20000)},413);
  assertions.push('Authentication, forged sessions, role escalation, malformed/oversized payloads, invalid IDs/timezones');
  await expectCall(user,{action:'flow',id:'morning',enabled:true});
  const completions=await Promise.all(Array.from({length:20},()=>call(user,{action:'complete',id:'morning:water',enabled:true,timeZone:'Asia/Kolkata'})));assert.ok(completions.every(r=>r.status===200));
  let data=await expectCall(user);assert.equal(data.profile.completed.length,1);
  const counts=(await pool.query("SELECT count(*) FROM mobile_analytics WHERE user_id='load-user-1' AND action='habit_completed'")).rows[0];assert.equal(Number(counts.count),1); assertions.push('20 concurrent completion retries persist once and generate one conversion');
  const saveResults=await Promise.all(Array.from({length:20},()=>call(user,{action:'save',id:'load-product-0001',enabled:true})));assert.ok(saveResults.every(r=>r.status===200));assert.equal((await expectCall(user)).profile.savedProductIds.length,1);
  await expectCall(user,{action:'save',id:'load-product-0001',enabled:false});assert.equal((await expectCall(user)).profile.savedProductIds.length,0); assertions.push('Concurrent saves and explicit removal are idempotent');
  const requestId=`load-product-${Date.now()}`; const submission={action:'product',requestId,product:{title:'Real DB review fixture',category:'Tech',subcategory:'Electronics',tier:'Essential',price:300,summary:'An isolated test listing.',url:'https://example.com',checkedAt:new Date().toISOString()}};
  await Promise.all(Array.from({length:10},()=>expectCall(creator,submission))); const rows=(await pool.query('SELECT id FROM mobile_catalog WHERE request_key=$1',[`load-creator:${requestId}`])).rows;assert.equal(rows.length,1);const productId=rows[0].id;
  assert.ok(!(await expectCall(user)).products.some(p=>p.id===productId)); await expectCall(admin,{action:'review',id:productId,status:'published'});assert.ok((await expectCall(user)).products.some(p=>p.id===productId)); assertions.push('Concurrent submissions deduplicate; publication requires an admin');
  const eventData=await expectCall(admin,{action:'event',requestId:`load-event-${Date.now()}`,event:{title:'Database last-seat race',city:'Bengaluru',venue:'Isolated venue',startsAt:new Date(Date.now()+86400000).toISOString(),capacity:10,price:0,description:'Isolated concurrency fixture'}});const event=eventData.events.find(e=>e.title==='Database last-seat race');assert.ok(event);
  const race=await Promise.all(tokens.slice(0,100).map(token=>call(token,{action:'rsvp',id:event.id,enabled:true})));assert.equal(race.filter(r=>r.status===200).length,10);assert.equal(race.filter(r=>r.status===400).length,90);
  assert.equal(Number((await pool.query('SELECT count(*) FROM mobile_rsvps WHERE event_id=$1',[event.id])).rows[0].count),10);
  const winner=race.findIndex(r=>r.status===200);await expectCall(tokens[winner],{action:'rsvp',id:event.id,enabled:true});await expectCall(admin,{action:'review',id:event.id,status:'archived'});await expectCall(tokens[winner],{action:'rsvp',id:event.id,enabled:false});assert.equal(Number((await pool.query('SELECT count(*) FROM mobile_rsvps WHERE event_id=$1',[event.id])).rows[0].count),9);assertions.push('Real Postgres: 100 competing users cannot oversell 10 seats; duplicate RSVP and archived cancellation work');
  let cursor='';const productIds=new Set();let pages=0;do{data=await expectCall(tokens[199],null,200,`/api/mobile?cursor=${encodeURIComponent(cursor)}`);assert.ok(data.products.length<=100);for(const p of data.products){assert.ok(!productIds.has(p.id));productIds.add(p.id);}cursor=data.nextCursor ?? '';pages++;}while(cursor);assert.ok(productIds.size>=600);assertions.push(`Paginated catalog: ${productIds.size} products across ${pages} pages`);
  // Start measuring after warm-up. These are closed-loop concurrent clients, not 10,000 simultaneous people.
  const stages=[];
  for(const concurrency of [10,25,50,100]){
    const total=concurrency*10;let next=0;const latencies=[];const statuses={};const started=performance.now();
    await Promise.all(Array.from({length:concurrency},async()=>{for(;;){const index=next++;if(index>=total)return;const token=tokens[20+index%180];const result=await call(token,index%5===0 ? {action:'flow',id:'running',enabled:true}:undefined);latencies.push(result.ms);statuses[result.status]=(statuses[result.status]??0)+1;}}));
    latencies.sort((a,b)=>a-b);const elapsed=performance.now()-started;const p95=latencies[Math.floor(latencies.length*.95)]; const errors=Object.entries(statuses).filter(([code])=>code!=='200').reduce((sum,[,count])=>sum+count,0);
    stages.push({concurrency,requests:total,elapsedMs:Math.round(elapsed),requestsPerSecond:Math.round(total/(elapsed/1000)),p50Ms:Math.round(latencies[Math.floor(latencies.length*.5)]),p95Ms:Math.round(p95),p99Ms:Math.round(latencies[Math.floor(latencies.length*.99)]),statuses,errorRate:errors/total,passesTarget:errors===0 && p95<1000});console.log(JSON.stringify(stages.at(-1)));
  }
  const populationTokens=Array.from({length:10000},(_,index)=>({token:randomUUID(),userId:`load-user-${index+1}`}));
  for(let start=0;start<populationTokens.length;start+=500) {
    const batch=populationTokens.slice(start,start+500).map(({token,userId})=>({id:createHmac('sha256',secret).update(token).digest('hex'),userId}));
    await pool.query("INSERT INTO sessions(id,user_id,expires_at) SELECT value->>'id',value->>'userId',now()+interval '1 hour' FROM jsonb_array_elements($1::jsonb)",[JSON.stringify(batch)]);
  }
  let populationIndex=0;const populationTimes=[];const populationStarted=performance.now();
  await Promise.all(Array.from({length:100},async()=>{for(;;){const index=populationIndex++;if(index>=populationTokens.length)return;const {token,userId}=populationTokens[index];const began=performance.now();await expectCall(token,{action:'flow',id:'sleep',enabled:true});const snapshot=await expectCall(token);assert.equal(snapshot.user.id,userId);assert.ok(snapshot.profile.flowIds.includes('sleep'));populationTimes.push(performance.now()-began);}}));
  populationTimes.sort((a,b)=>a-b); const populationExercise={distinctAccounts:populationTokens.length,concurrency:100,httpRequests:20000,elapsedMs:Math.round(performance.now()-populationStarted),journeyP95Ms:Math.round(populationTimes[Math.floor(populationTimes.length*.95)]),unexpectedErrors:0};
  console.log(JSON.stringify(populationExercise));assertions.push('All 10,000 accounts exercised over HTTP: join a flow, reload persisted isolated profile');
  const soakStarted=performance.now();const soakTimes=[];const soakStatuses={};let soakIndex=0;const soakDuration=30000;
  await Promise.all(Array.from({length:25},async()=>{while(performance.now()-soakStarted<soakDuration){const token=populationTokens[(soakIndex++)%populationTokens.length].token;const result=await call(token);soakTimes.push(result.ms);soakStatuses[result.status]=(soakStatuses[result.status]??0)+1;await new Promise(resolve=>setTimeout(resolve,200));}}));
  soakTimes.sort((a,b)=>a-b);const shortSoak={durationMs:Math.round(performance.now()-soakStarted),concurrency:25,thinkTimeMs:200,requests:soakTimes.length,p95Ms:Math.round(soakTimes[Math.floor(soakTimes.length*.95)]),statuses:soakStatuses};assert.equal(soakStatuses[200],soakTimes.length);console.log(JSON.stringify(shortSoak));assertions.push('30-second paced local stability run has no unexpected responses; a long staging soak remains required');
  const throttled=await Promise.all(Array.from({length:125},()=>call(tokens[198])));assert.ok(throttled.some(r=>r.status===429));assertions.push('Shared production read throttling returns 429 under excess requests');
  const analytics=(await expectCall(admin)).analytics;assert.ok(analytics.completions>=1);assert.ok(analytics.rsvps>=10);assertions.push('Admin analytics aggregate database records');
  await fetch(`${origin}/api/mobile/auth`,{method:'DELETE',headers:{Authorization:`Bearer ${login.token}`}});await expectCall(login.token,null,401);assertions.push('Logout revokes the server session');
  const report={kind:'Local production-build HTTP test with actual PostgreSQL, single API instance; not cloud capacity certification',storedUsers:users,requests,stages,populationExercise,shortSoak,assertions,targets:{p95Ms:1000,errorRate:0},releaseGate:stages.every(s=>s.passesTarget)?'Local load gate passed; staging/device/soak gates outstanding':'Local performance gate failed; do not claim production scale'};
  await mkdir('reports',{recursive:true});await writeFile('reports/mobile-database-load.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>pool.end());
