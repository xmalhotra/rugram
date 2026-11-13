import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {containsCode} from './source-assertions';
test('saved flows have removal actions in details',()=>{
 const action=readFileSync('mobile/src/FlowHomeAction.tsx','utf8');
 assert.match(action.replaceAll(/\s/g,''),/added&&\(?<Pressable/);assert.match(action,/onPress=\{onRemove\}/);assert.match(action,/Remove from Home/);
 const app=readFileSync('mobile/App.tsx','utf8');
 for(const fragment of ['function removeFlow(flow:HabitFlow)',"text:'Keep flow',style:'cancel'","action:'flow',id:flow.id,enabled:false",'onRemove={()=>removeFlow(selectedFlow)}'])containsCode(app,fragment);
});
