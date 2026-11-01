import assert from 'node:assert/strict';
import test from 'node:test';
import {MockOtpProvider,mockOtpAllowed,normalizePhone} from '../src/lib/otp';
test('phone numbers normalise consistently without accepting usernames',()=>{
  assert.equal(normalizePhone('98765 43210'),'+919876543210');
  assert.equal(normalizePhone('+91 (98765) 43210'),'+919876543210');
  assert.equal(normalizePhone('+1 202-555-0101'),'+12025550101');
  for(const bad of ['john','12345','+0123456789','abc9876543210','+91.9876543210'])assert.equal(normalizePhone(bad),null);
});
test('mock codes expire, are single-use, and are bound to a challenge',async()=>{
  let now=1000000;const service=new MockOtpProvider(()=>now);
  const one=await service.request('+12025550101');const other=await service.request('+12025550102');
  assert.match(one.mockCode!,/^\d{6}$/);
  await assert.rejects(service.verify('not-a-challenge',one.mockCode!));
  assert.equal(await service.verify(one.challengeId,one.mockCode!),'+12025550101');
  await assert.rejects(service.verify(one.challengeId,one.mockCode!));
  now=other.expiresAt;
  await assert.rejects(service.verify(other.challengeId,other.mockCode!));
});
test('five incorrect attempts lock the code, even if the next code is correct',async()=>{
  const service=new MockOtpProvider();const item=await service.request('+12025550101');
  const wrong=item.mockCode==='000000'?'111111':'000000';
  for(let i=0;i<5;i++)await assert.rejects(service.verify(item.challengeId,wrong));
  await assert.rejects(service.verify(item.challengeId,item.mockCode!));
});
test('resending waits 60 seconds and invalidates the old challenge',async()=>{
  let now=1000000;const service=new MockOtpProvider(()=>now);const first=await service.request('+12025550101');
  await assert.rejects(service.request('+12025550101'),{status:429});
  now+=60000;const second=await service.request('+12025550101');
  await assert.rejects(service.verify(first.challengeId,first.mockCode!));
  assert.equal(await service.verify(second.challengeId,second.mockCode!),'+12025550101');
});
test('parallel verification cannot replay a valid code',async()=>{
  const service=new MockOtpProvider();const item=await service.request('+12025550101');
  const results=await Promise.allSettled([service.verify(item.challengeId,item.mockCode!),service.verify(item.challengeId,item.mockCode!)]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
});
test('mock SMS is disabled in production, database mode and for unimplemented providers',()=>{
  assert.equal(mockOtpAllowed({NODE_ENV:'development'},true),false);
  assert.equal(mockOtpAllowed({NODE_ENV:'development',RUGRAM_DEMO_MODE:'true'},true),true);
  assert.equal(mockOtpAllowed({NODE_ENV:'development',APP_ENV:'staging',RUGRAM_DEMO_MODE:'true'},true),false);
  assert.equal(mockOtpAllowed({NODE_ENV:'development',VERCEL_ENV:'preview',RUGRAM_DEMO_MODE:'true'},true),false);
  assert.equal(mockOtpAllowed({NODE_ENV:'production',SMS_PROVIDER:'mock'},true),false);
  assert.equal(mockOtpAllowed({NODE_ENV:'development'},false),false);
  assert.equal(mockOtpAllowed({NODE_ENV:'development',SMS_PROVIDER:'msg91'},true),false);
});
