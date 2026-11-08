import assert from 'node:assert/strict';

process.env.QRAM_DEMO_MODE = 'true';
delete process.env.BETTERHABITS_DEMO_MODE;
delete process.env.RUGRAM_DEMO_MODE;
delete process.env.APP_ENV;
delete process.env.VERCEL_ENV;
(process.env as { NODE_ENV?: string }).NODE_ENV = process.env.NODE_ENV === 'production' ? 'test' : process.env.NODE_ENV;

async function main() {
const { adminUpdatePerson, mockPhoneUser, searchPeople, updateUsername } = await import('../src/lib/store');
const { usernameProblem } = await import('../shared/usernames');

const first = await mockPhoneUser('+919800000091');
const second = await mockPhoneUser('+919800000092');
assert.match(first.handle, /^q_member[a-z0-9]+$/);
assert.equal(usernameProblem(first.handle), null);
assert.notEqual(first.handle, second.handle);

await updateUsername(first, 'q_alphaone');
await assert.rejects(updateUsername(first, 'q_alphatwo'), /You can change your username again on /);
await assert.rejects(updateUsername(second, '@q_alphaone'), /That username is taken/);
await assert.rejects(updateUsername(second, 'ab'), /Use at least 4 characters after q_/);
await assert.rejects(updateUsername(second, 'q_nike'), /That username is reserved/);

const admin = {
  id: 'admin',
  handle: 'admin',
  name: 'Admin',
  role: 'admin' as const,
  avatarUrl: null,
  bio: null,
  instagramUrl: null,
};
await adminUpdatePerson(admin, {
  id: second.id,
  name: 'Percent Person',
  handle: second.handle,
  role: 'member',
  bio: '',
  instagramUrl: '',
  avatarUrl: '',
  disabled: true,
  reason: 'Hide this demo account from search.',
});

const byName = await searchPeople(first, 'percent');
assert.equal(byName.length, 0);
const byHandle = await searchPeople(first, '@q_alpha');
assert.equal(
  byHandle.some(person => person.id === first.id),
  false,
);
assert.equal(byHandle.some(person => person.handle === 'q_alphaone'), false);
await assert.rejects(searchPeople(first, 'a'), /Type at least 2 characters/);

const visible = await mockPhoneUser('+919800000093');
await updateUsername(visible, 'q_zz_qq');
const literal = await searchPeople(first, 'z_q');
assert.deepEqual(
  literal.map(person => person.id),
  [visible.id],
);
assert.deepEqual(Object.keys(literal[0]).sort(), ['avatarUrl', 'handle', 'id', 'name']);
const wildcard = await searchPeople(first, 'z%q');
assert.equal(
  wildcard.some(person => person.id === visible.id),
  false,
);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
