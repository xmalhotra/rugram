import assert from 'node:assert/strict';
import test from 'node:test';
import {Msg91OtpProvider,type PhoneChallengeStore} from '../src/lib/msg91';
import type {OtpChallenge} from '../shared/auth';

function harness() {
  let now=1000000;
  const records=new Map<string,OtpChallenge&{phone:string;attempts:number;used:boolean}>();
  const store:PhoneChallengeStore={
    async reserve(phone,item) {
      for(const [id,row] of records)if(row.phone===phone){if(row.resendAt>now)return false;records.delete(id);}
      records.set(item.challengeId,{...item,phone,attempts:0,used:false});return true;
    },
    async attempt(id) {
      const row=records.get(id);
      if(!row||row.used||row.expiresAt<=now||row.attempts>=5)return null;
      row.attempts++;return row.phone;
    },
    async consume(id) {
      const row=records.get(id);if(!row||row.used||row.expiresAt<=now)return false;
      row.used=true;return true;
    },
    async invalidate(id){const row=records.get(id);if(row)row.used=true;},
  };
  let result='success';let networkError=false;
  const calls:{url:URL;options:RequestInit|undefined}[]=[];
  const send:typeof fetch=async(input,options)=>{
    const url=new URL(String(input));calls.push({url,options});
    if(networkError)throw new Error('private-provider-error');
    return Response.json({type:result,message:'private-provider-message'});
  };
  const provider=new Msg91OtpProvider('private-key','approved-template',store,send,()=>now);
  return {provider,calls,advance:(ms:number)=>{now+=ms;},result:(value:string)=>{result=value;},fail:()=>{networkError=true;}};
}

test('MSG91 uses configured template, six digits, server-only key and never returns mock codes',async()=>{
  const h=harness();const challenge=await h.provider.request('+919876543210');
  assert.equal(challenge.mockCode,undefined);
  const {url,options}=h.calls[0];
  assert.equal(url.origin,'https://control.msg91.com');
  assert.equal(url.searchParams.get('mobile'),'919876543210');
  assert.equal(url.searchParams.get('template_id'),'approved-template');
  assert.equal(url.searchParams.get('otp_length'),'6');
  assert.equal(url.searchParams.get('otp_expiry'),'5');
  assert.equal(url.searchParams.has('authkey'),false);
  assert.equal(new Headers(options?.headers).get('authkey'),'private-key');
  assert.equal(options?.redirect,'error');
  assert.equal(await h.provider.verify(challenge.challengeId,'123456'),'+919876543210');
  assert.equal(h.calls[1].url.pathname,'/api/v5/otp/verify');
  await assert.rejects(h.provider.verify(challenge.challengeId,'123456'));
});

test('MSG91 challenges enforce cooldown, resend replacement, expiry and five attempts',async()=>{
  const h=harness();const first=await h.provider.request('+919876543210');
  await assert.rejects(h.provider.request('+919876543210'),{status:429});
  h.advance(60000);const second=await h.provider.request('+919876543210');
  await assert.rejects(h.provider.verify(first.challengeId,'123456'));
  h.result('error');for(let i=0;i<5;i++)await assert.rejects(h.provider.verify(second.challengeId,'123456'));
  h.result('success');await assert.rejects(h.provider.verify(second.challengeId,'123456'));
  h.advance(60000);const third=await h.provider.request('+919876543210');
  h.advance(300000);await assert.rejects(h.provider.verify(third.challengeId,'123456'));
});

test('parallel successful provider responses mint at most one verified identity',async()=>{
  const h=harness();const item=await h.provider.request('+919876543210');
  const results=await Promise.allSettled([h.provider.verify(item.challengeId,'123456'),h.provider.verify(item.challengeId,'123456')]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
});

test('missing configuration and upstream failures fail closed without private messages',async()=>{
  const h=harness();h.fail();
  await assert.rejects(h.provider.request('+919876543210'),error=>{
    assert.equal((error as {status:number}).status,503);
    assert.doesNotMatch(String(error),/private/);return true;
  });
  const store={} as PhoneChallengeStore;
  assert.throws(()=>new Msg91OtpProvider('','template',store),{status:503});
  assert.throws(()=>new Msg91OtpProvider('key','',store),{status:503});
});
