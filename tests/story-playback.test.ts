import test from 'node:test';
import assert from 'node:assert/strict';
import {storyDuration,storyElapsed,storySwipe,swipeStoryGroup} from '../shared/story-playback';
import type {StoryGroup} from '../shared/home-feed';
test('story time is bounded with more reading time for longer copy',()=>{
  assert.equal(storyDuration('Short story'),6000);
  assert.equal(storyDuration(new Array(30).fill('word').join(' ')),9000);
  assert.equal(storyDuration(new Array(500).fill('word').join(' ')),15000);
});
test('paused playback preserves progress and resumes remaining time without overshooting',()=>{
  let elapsed=storyElapsed(0,2000,6000,false);assert.equal(elapsed,2000);
  elapsed=storyElapsed(elapsed,60000,6000,true);assert.equal(elapsed,2000);
  elapsed=storyElapsed(elapsed,3000,6000,false);assert.equal(elapsed,5000);
  assert.equal(storyElapsed(elapsed,2000,6000,false),6000);
  assert.equal(storyElapsed(elapsed,-1000,6000,false),5000);
  assert.equal(storyElapsed(elapsed,NaN,6000,false),5000);
});
test('deliberate horizontal swipes change groups; taps, vertical reading scrolls and jitter do not',()=>{
  assert.equal(storySwipe(-80,5,-0.4),1);assert.equal(storySwipe(90,4,0.4),-1);
  assert.equal(storySwipe(-25,1,-0.7),1);
  for(const [dx,dy,vx] of [[0,0,0],[15,1,0.8],[40,0,0.1],[40,90,0.7],[NaN,0,0]])assert.equal(storySwipe(dx,dy,vx),null);
});
test('swiping skips the rest of the current group and respects both endpoints',()=>{
  const groups=[{id:'a',cards:[{id:'a1'},{id:'a2'}]},{id:'empty',cards:[]},{id:'b',cards:[{id:'b1'}]}] as StoryGroup[];
  assert.deepEqual(swipeStoryGroup(groups,'a',1),{groupId:'b',index:0});
  assert.deepEqual(swipeStoryGroup(groups,'b',-1),{groupId:'a',index:0});
  assert.deepEqual(swipeStoryGroup(groups,'a',-1),{groupId:'a',index:0});
  assert.equal(swipeStoryGroup(groups,'b',1),null);assert.equal(swipeStoryGroup(groups,'gone',1),null);
});
