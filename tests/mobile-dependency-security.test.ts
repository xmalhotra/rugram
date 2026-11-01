import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const mobileRequire = createRequire(new URL('../mobile/package.json', import.meta.url));
const xcodeRequire = createRequire(mobileRequire.resolve('xcode'));

test('SDK 58 Xcode uses native crypto rather than the legacy UUID dependency', () => {
  const metadata = mobileRequire('xcode/package.json');
  assert.match(metadata.version, /^4\./);
  assert.equal(metadata.dependencies?.uuid, undefined);
  const source = readFileSync(xcodeRequire.resolve('./lib/pbxProject'), 'utf8');
  assert.match(source, /crypto\.randomUUID\(\)/);
  assert.doesNotMatch(source, /require\(['"]uuid['"]\)/);
});

test('SDK 58 Xcode project identifiers retain their expected format', () => {
  const project = mobileRequire('xcode').project('unused-test-project.pbxproj');
  project.hash = { project: { objects: {} } };
  const identifiers = new Set(Array.from({ length: 100 }, () => project.generateUuid()));
  assert.equal(identifiers.size, 100);
  for (const id of identifiers) assert.match(id as string, /^[A-F0-9]{24}$/);
});
