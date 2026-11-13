import test from 'node:test';
import assert from 'node:assert/strict';
import {stepStory,type StoryGroup} from '../shared/home-feed';
const groups=[{id:'one',cards:[{id:'a'},{id:'b'}]},{id:'empty',cards:[]},{id:'two',cards:[{id:'c'}]}] as StoryGroup[];
test('right taps advance cards, then the next nonempty group, then close at the endpoint',()=>{
  assert.deepEqual(stepStory(groups,'one',0,1),{groupId:'one',index:1});
  assert.deepEqual(stepStory(groups,'one',1,1),{groupId:'two',index:0});
  assert.equal(stepStory(groups,'two',0,1),null);
});
test('left taps go back across groups without negative positions or wrapping the first story',()=>{
  assert.deepEqual(stepStory(groups,'two',0,-1),{groupId:'one',index:1});
  assert.deepEqual(stepStory(groups,'one',1,-1),{groupId:'one',index:0});
  assert.deepEqual(stepStory(groups,'one',0,-1),{groupId:'one',index:0});
  assert.equal(stepStory(groups,'removed',0,1),null);
  assert.equal(stepStory([], 'one',0,1),null);
});
