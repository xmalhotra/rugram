import assert from 'node:assert/strict';
const origin = process.env.MOBILE_TEST_URL ?? 'http://localhost:3000';
async function call(path, token, body, method) {
  if(body?.action==='product'&&body.product&&!body.product.purchaseOptions){const product=body.product;body={...body,product:{...product,variantLabel:'API fixture · one unit',purchaseOptions:[{url:product.url,sellerName:'API fixture seller',price:product.price,shippingFee:null,deliveryNote:'Test fixture only; not a real offer.',checkedAt:product.checkedAt}]}};}
  const response = await fetch(`${origin}${path}`, { method: method ?? (body ? 'POST' : 'GET'), headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) }, ...(body ? { body:JSON.stringify(body) } : {}) }); return { status:response.status, data:await response.json() };
}
async function login(handle) {
  const phone={john:'+12025550101',creator:'+12025550102',admin:'+12025550103'}[handle];
  const challenge=await call('/api/mobile/auth',null,{action:'request',phone});
  assert.equal(challenge.status,200,JSON.stringify(challenge.data));assert.match(challenge.data.mockCode,/^\d{6}$/);
  assert.equal((await call('/api/mobile/auth',null,{action:'request',phone})).status,429,'Resends must wait.');
  const result=await call('/api/mobile/auth',null,{action:'verify',challengeId:challenge.data.challengeId,code:challenge.data.mockCode});
  assert.equal(result.status,200,JSON.stringify(result.data));
  assert.equal((await call('/api/mobile/auth',null,{action:'verify',challengeId:challenge.data.challengeId,code:challenge.data.mockCode})).status,400,'A code is single use.');
  return result.data.token;
}
const tokens = [];
try {
  assert.equal((await call('/api/mobile/auth',null,{handle:'john',password:'12345'})).status,400,'Mobile password login is removed.');
  assert.equal((await call('/api/auth/login',null,{handle:'john',password:'12345'})).status,410,'Legacy password login is removed.');
  assert.equal((await call('/api/mobile/auth',null,{action:'request',phone:'invalid'})).status,400);
  assert.equal((await call('/api/mobile/auth',null,{action:'request',phone:'+12025550104',role:'admin'})).status,400,'Role cannot be supplied by a client.');
  const freshChallenge=await call('/api/mobile/auth',null,{action:'request',phone:'+12025550104'});
  assert.equal(freshChallenge.status,200);
  const freshLogin=await call('/api/mobile/auth',null,{action:'verify',challengeId:freshChallenge.data.challengeId,code:freshChallenge.data.mockCode});
  assert.equal(freshLogin.status,200);tokens.push(freshLogin.data.token);
  assert.equal((await call('/api/mobile',freshLogin.data.token)).data.user.role,'user','New phones receive only the ordinary user role.');
  const user = await login('john'); tokens.push(user);
  let snapshot = (await call('/api/mobile',user)).data;
  assert.equal(snapshot.demoMode,true,'Only run this smoke test in isolated local demo mode.');
  const creator = await login('creator'); tokens.push(creator); const admin = await login('admin'); tokens.push(admin);
  assert.equal((await call('/api/mobile',null)).status,401);
  assert.equal(snapshot.user.role,'user'); assert.equal(snapshot.analytics,null);
  assert.equal((await call('/api/mobile',user,{ action:'review',id:'demo-oats',status:'archived' })).status,403);
  const originalFlows = snapshot.profile.flowIds;
  for(const [area,id,stepId] of [['Fitness','fitness-hyrox-base','map'],['Tech','tech-web-first-page','learn']]) {
    const flow=snapshot.flows.find(flow=>flow.id===id);
    assert.equal(flow?.area,area);
    const stepKey=`${id}:${stepId}`;
    const date=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
    const alreadyComplete=snapshot.profile.completed.includes(`${date}:${stepKey}`);
    assert.equal((await call('/api/mobile',user,{action:'flow',id,enabled:true})).status,200);
    assert.equal((await call('/api/mobile',user,{action:'flow',id,enabled:true})).status,200);
    let updated=(await call('/api/mobile',user)).data;
    assert.equal(updated.profile.flowIds.filter(value=>value===id).length,1);
    assert.equal((await call('/api/mobile',user,{action:'complete',id:stepKey,enabled:true,timeZone:'Asia/Kolkata'})).status,200);
    updated=(await call('/api/mobile',user)).data;
    assert.ok(updated.profile.completed.includes(`${date}:${stepKey}`));
    if(!alreadyComplete) await call('/api/mobile',user,{action:'complete',id:stepKey,enabled:false,timeZone:'Asia/Kolkata'});
    if(!originalFlows.includes(id)) await call('/api/mobile',user,{action:'flow',id,enabled:false});
  }
  if (!originalFlows.includes('morning')) assert.equal((await call('/api/mobile',user,{action:'flow',id:'morning',enabled:true})).status,200);
  snapshot = (await call('/api/mobile',user)).data;
  assert.ok(snapshot.profile.flowIds.includes('morning'));
  assert.equal((await call('/api/mobile',user,{action:'complete',id:'morning:water',enabled:true})).status,200);
  assert.equal((await call('/api/mobile',user,{action:'complete',id:'morning:water',enabled:false})).status,200);
  const productResult = await call('/api/mobile',creator,{action:'product',requestId:`smoke-product-${Date.now()}`,product:{title:'API smoke fixture',category:'Tech',subcategory:'Electronics',tier:'Essential',price:400,summary:'Isolated smoke test listing; not a real product.',url:'https://example.com',checkedAt:new Date().toISOString()}});
  for(const invalid of [{category:'Gear'},{category:'Electronics'},{category:'Tech',subcategory:undefined},{category:'Food',subcategory:'Audio'}]) {
    const result=await call('/api/mobile',creator,{action:'product',requestId:`invalid-pick-${Date.now()}`,product:{title:'Invalid category fixture',tier:'Essential',price:400,summary:'An invalid test submission.',url:'https://example.com',checkedAt:new Date().toISOString(),...invalid}});
    assert.equal(result.status,400,'Only the new category structure can be submitted.');
  }
  assert.equal(productResult.status,200); const product = productResult.data.products.find(p => p.title === 'API smoke fixture' && p.status === 'pending'); assert.ok(product);
  assert.ok(!(await call('/api/mobile',user)).data.products.some(p => p.id === product.id));
  assert.equal((await call('/api/mobile',admin,{action:'review',id:product.id,status:'published'})).status,200);
  assert.equal((await call('/api/mobile',user,{action:'endorse',id:product.id,sourceUrl:'https://example.com',disclosure:'Test reference only'})).status,403);
  const backed = await call('/api/mobile',creator,{action:'endorse',id:product.id,sourceUrl:'https://example.com',disclosure:'Test reference only; not a real endorsement'});
  assert.equal(backed.status,200); assert.equal(backed.data.products.find(p => p.id === product.id).endorsements.length,1);
  assert.equal((await call('/api/mobile',user,{action:'save',id:product.id,enabled:true})).status,200);
  assert.equal((await call('/api/mobile',user,{action:'save',id:product.id,enabled:false})).status,200);
  assert.equal((await call('/api/mobile',admin,{action:'review',id:product.id,status:'archived',reviewNote:'API test cleanup only.',reviewCode:'other'})).status,200);
  const result = await call('/api/mobile',creator,{action:'event',requestId:`smoke-event-${Date.now()}`,event:{title:'API event fixture',city:'Bengaluru',venue:'Local test venue',startsAt:new Date(Date.now()+86400000).toISOString(),capacity:1,price:0,description:'An isolated test event; not a public gathering.'}});
  assert.equal(result.status,403,'Legacy in-app event creation is disabled for creators.');
  const input={title:'API Hyderabad event fixture',topic:'Tech',city:'Hyderabad',country:'IN',venue:'Isolated test venue',startsAt:new Date(Date.now()+86400000).toISOString(),description:'Isolated test listing, not a public event.',registrationUrl:'https://luma.com/isolated-api-fixture',sourceUrls:['https://luma.com/isolated-api-fixture'],checkedAt:new Date().toISOString(),registrationClosesAt:null,entryFee:null,feeNote:'Price not verified.',registrationStatus:'Check provider',audience:'Local developers',outcomes:['Verify the app, not a real benefit.'],editorialPriority:{score:3,reason:'An isolated test score, not a recommendation.'}};
  assert.equal((await call('/api/mobile',creator,{action:'event-link',requestId:`denied-${Date.now()}`,event:input})).status,400,'Creators cannot assign editorial priority.');
  const {editorialPriority,...creatorInput}=input;void editorialPriority;
  const allowance=(await call('/api/mobile',creator)).data.creatorEventQuota;
  const submitted=await call('/api/mobile',creator,{action:'event-link',requestId:`creator-${Date.now()}`,event:{...creatorInput,title:'Creator API review fixture'}});
  if(allowance.remaining>0){
    assert.equal(submitted.status,200,JSON.stringify(submitted.data));const pending=submitted.data.events.find(event=>event.title==='Creator API review fixture'&&event.status==='pending');assert.ok(pending);
    assert.ok(!(await call('/api/mobile',user)).data.events.some(event=>event.id===pending.id));
    assert.equal((await call('/api/mobile',admin,{action:'review',id:pending.id,status:'published'})).status,400);
    await call('/api/mobile',admin,{action:'review',id:pending.id,status:'archived',reviewNote:'API test cleanup only.',reviewCode:'other'});
  }else assert.equal(submitted.status,429);
  const added=await call('/api/mobile',admin,{action:'event-link',requestId:`curated-${Date.now()}`,event:input});
  assert.equal(added.status,200,JSON.stringify(added.data));const event=added.data.events.find(event=>event.title===input.title);assert.ok(event);
  for(let repeat=0;repeat<2;repeat++)assert.equal((await call('/api/mobile',user,{action:'save-event',id:event.id,enabled:true})).status,200);
  const saved=(await call('/api/mobile',user)).data.profile;
  assert.equal(saved.savedEventIds.filter(id=>id===event.id).length,1);assert.ok(!saved.eventIds.includes(event.id));
  assert.equal((await call('/api/mobile',creator,{action:'event-update',id:event.id,event:input})).status,403);
  assert.equal((await call('/api/mobile',user,{action:'event-open',id:event.id})).status,200);
  assert.equal((await call('/api/mobile',user,{action:'rsvp',id:event.id,enabled:true})).status,400);
  assert.equal((await call('/api/mobile',admin,{action:'event-update',id:event.id,event:{...input,registrationClosesAt:new Date(Date.now()-60000).toISOString()}})).status,200);
  assert.equal((await call('/api/mobile',user,{action:'event-open',id:event.id})).status,400);
  await call('/api/mobile',user,{action:'save-event',id:event.id,enabled:false});
  await call('/api/mobile',admin,{action:'review',id:event.id,status:'archived',reviewNote:'API test cleanup only.',reviewCode:'other'});
  if (!originalFlows.includes('morning')) await call('/api/mobile',user,{action:'flow',id:'morning',enabled:false});
  const report = (await call('/api/mobile',admin)).data.analytics;
  assert.ok(report.actions > 0); assert.ok(report.saves > 0); assert.ok(report.byAction.event_saved > 0);
  console.log('Mobile API smoke passed: phone OTP, role isolation, goal flows, creator submissions and quota, admin-only event approval, saved interest, deadline gates and analytics.');
} finally { for (const token of tokens) await call('/api/mobile/auth',token,undefined,'DELETE'); }
