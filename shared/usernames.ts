export const usernamePrefix = 'q_';

/** Name parts nobody can claim. Matched after q_, in lowercase. */
export const reservedUsernames = [
  'admin',
  'administrator',
  'support',
  'help',
  'helpdesk',
  'official',
  'team',
  'staff',
  'security',
  'moderator',
  'mod',
  'system',
  'root',
  'null',
  'undefined',
  'api',
  'app',
  'www',
  'mail',
  'email',
  'about',
  'terms',
  'privacy',
  'legal',
  'billing',
  'payments',
  'settings',
  'account',
  'profile',
  'login',
  'signup',
  'search',
  'explore',
  'flows',
  'picks',
  'events',
  'community',
  'following',
  'followers',
  'qram',
  'qramapp',
  'rugram',
  'kram',
  'nike',
  'adidas',
  'puma',
  'reebok',
  'hyrox',
  'crossfit',
  'ironman',
  'google',
  'apple',
  'meta',
  'instagram',
  'facebook',
  'whatsapp',
  'youtube',
  'netflix',
  'amazon',
  'flipkart',
  'zepto',
  'swiggy',
  'zomato',
  'cult',
  'cultfit',
  'strava',
  'garmin',
  'fitbit',
  'decathlon',
  'myprotein',
  'muscleblaze',
  'optimum',
  'openai',
] as const;

const reserved = new Set<string>(reservedUsernames);

/** Trim, lowercase, drop one leading @, and add q_ when only the name part was typed. */
export function normalizeUsername(input: string) {
  const trimmed = input.trim().toLowerCase().replace(/^@/, '');
  return trimmed.startsWith(usernamePrefix) ? trimmed : `${usernamePrefix}${trimmed}`;
}

/** Null when the username is allowed, otherwise one sentence for the person. */
/**
 * The q_ form of any existing handle. Mirrors migration 032. It doesn't check the reserved
 * list: this converts accounts that already exist, and doesn't let anyone choose a name.
 */
export function usernameFromHandle(handle: string) {
  let base = handle
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/^q_/, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!/^[a-z]/.test(base)) base = `u${base}`;
  if (base.length < 4) base = `${base}user`;
  return `${usernamePrefix}${base.slice(0, 18).replace(/_+$/, '')}`;
}

export function usernameProblem(input: string) {
  const username = normalizeUsername(input);
  const name = username.slice(usernamePrefix.length);
  if (!/^q_[a-z0-9_]*$/.test(username)) return 'Use only letters, numbers and underscores.';
  if (name.length < 4) return 'Use at least 4 characters after q_.';
  if (name.length > 18) return 'Use at most 18 characters after q_.';
  if (name.includes('__')) return "Don't use a double underscore.";
  if (name.endsWith('_')) return "Don't end the name with an underscore.";
  if (!/^[a-z]/.test(name)) return 'Start the name with a letter.';
  if (
    reserved.has(name) ||
    name.startsWith('qram') ||
    name.startsWith('official') ||
    name.includes('admin') ||
    name.includes('support')
  )
    return 'That username is reserved.';
  return null;
}

export function usernameClientError(message: string) {
  return (
    message === 'Use only letters, numbers and underscores.' ||
    message === 'Use at least 4 characters after q_.' ||
    message === 'Use at most 18 characters after q_.' ||
    message === "Don't use a double underscore." ||
    message === "Don't end the name with an underscore." ||
    message === 'Start the name with a letter.' ||
    message === 'That username is reserved.' ||
    message === 'That username is taken.' ||
    message.startsWith('You can change your username again on ')
  );
}

export function peopleSearchError(message: string) {
  return message === 'Type at least 2 characters.';
}

const cooldownMs = 30 * 24 * 60 * 60 * 1000;
const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** A generated q_member… handle, or any handle that predates these rules. */
export function leavesAssignedHandle(handle: string) {
  const value = handle.trim().toLowerCase().replace(/^@/, '');
  if (/^q_member[a-z0-9]+$/.test(value) && usernameProblem(value) === null) return true;
  if (!value.startsWith(usernamePrefix)) return true;
  return usernameProblem(value) !== null;
}

export function usernameCooldownMessage(changedAt: string | null, now = new Date()) {
  if (!changedAt) return null;
  const start = new Date(changedAt);
  if (Number.isNaN(start.getTime())) return null;
  const next = new Date(start.getTime() + cooldownMs);
  if (now.getTime() >= next.getTime()) return null;
  return `You can change your username again on ${next.getUTCDate()} ${months[next.getUTCMonth()]} ${next.getUTCFullYear()}.`;
}

export type UsernameRecord = { id: string; handle: string; handleChangedAt: string | null };

/** Shared by demo mode and the database so both follow one set of rules. */
export function planUsernameChange(
  record: UsernameRecord,
  input: string,
  others: { id: string; handle: string }[],
  now = new Date(),
) {
  const problem = usernameProblem(input);
  if (problem) return { ok: false as const, error: problem };
  const handle = normalizeUsername(input);
  if (record.handle.trim().toLowerCase() === handle)
    return { ok: true as const, changed: false as const, handle, handleChangedAt: record.handleChangedAt };
  if (others.some(person => person.id !== record.id && person.handle.toLowerCase() === handle))
    return { ok: false as const, error: 'That username is taken.' };
  // Leaving a generated or pre-rule handle is always allowed. The change still
  // starts the 30-day window so the next one waits.
  if (!leavesAssignedHandle(record.handle)) {
    const blocked = usernameCooldownMessage(record.handleChangedAt, now);
    if (blocked) return { ok: false as const, error: blocked };
  }
  return { ok: true as const, changed: true as const, handle, handleChangedAt: now.toISOString() };
}

/** q_member plus a short slice of the id. 12 hex characters when the shorter ones are taken. */
export function memberHandle(id: string, taken?: (handle: string) => boolean) {
  const compact = id.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const length of [8, 10, 12]) {
    const handle = `${usernamePrefix}member${compact.padEnd(length, '0').slice(0, length)}`;
    if (usernameProblem(handle)) continue;
    if (!taken?.(handle)) return handle;
  }
  throw new Error('Could not assign a username.');
}

/** Escape LIKE wildcards so a typed % or _ matches that character. */
export function sqlLikeLiteral(value: string) {
  return value.replace(/[\\%_]/g, char => `\\${char}`);
}

export type PersonHit = { id: string; name: string; handle: string; avatarUrl: string | null };

export type DirectoryPerson = PersonHit & {
  disabled?: boolean;
  phone?: string | null;
  email?: string | null;
  role?: string;
};

/** Case-insensitive name or handle search. Prefix matches come first. At most 20. */
export function searchPeopleList(searcherId: string, query: string, people: DirectoryPerson[]): PersonHit[] {
  const term = query.trim().replace(/^@/, '');
  if (term.length < 2) throw new Error('Type at least 2 characters.');
  const needle = term.toLowerCase();
  const hits = people.filter(person => {
    if (person.disabled || person.id === searcherId) return false;
    return person.name.toLowerCase().includes(needle) || person.handle.toLowerCase().includes(needle);
  });
  hits.sort((a, b) => {
    const rank = (person: DirectoryPerson) =>
      person.name.toLowerCase().startsWith(needle) || person.handle.toLowerCase().startsWith(needle) ? 0 : 1;
    return rank(a) - rank(b) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
  return hits.slice(0, 20).map(person => ({
    id: person.id,
    name: person.name,
    handle: person.handle,
    avatarUrl: person.avatarUrl ?? null,
  }));
}
