import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import test from 'node:test';
import { howToLoopIds } from '../shared/how-to-loops';

test('the shared loop list matches the frames on disk (rerun scripts/register-how-to-frames.mjs if not)', () => {
  const files = new Set(readdirSync('mobile/assets/howto'));
  const ids = new Set([...files].map(name => /^(.*)-\d+\.jpg$/.exec(name)?.[1]).filter((id): id is string => Boolean(id)));
  const onDisk = [...ids].filter(id => files.has(`${id}-1.jpg`) && files.has(`${id}-2.jpg`)).sort();
  assert.deepEqual([...howToLoopIds].sort(), onDisk);
});
