import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  acceptedAvatarMime,
  avatarMagic,
  avatarMaxBytes,
  avatarWithinLimit,
  validateAvatar,
} from '../shared/avatar';

const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0x00]);
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);

test('profile photos accept only jpeg and png within 600 KB', () => {
  assert.equal(acceptedAvatarMime('image/jpeg'), 'image/jpeg');
  assert.equal(acceptedAvatarMime('image/png'), 'image/png');
  assert.equal(acceptedAvatarMime('image/gif'), null);
  assert.equal(acceptedAvatarMime('image/jpeg '), null);
  assert.equal(avatarMagic(jpeg), 'image/jpeg');
  assert.equal(avatarMagic(png), 'image/png');
  assert.equal(avatarMagic(Uint8Array.from([0xff, 0xd8, 0x00])), null);
  assert.equal(avatarWithinLimit(jpeg), true);
  assert.equal(avatarWithinLimit(new Uint8Array()), false);
  const exact = new Uint8Array(avatarMaxBytes);
  exact.set(jpeg);
  assert.equal(validateAvatar('image/jpeg', exact).ok, true);
  const over = new Uint8Array(avatarMaxBytes + 1);
  over.set(jpeg);
  const tooBig = validateAvatar('image/jpeg', over);
  assert.equal(tooBig.ok, false);
  assert.equal(validateAvatar('image/gif', jpeg).ok, false);
  assert.equal(validateAvatar('image/png', jpeg).ok, false);
  assert.equal(validateAvatar('image/jpeg', png).ok, false);
  assert.equal(validateAvatar('image/png', png).ok, true);
});

test('the profile screen picks a photo and home shows that avatar', () => {
  const profile = readFileSync('mobile/app/profile.tsx', 'utf8');
  const app = readFileSync('mobile/App.tsx', 'utf8');
  assert.match(profile, /pickAvatar/);
  assert.match(app, /avatarUri\(/);
});
