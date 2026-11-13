import test from 'node:test';
import assert from 'node:assert/strict';
import {budgetCeiling,budgetFromPosition} from '../shared/pick-budget';
test('budget slider ceiling includes every recorded price without an arbitrary 5000 cap',()=>{
  assert.equal(budgetCeiling([1499,2999]),3000);
  assert.ok(budgetCeiling([150000,259999])>=259999);
  assert.equal(budgetCeiling([]),5000);
  assert.equal(budgetCeiling([NaN,Infinity,-1]),5000);
});
test('price slider is bounded and monotonic with more precision at lower prices',()=>{
  const ceiling=260000;
  assert.equal(budgetFromPosition(0,ceiling),0);
  assert.equal(budgetFromPosition(100,ceiling),ceiling);
  assert.equal(budgetFromPosition(-1,ceiling),0);
  assert.equal(budgetFromPosition(200,ceiling),ceiling);
  let previous=0;for(let position=0;position<=100;position++){const amount=budgetFromPosition(position,ceiling);assert.ok(amount>=previous&&amount<=ceiling);previous=amount;}
  assert.ok(budgetFromPosition(50,ceiling)<ceiling/2);
});
