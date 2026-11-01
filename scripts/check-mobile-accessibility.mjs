import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import ts from 'typescript';
const interactive=new Set(['Pressable','TouchableOpacity','TouchableHighlight','TouchableWithoutFeedback','TouchableNativeFeedback']);
const issues=[];
function scan(directory){
  for(const entry of readdirSync(directory,{withFileTypes:true})){
    const path=join(directory,entry.name);
    if(entry.isDirectory()){scan(path);continue;}
    scanFile(path);
  }
}
function scanFile(path){
    if(!/\.[jt]sx$/.test(path))return;
    const source=readFileSync(path,'utf8');const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    function visit(node){
      if((ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))&&interactive.has(node.tagName.getText(file))){
        const attributes=node.attributes.properties.filter(ts.isJsxAttribute);
        const names=new Set(attributes.map(attribute=>attribute.name.getText(file)));
        const hidden=attributes.some(attribute=>attribute.name.getText(file)==='accessible'&&attribute.initializer&&ts.isJsxExpression(attribute.initializer)&&attribute.initializer.expression?.kind===ts.SyntaxKind.FalseKeyword);
        if(!hidden&&(!names.has('accessibilityRole')||(!names.has('accessibilityLabel')&&!names.has('accessibilityLabelledBy')))){
          const {line}=file.getLineAndCharacterOfPosition(node.getStart(file));
          issues.push(`${path}:${line+1} ${!names.has('accessibilityRole')?'missing role ':''}${!names.has('accessibilityLabel')&&!names.has('accessibilityLabelledBy')?'missing label':''}`.trim());
        }
      }
      ts.forEachChild(node,visit);
    }
    visit(file);
}
scanFile('mobile/App.tsx');scan('mobile/src');scan('mobile/app');
if(issues.length){console.error(issues.join('\n'));console.error(`${issues.length} interactive accessibility findings. This static scan does not replace device testing.`);process.exitCode=1;}
else console.log('PASS: all scanned native pressables have a role and label. Manual VoiceOver/TalkBack testing remains required.');
