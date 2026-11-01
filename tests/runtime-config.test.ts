import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {assertRuntimeConfiguration,demoModeEnabled} from '../src/lib/runtime-config';
import {mockOtpAllowed} from '../src/lib/otp';
const database='postgresql://fixture:fixture@127.0.0.1:55432/test_only';
test('missing database never opts into demo mode',()=>{
 for(const NODE_ENV of [undefined,'development','test','production']){
  assert.equal(demoModeEnabled({NODE_ENV}),false);
  assert.throws(()=>assertRuntimeConfiguration({NODE_ENV}),/DATABASE_URL is required/);
 }
 assert.deepEqual(assertRuntimeConfiguration({NODE_ENV:'development',RUGRAM_DEMO_MODE:'true'}),{mode:'demo'});
 assert.deepEqual(assertRuntimeConfiguration({NODE_ENV:'production',RUGRAM_DEMO_MODE:'false',DATABASE_URL:database}),{mode:'database'});
});
test('explicit demo is rejected in every declared deployed environment',()=>{
 for(const markers of [{NODE_ENV:'production'},{NODE_ENV:'production',APP_ENV:'local'},{APP_ENV:'staging'},{APP_ENV:'preview'},{APP_ENV:'production'},{VERCEL_ENV:'preview'},{VERCEL_ENV:'production'}]){
  assert.throws(()=>demoModeEnabled({...markers,RUGRAM_DEMO_MODE:'true',DATABASE_URL:database}),/Demo mode is forbidden/);
  assert.deepEqual(assertRuntimeConfiguration({...markers,RUGRAM_DEMO_MODE:'false',DATABASE_URL:database}),{mode:'database'});
 }
});
test('QRAM_DEMO_MODE is preferred and the older names remain aliases',()=>{
 assert.equal(demoModeEnabled({QRAM_DEMO_MODE:'true'}),true);
 assert.equal(demoModeEnabled({BETTERHABITS_DEMO_MODE:'true'}),true);
 assert.equal(demoModeEnabled({RUGRAM_DEMO_MODE:'true'}),true);
 assert.equal(demoModeEnabled({QRAM_DEMO_MODE:'false',BETTERHABITS_DEMO_MODE:'false',RUGRAM_DEMO_MODE:'false'}),false);
 assert.throws(()=>demoModeEnabled({BETTERHABITS_DEMO_MODE:'false',RUGRAM_DEMO_MODE:'true'}),/disagree/);
 assert.throws(()=>demoModeEnabled({QRAM_DEMO_MODE:'false',RUGRAM_DEMO_MODE:'true'}),/disagree/);
 assert.throws(()=>demoModeEnabled({APP_ENV:'staging',QRAM_DEMO_MODE:'true'}),/Demo mode is forbidden/);
 assert.equal(mockOtpAllowed({QRAM_DEMO_MODE:'true'},true),true);
 assert.equal(mockOtpAllowed({BETTERHABITS_DEMO_MODE:'true',APP_ENV:'staging'},true),false);
});
test('invalid flags and database URLs fail with no credential leakage',()=>{
 assert.throws(()=>demoModeEnabled({RUGRAM_DEMO_MODE:'TRUE'}),/must be true or false/);
 assert.throws(()=>demoModeEnabled({APP_ENV:'stagign'}),/APP_ENV must be/);
 for(const DATABASE_URL of ['   ','not-a-url','https://private-user:private-password@example.test/db']){
  assert.throws(()=>assertRuntimeConfiguration({DATABASE_URL}),error=>error instanceof Error&&!error.message.includes('private-password'));
 }
});
test('Next startup hook fails before serving when configuration is missing or unsafe',()=>{
 const run=(extra:Record<string,string>)=>spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',"const {register}=await import('./src/instrumentation.ts');register();"],{cwd:process.cwd(),encoding:'utf8',env:{...process.env,NODE_ENV:'development',APP_ENV:'local',VERCEL_ENV:'',DATABASE_URL:'',RUGRAM_DEMO_MODE:'',...extra}});
 const missing=run({});assert.notEqual(missing.status,0);assert.match(missing.stderr,/DATABASE_URL is required/);
 const staging=run({APP_ENV:'staging',RUGRAM_DEMO_MODE:'true'});assert.notEqual(staging.status,0);assert.match(staging.stderr,/Demo mode is forbidden/);
 assert.equal(run({RUGRAM_DEMO_MODE:'true'}).status,0);
 assert.equal(run({NODE_ENV:'production',RUGRAM_DEMO_MODE:'false',DATABASE_URL:database}).status,0);
});
