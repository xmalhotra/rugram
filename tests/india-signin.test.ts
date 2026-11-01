import assert from 'node:assert/strict';
import test from 'node:test';
import {indianMobileInput,indianMobilePhone} from '../shared/auth';

test('India sign-in keeps +91 outside the editable national number',()=>{
  assert.equal(indianMobileInput('98765 43210'),'9876543210');
  assert.equal(indianMobileInput('+91 98765 43210'),'9876543210');
  assert.equal(indianMobilePhone('9876543210'),'+919876543210');
  for(const value of ['','98765','1234567890','+12025550101','919876543210'])assert.equal(indianMobilePhone(value),null);
  assert.equal(indianMobileInput('9876543210123'),'9876543210');
});
