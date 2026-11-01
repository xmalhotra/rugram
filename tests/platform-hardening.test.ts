import test from 'node:test';
import assert from 'node:assert/strict';
import {clientAddress} from '../src/lib/client-address';
import {telemetryEnabled} from '../src/lib/runtime-config';

test('client address ignores spoofed X-Forwarded-For entries left of trusted proxies',()=>{
  const headers=new Headers({'x-forwarded-for':'1.1.1.1, 203.0.113.9'});
  assert.equal(clientAddress(headers,1),'203.0.113.9');
  assert.equal(clientAddress(headers,2),'1.1.1.1');
  assert.equal(clientAddress(headers,3),'unknown');
  assert.equal(clientAddress(headers,0),'direct');
  assert.equal(clientAddress(new Headers(),1),'unknown');
  assert.equal(clientAddress(new Headers({'x-forwarded-for':'<script>'}),1),'unknown');
  assert.equal(clientAddress(new Headers({'x-forwarded-for':'2001:db8::1'}),1),'2001:db8::1');
});

test('telemetry defaults on in deployed environments and honours explicit opt-out',()=>{
  assert.equal(telemetryEnabled({}),false);
  assert.equal(telemetryEnabled({API_TELEMETRY:'true'}),true);
  assert.equal(telemetryEnabled({APP_ENV:'staging'}),true);
  assert.equal(telemetryEnabled({NODE_ENV:'production'}),true);
  assert.equal(telemetryEnabled({VERCEL_ENV:'preview',API_TELEMETRY:'false'}),false);
});

test('legacy cookie-session website APIs are retired with 410 and no internal detail',async()=>{
  const routes={
    timeline:await import('../src/app/api/timeline/route'),
    rugram:await import('../src/app/api/rugram/route'),
    follows:await import('../src/app/api/follows/route'),
    likes:await import('../src/app/api/likes/route'),
    publications:await import('../src/app/api/publications/route'),
    bootstrap:await import('../src/app/api/bootstrap/route'),
    session:await import('../src/app/api/auth/session/route'),
  };
  for(const [name,module] of Object.entries(routes))for(const [method,handler] of Object.entries(module)){
    if(typeof handler!=='function')continue;
    const response=(handler as ()=>Response)();
    assert.equal(response.status,410,`${name} ${method}`);
    assert.deepEqual(await response.json(),{error:'This website API has been retired. Use the Qram mobile app.'});
  }
});
