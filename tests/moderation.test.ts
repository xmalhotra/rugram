import assert from 'node:assert/strict';
import test from 'node:test';
import {reviewReason} from '../shared/moderation';
test('rejection reasons are bounded and require an explicit code',()=>{
  assert.deepEqual(reviewReason('  Please verify the source.  ','sources'),{reviewNote:'Please verify the source.',reviewCode:'sources'});
  for(const [note,code]of [['','sources'],['tiny','other'],['x'.repeat(501),'sources'],['Valid reason','invented']])assert.throws(()=>reviewReason(note,code));
});
