import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { movementFrame } from '../shared/movement-viewer';

test('Slider replaces the segments beside the pose count, not in a separate footer row', () => {
  const source = readFileSync('mobile/src/MovementPositionBar.tsx', 'utf8');
  const ast = ts.createSourceFile(
    'viewer.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const elements: ts.JsxElement[] = [];
  function visit(node: ts.Node) {
    if (ts.isJsxElement(node)) elements.push(node);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const positionRow = elements.find(
    element =>
      element.openingElement.tagName.getText(ast) === 'View' &&
      element.children.some(
        child =>
          ts.isJsxElement(child) &&
          child.openingElement.tagName.getText(ast) === 'Text' &&
          child.getText(ast).includes('{frameTerm} {displayedPhase + 1}'),
      ),
  );
  assert.ok(positionRow, 'One horizontal row owns the pose count');
  const row = positionRow.getText(ast);
  assert.match(row, /<Slider/);
  assert.match(row, /controlMode === 'slider'/);
  assert.match(row, /controlMode === 'tilt'/);
  assert.match(row, /StepMarker=\{MovementFrameMarker\}/);
  assert.match(row, /height: (44|hit)/);
  assert.match(row, /disabled=\{disabled\}/, 'Disable scrubbing during a card swipe');
});

test('range stops represent exact frame positions and preserve accessible one-based labels', () => {
  const source = readFileSync('mobile/src/MovementPositionBar.tsx', 'utf8');
  assert.match(source, /minimumValue=\{1\}/);
  assert.match(source, /maximumValue=\{frameCount\}/);
  assert.match(source, /step=\{1\}/);
  assert.match(source, /tapToSeek/);
  assert.match(source, /value=\{movementFrame\(progress, frameCount\) \+ 1\}/);
  assert.match(source, /onProgress\(\(value - 1\) \/ \(frameCount - 1\)\)/);
  for (const count of [4, 5, 6])
    for (let frameNumber = 1; frameNumber <= count; frameNumber++)
      assert.equal(movementFrame((frameNumber - 1) / (count - 1), count) + 1, frameNumber);
  assert.match(source, /stepMarked \? C.lime : C.muted/);
  assert.match(source, /text: `\$\{frameTerm\} \$\{displayedPhase \+ 1\} of \$\{frameCount\}`/);
});
