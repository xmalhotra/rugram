import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import {
  memberHandle,
  normalizeUsername,
  peopleSearchError,
  planUsernameChange,
  reservedUsernames,
  searchPeopleList,
  sqlLikeLiteral,
  usernameClientError,
  usernamePrefix,
  usernameProblem,
  type DirectoryPerson,
} from '../shared/usernames';
import { usernameFromHandle as prefixed } from '../shared/usernames';

test('usernames are q_ plus 4 to 18 letters, numbers or single underscores', () => {
  assert.equal(usernamePrefix, 'q_');
  assert.equal(usernameProblem('q_aarav'), null);
  assert.equal(usernameProblem('q_meera_1'), null);
  assert.equal(normalizeUsername('  @Aarav '), 'q_aarav');
  assert.equal(normalizeUsername('Q_Aarav'), 'q_aarav');
  assert.equal(normalizeUsername('@q_Aarav'), 'q_aarav');
  assert.equal(usernameProblem('ab'), 'Use at least 4 characters after q_.');
  assert.equal(usernameProblem('q_abc'), 'Use at least 4 characters after q_.');
  assert.equal(usernameProblem(`q_${'a'.repeat(19)}`), 'Use at most 18 characters after q_.');
  assert.equal(usernameProblem('q_ab-cd'), 'Use only letters, numbers and underscores.');
  assert.equal(usernameProblem('q_ab.cd'), 'Use only letters, numbers and underscores.');
  assert.equal(usernameProblem('q_ab cd'), 'Use only letters, numbers and underscores.');
  assert.equal(usernameProblem('q_ab__cd'), "Don't use a double underscore.");
  assert.equal(usernameProblem('q_abcd_'), "Don't end the name with an underscore.");
  assert.equal(usernameProblem('q_1abcd'), 'Start the name with a letter.');
  assert.equal(usernameProblem('q_nike'), 'That username is reserved.');
  assert.equal(usernameProblem('q_admin'), 'That username is reserved.');
  assert.equal(usernameProblem('q_teamadmin'), 'That username is reserved.');
  assert.equal(usernameProblem('q_supportx'), 'That username is reserved.');
  assert.equal(usernameProblem('q_qramhq'), 'That username is reserved.');
  assert.equal(usernameProblem('q_officialx'), 'That username is reserved.');
  assert.equal(usernameProblem('q_kram'), 'That username is reserved.');
  assert.ok(reservedUsernames.includes('openai'));
  assert.ok(reservedUsernames.includes('followers'));
  assert.equal(usernameClientError('That username is reserved.'), true);
  assert.equal(usernameClientError('You can change your username again on 6 December 2026.'), true);
  assert.equal(peopleSearchError('Type at least 2 characters.'), true);
});

test('a generated member handle is valid and stays unique', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const first = memberHandle(id);
  const second = memberHandle(id, handle => handle === first);
  assert.equal(usernameProblem(first), null);
  assert.equal(usernameProblem(second), null);
  assert.match(first, /^q_member[a-f0-9]{8}$/);
  assert.notEqual(first, second);
});

test('the first change off an assigned handle is allowed and the next waits 30 days', () => {
  const now = new Date('2026-11-06T00:00:00.000Z');
  const first = planUsernameChange({ id: '1', handle: 'aarav', handleChangedAt: null }, 'q_aarav', [], now);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.changed, true);
  assert.equal(first.handle, 'q_aarav');
  assert.equal(first.handleChangedAt, now.toISOString());
  const same = planUsernameChange(
    { id: '1', handle: 'q_aarav', handleChangedAt: first.handleChangedAt },
    '@q_aarav',
    [],
    now,
  );
  assert.equal(same.ok && same.changed, false);
  const second = planUsernameChange(
    { id: '1', handle: 'q_aarav', handleChangedAt: first.handleChangedAt },
    'q_aarav2',
    [],
    new Date(now.getTime() + 1000),
  );
  assert.equal(second.ok, false);
  if (second.ok) return;
  assert.equal(second.error, 'You can change your username again on 6 December 2026.');
  const taken = planUsernameChange(
    { id: '2', handle: 'q_memberabcd1234', handleChangedAt: now.toISOString() },
    'q_aarav',
    [{ id: '1', handle: 'Q_Aarav' }],
    new Date(now.getTime() + 1000),
  );
  assert.equal(taken.ok, false);
  if (taken.ok) return;
  assert.equal(taken.error, 'That username is taken.');
  const leavingDefault = planUsernameChange(
    { id: '3', handle: 'q_memberabcd1234', handleChangedAt: now.toISOString() },
    'q_chosenname',
    [],
    new Date(now.getTime() + 1000),
  );
  assert.equal(leavingDefault.ok, true);
});

test('people search matches names and handles, keeps wildcards literal, and hides private fields', () => {
  const people: DirectoryPerson[] = [
    { id: 'self', name: 'Searcher', handle: 'q_searcher', avatarUrl: null, phone: '+910000000000', email: 's@x.com', role: 'admin' },
    { id: 'ann', name: 'Ann', handle: 'q_ann', avatarUrl: 'https://cdn.example/ann.jpg', phone: '+91', email: 'ann@x.com', role: 'member' },
    { id: 'joann', name: 'Joann', handle: 'q_joann', avatarUrl: null },
    { id: 'gone', name: 'Annabelle', handle: 'q_hidden', avatarUrl: null, disabled: true, email: 'gone@x.com' },
    { id: 'percent', name: '100% club', handle: 'q_percentclub', avatarUrl: null },
    { id: 'plain', name: '100X club', handle: 'q_xclub', avatarUrl: null },
    { id: 'under', name: 'Under_score', handle: 'q_under_score', avatarUrl: null },
    { id: 'other', name: 'UnderXscore', handle: 'q_underxscore', avatarUrl: null },
  ];
  const found = searchPeopleList('self', '@ann', people);
  assert.deepEqual(
    found.map(person => person.id),
    ['ann', 'joann'],
  );
  assert.deepEqual(Object.keys(found[0]).sort(), ['avatarUrl', 'handle', 'id', 'name']);
  assert.equal(JSON.stringify(found).includes('+91'), false);
  assert.equal(JSON.stringify(found).includes('ann@x.com'), false);
  assert.equal(JSON.stringify(found).includes('member'), false);
  assert.deepEqual(
    searchPeopleList('self', '0%', people).map(person => person.id),
    ['percent'],
  );
  assert.deepEqual(
    searchPeopleList('self', 'r_s', people).map(person => person.id),
    ['under'],
  );
  assert.equal(sqlLikeLiteral('0%_\\'), '0\\%\\_\\\\');
  assert.throws(() => searchPeopleList('self', 'a', people), /Type at least 2 characters/);
  const many: DirectoryPerson[] = Array.from({ length: 25 }, (_, index) => ({
    id: String(index).padStart(2, '0'),
    name: index < 3 ? `Ed ${index}` : `Red ${index}`,
    handle: index < 3 ? `q_ed${index}` : `q_red${index}`,
    avatarUrl: null,
  }));
  const page = searchPeopleList('nobody', 'ed', many);
  assert.equal(page.length, 20);
  assert.deepEqual(
    page.slice(0, 3).map(person => person.id),
    ['00', '01', '02'],
  );
});

test('the mobile routes expose username changes and people search', () => {
  const mobile = readFileSync('src/app/api/mobile/route.ts', 'utf8');
  const community = readFileSync('src/app/api/mobile/community/route.ts', 'utf8');
  const store = readFileSync('src/lib/store.ts', 'utf8');
  assert.match(mobile, /profile-username/);
  assert.match(mobile, /usernameClientError/);
  assert.match(community, /people:/);
  assert.match(community, /searchPeople/);
  assert.match(store, /sqlLikeLiteral/);
  assert.match(store, /ESCAPE '\\\\'/);
  assert.match(store, /memberHandle/);
  const migration = readFileSync('db/migrations/030_username_changes.sql', 'utf8');
  assert.match(migration, /handle_changed_at/);
  assert.match(migration, /lower\(handle\)/);
});

test('demo mode username changes, cooldowns and people search', () => {
  const result = spawnSync(
    process.execPath,
    ['--conditions=react-server', '--import', 'tsx', 'scripts/check-username-demo.ts'],
    {
      encoding: 'utf8',
      env: { ...process.env, QRAM_DEMO_MODE: 'true' },
    },
  );
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('any existing handle converts to a valid q_ username and stays put after that', () => {
  assert.equal(prefixed('aarav'), 'q_aarav');
  assert.equal(prefixed('@LeoMessi'), 'q_leomessi');
  assert.equal(prefixed('al'), 'q_aluser');
  assert.equal(prefixed('john.doe--x'), 'q_john_doe_x');
  assert.equal(prefixed('123'), 'q_u123');
  assert.equal(prefixed('a'.repeat(40)), `q_${'a'.repeat(18)}`);
  assert.equal(prefixed('q_aarav'), 'q_aarav');
  assert.equal(prefixed('member-1a2b3c'), 'q_member_1a2b3c');
});
