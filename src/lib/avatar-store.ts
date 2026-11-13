import 'server-only';
import { database } from './database';
import { isDemoMode, setDemoUserAvatar } from './store';
import type { PublicUser } from './types';
import { validateAvatar, type AvatarMime } from '../../shared/avatar';

type StoredAvatar = { mime: AvatarMime; data: Buffer };
declare global {
  var qramUserAvatars: Map<string, StoredAvatar> | undefined;
}
const avatars = (globalThis.qramUserAvatars ??= new Map<string, StoredAvatar>());

export function avatarPublicUrl(userId: string, version = Date.now()) {
  return `/api/mobile/avatar/${encodeURIComponent(userId)}?v=${version}`;
}

export async function setAvatar(user: PublicUser, mime: AvatarMime, bytes: Uint8Array) {
  const checked = validateAvatar(mime, bytes);
  if (!checked.ok) throw new Error(checked.error);
  const data = Buffer.from(bytes);
  const url = avatarPublicUrl(user.id);
  if (isDemoMode()) {
    avatars.set(user.id, { mime: checked.mime, data });
    setDemoUserAvatar(user.id, url);
    return url;
  }
  const sql = database();
  await sql.transaction([
    sql`INSERT INTO user_avatars(user_id,mime,data,updated_at) VALUES(${user.id},${checked.mime},${data},now()) ON CONFLICT(user_id) DO UPDATE SET mime=EXCLUDED.mime,data=EXCLUDED.data,updated_at=now()`,
    sql`UPDATE users SET avatar_url=${url} WHERE id=${user.id}`,
  ]);
  return url;
}

export async function removeAvatar(user: PublicUser) {
  if (isDemoMode()) {
    avatars.delete(user.id);
    setDemoUserAvatar(user.id, null);
    return;
  }
  const sql = database();
  await sql.transaction([
    sql`DELETE FROM user_avatars WHERE user_id=${user.id}`,
    sql`UPDATE users SET avatar_url=NULL WHERE id=${user.id}`,
  ]);
}

export async function getAvatar(userId: string): Promise<StoredAvatar | null> {
  if (isDemoMode()) return avatars.get(userId) ?? null;
  const rows = await database()`SELECT mime,data FROM user_avatars WHERE user_id=${userId} LIMIT 1`;
  const row = rows[0];
  const mime = row?.mime === 'image/jpeg' || row?.mime === 'image/png' ? row.mime : null;
  if (!mime || !row?.data) return null;
  const data = Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data as Uint8Array);
  return data.byteLength ? { mime, data } : null;
}
