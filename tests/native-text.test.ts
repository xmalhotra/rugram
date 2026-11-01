import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const textContainers=new Set(['Text','Badge','ReasonLine','NativeTabs.Trigger.Label']);
function rawText(source:string,file='component.tsx'){
  const root=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);const errors:string[]=[];
  function visit(node:ts.Node){
    if(ts.isJsxText(node)){
      const parent=node.parent;const tag=ts.isJsxElement(parent)?parent.openingElement.tagName.getText(root):'fragment';
      // A single inline space is a real React child; indentation/newlines are not.
      if(!textContainers.has(tag)&&(/\S/.test(node.text)||(!/[\r\n]/.test(node.text)&&node.text.length>0)))errors.push(`${file}:${root.getLineAndCharacterOfPosition(node.pos).line+1} ${tag}: ${JSON.stringify(node.text)}`);
    }
    ts.forEachChild(node,visit);
  }
  visit(root);return errors;
}
function files(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):entry.name.endsWith('.tsx')?[path.join(dir,entry.name)]:[]);}
test('native UI contains no raw text or inline whitespace outside text containers',()=>{
  const problems=['mobile/App.tsx',...files('mobile/src'),...files('mobile/app')].flatMap(file=>rawText(readFileSync(file,'utf8'),file));
  assert.deepEqual(problems,[]);
});
test('native text guard catches the inline-space regression and permits proper text',()=>{
  assert.equal(rawText('<View><Text>First</Text> <Text>Second</Text></View>').length,1);
  assert.equal(rawText('<View>Hello</View>').length,1);
  assert.equal(rawText('<View>\n <Text>First second</Text>\n</View>').length,0);
});
