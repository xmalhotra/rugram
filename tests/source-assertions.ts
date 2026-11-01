import assert from 'node:assert/strict';
import ts from 'typescript';

/** Wiring checks must survive formatting, quote style and line wrapping. */
function tokens(source:string) {
  const file=ts.createSourceFile('wiring.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const result:string[]=[];
  function visit(node:ts.Node) {
    const children=node.getChildren(file);
    if(children.length){children.forEach(visit);return;}
    if(!node.getWidth(file)||node.kind===ts.SyntaxKind.EndOfFileToken||node.kind===ts.SyntaxKind.CommaToken)return;
    if(node.kind===ts.SyntaxKind.JsxText&&!node.getText(file).trim())return;
    result.push(JSON.stringify([node.kind,ts.isStringLiteral(node)?node.text:node.getText(file)]));
  }
  visit(file);
  return result.join('\n');
}
export function containsCode(source:string,fragment:string) {
  assert.ok(tokens(source).includes(tokens(fragment)),`Missing code fragment: ${fragment}`);
}
