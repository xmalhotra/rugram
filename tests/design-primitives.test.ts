import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
test('shared primitives are present and icon buttons require a label',()=>{
 const source=readFileSync('mobile/src/design/states.tsx','utf8');
 const parts=readFileSync('mobile/src/design/parts.tsx','utf8');
 assert.match(parts,/export function IconButton\b/);assert.match(parts,/export function IconButton\([^)]*\{\s*label: string;/);
 for(const name of ['Skeleton','EmptyState','Banner','Toast','SearchBar','FilterChips','SegmentedControl','StickyActionBar','StatusPill','WeekStrip','ProgressRing','Avatar','Stepper','ReasonLine'])assert.match(source,new RegExp(`export function ${name}\\b`));
 assert.match(source,/label: string/);assert.doesNotMatch(source,/label\?: string;\s*onPress/);
 assert.match(source,/announceForAccessibility/);assert.match(source,/useSafeAreaInsets/);
 const field=readFileSync('mobile/src/design/components.shared.tsx','utf8');
 assert.doesNotMatch(field,/label===|includes\(label\)|label\.toLowerCase/);
 assert.match(field,/keyboardType/);assert.match(field,/maxLength/);
});
