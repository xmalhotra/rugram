/**
 * The time zone a member's days are counted in, from the country code of the mobile number they sign in with.
 * Qram starts in India, so +91 (UTC+5:30) is the first and the default. A country with several zones uses the one
 * most of its people live in; a member there can be off by an hour or two near midnight until Qram stores a
 * zone per member. Offsets are minutes ahead of UTC, in standard time (no daylight saving).
 */
export const defaultOffsetMinutes = 330;

const offsets: Record<string, number> = {
  '91': 330, // India
  '977': 345, // Nepal
  '94': 330, // Sri Lanka
  '880': 360, // Bangladesh
  '92': 300, // Pakistan
  '971': 240, // UAE
  '966': 180, // Saudi Arabia
  '974': 180, // Qatar
  '965': 180, // Kuwait
  '968': 240, // Oman
  '973': 180, // Bahrain
  '65': 480, // Singapore
  '60': 480, // Malaysia
  '62': 420, // Indonesia (Jakarta)
  '66': 420, // Thailand
  '84': 420, // Vietnam
  '63': 480, // Philippines
  '852': 480, // Hong Kong
  '86': 480, // China
  '81': 540, // Japan
  '82': 540, // South Korea
  '61': 600, // Australia (Sydney)
  '64': 720, // New Zealand
  '44': 0, // United Kingdom
  '353': 0, // Ireland
  '49': 60, // Germany
  '33': 60, // France
  '34': 60, // Spain
  '39': 60, // Italy
  '31': 60, // Netherlands
  '46': 60, // Sweden
  '41': 60, // Switzerland
  '27': 120, // South Africa
  '254': 180, // Kenya
  '234': 60, // Nigeria
  '20': 120, // Egypt
  '7': 180, // Russia (Moscow)
  '1': -300, // United States and Canada (Eastern)
  '52': -360, // Mexico
  '55': -180, // Brazil (São Paulo)
};

/** The dialling code a number starts with, longest match first, or null for an unknown one. */
export function dialCode(phoneE164: string | null | undefined) {
  const digits = /^\+([1-9][0-9]{7,14})$/.exec(phoneE164 ?? '')?.[1];
  if (!digits) return null;
  for (const length of [3, 2, 1]) {
    const code = digits.slice(0, length);
    if (code in offsets) return code;
  }
  return null;
}

/** Minutes ahead of UTC for this member's days. No number, or an unlisted country, counts in India time. */
export function offsetForPhone(phoneE164: string | null | undefined) {
  const code = dialCode(phoneE164);
  return code ? (offsets[code] ?? defaultOffsetMinutes) : defaultOffsetMinutes;
}
