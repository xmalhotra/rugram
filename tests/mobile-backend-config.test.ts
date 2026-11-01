import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {containsCode} from './source-assertions';
test('phone development points to the dedicated backend rather than a different project on 3000',()=>{
  const scripts=JSON.parse(readFileSync('package.json','utf8')).scripts;
  assert.equal(scripts['dev:mobile'],'next dev --port 3001');
  const source=readFileSync('mobile/src/api.ts','utf8');
  containsCode(source,"const developmentPort=process.env.EXPO_PUBLIC_API_PORT??'3001'");
  containsCode(source,'`http://${lanHost}:${developmentPort}`');
  assert.match(readFileSync('mobile/.env.example','utf8'),/EXPO_PUBLIC_API_PORT=3001/);
  assert.doesNotMatch(source,/http:\/\/\$\{lanHost\}:3000/);
});
