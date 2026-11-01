import test from 'node:test';
import assert from 'node:assert/strict';
import {accountChangeNeedsReason,accountChangeSummary,reviewQueueOrder,reviewWaiting,type ContentDocument} from '../shared/admin-content';

const base={name:'A',handle:'a',role:'creator' as const,disabled:false};
test('only role and suspension changes require an audit reason',()=>{
  assert.equal(accountChangeNeedsReason(base,{...base,name:'Renamed',handle:'renamed'}),false);
  assert.equal(accountChangeNeedsReason(base,{...base,role:'member'}),true);
  assert.equal(accountChangeNeedsReason(base,{...base,disabled:true}),true);
  assert.equal(accountChangeSummary({before:base,after:{...base,role:'member',disabled:true}}),'role creator → member · suspended');
  assert.equal(accountChangeSummary({before:base,after:base}),'profile details updated');
});
test('review age is shown in whole days',()=>{
  const now=Date.parse('2026-10-21T12:00:00Z');
  assert.equal(reviewWaiting('2026-10-21T01:00:00Z',now),'submitted today');
  assert.equal(reviewWaiting('2026-10-20T11:00:00Z',now),'waiting 1 day');
  assert.equal(reviewWaiting('2026-10-11T12:00:00Z',now),'waiting 10 days');
  assert.equal(reviewWaiting('not a date',now),'submission date unknown');
});

function item(id:string,extra:Partial<ContentDocument>={}):ContentDocument{
  return {kind:'product',id,title:id,version:0,status:'published',hasDraft:false,data:{},publishedData:{},updatedAt:null,...extra};
}
test('review queue puts pending submissions first, oldest first, and keeps the rest in order',()=>{
  const ordered=reviewQueueOrder([
    item('published-1'),
    item('pending-new',{pending:true,submittedAt:'2026-10-20T00:00:00Z'}),
    item('published-2'),
    item('pending-undated',{pending:true}),
    item('pending-old',{pending:true,submittedAt:'2026-10-01T00:00:00Z'}),
  ]);
  assert.deepEqual(ordered.map(entry=>entry.id),['pending-old','pending-new','pending-undated','published-1','published-2']);
});
