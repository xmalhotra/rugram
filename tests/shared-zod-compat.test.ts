import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// The app bundles shared/ with its own zod 3, while the server has zod 4. Helpers that only zod 4 has
// (z.uuid(), z.email() and the like) crash the app the moment the file loads.
const zod4Only = /\bz\.(uuid|guid|email|url|httpUrl|hostname|emoji|base64|base64url|hex|jwt|nanoid|cuid|cuid2|ulid|ipv4|ipv6|cidrv4|cidrv6|e164|iso|int|int32|uint32|float32|float64|int64|uint64|stringbool|strictObject|looseObject|templateLiteral|json|file|success|xor)\(/;

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test('shared code uses only zod calls that both zod 3 (app) and zod 4 (server) have', () => {
  const found = files(join(import.meta.dirname, '..', 'shared')).flatMap(path =>
    readFileSync(path, 'utf8')
      .split('\n')
      .flatMap((line, index) => (zod4Only.test(line) ? [`${path}:${index + 1}: ${line.trim()}`] : [])),
  );
  assert.deepEqual(found, []);
});
