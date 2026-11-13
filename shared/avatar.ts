/** Decoded profile photos stay small enough to store and send as JSON. */
export const avatarMaxBytes = 600 * 1024;
export const avatarMimes = ['image/jpeg', 'image/png'] as const;
export type AvatarMime = (typeof avatarMimes)[number];

export function acceptedAvatarMime(value: unknown): AvatarMime | null {
  return value === 'image/jpeg' || value === 'image/png' ? value : null;
}

/** JPEG starts FF D8 FF. PNG starts 89 50 4E 47. */
export function avatarMagic(bytes: Uint8Array): AvatarMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'image/jpeg';
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return 'image/png';
  return null;
}

export function avatarWithinLimit(bytes: Uint8Array) {
  return bytes.byteLength > 0 && bytes.byteLength <= avatarMaxBytes;
}

export function validateAvatar(
  mime: unknown,
  bytes: Uint8Array,
): { ok: true; mime: AvatarMime } | { ok: false; error: string } {
  const declared = acceptedAvatarMime(mime);
  if (!declared) return { ok: false, error: 'Use a JPEG or PNG photo.' };
  if (!avatarWithinLimit(bytes))
    return { ok: false, error: 'Choose a photo that is 600 KB or smaller.' };
  if (avatarMagic(bytes) !== declared) return { ok: false, error: 'That file is not a valid JPEG or PNG.' };
  return { ok: true, mime: declared };
}

export function decodeAvatarData(data: unknown): Uint8Array | null {
  if (typeof data !== 'string' || !data) return null;
  const compact = data.replace(/\s+/g, '');
  if (compact.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return null;
  const bytes = Buffer.from(compact, 'base64');
  return bytes.byteLength ? bytes : null;
}
