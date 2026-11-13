import assert from 'node:assert/strict';
import test from 'node:test';
import {formatInr,formatEntryFee,formatEventTime,habitDay,weekKey,checkedAgo} from '../shared/format';
test('Indian currency grouping and unknown prices never invent a zero',()=>{
 assert.equal(formatInr(123456),'₹1,23,456');assert.equal(formatInr(0),'₹0');
 for(const value of [null,undefined,NaN,Infinity])assert.equal(formatInr(value),'Price unknown');
 assert.equal(formatEntryFee(null),'Fee not confirmed');assert.equal(formatEntryFee(0),'Free entry');
});
test('event times and date-only events use IST across UTC midnight',()=>{
 assert.match(formatEventTime('2026-10-16T20:00:00Z'),/17 Oct 2026/);
 assert.match(formatEventTime('2026-10-16T20:00:00Z'),/IST$/);
 assert.equal(formatEventTime('2026-10-17',undefined,true),'17 Oct 2026 IST');
 assert.equal(formatEventTime('invalid'),'Date not confirmed');
});
test('habit and Monday week keys respect the selected time zone',()=>{
 const instant='2026-10-18T20:00:00Z';
 assert.equal(habitDay(instant,'Asia/Kolkata'),'2026-10-19');
 assert.equal(habitDay(instant,'America/Los_Angeles'),'2026-10-18');
 assert.equal(weekKey(instant,'Asia/Kolkata'),'2026-10-19');
 assert.equal(weekKey(instant,'America/Los_Angeles'),'2026-10-12');
 assert.equal(checkedAgo('2026-10-14','2026-10-17'),'Checked 3 days ago');
 assert.equal(checkedAgo('2026-10-18','2026-10-17'),'Source check not confirmed');
});
