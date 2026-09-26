/**
 * Turn API/Supabase errors into copy a user can act on. Every raw error
 * that reaches toast.error() should route through this — nothing says
 * "half-built" like `PGRST116: JWT expired` in a red bubble.
 *
 * Codes come from Supabase/Postgrest, plus a small map of message-string
 * matches for auth errors where the code isn't surfaced.
 */

const CODE_MAP: Record<string, string> = {
  // Postgrest / Supabase Storage
  '23505': 'That already exists.',
  '23503': "That link can't be made — one of the connected items is missing.",
  '23502': 'A required field is missing.',
  '42501': "You don't have permission for that.",
  '42P01': 'That data isn\'t set up yet. Ping us if this keeps happening.',
  'PGRST116': 'Your session expired. Sign in again to continue.',
  'PGRST301': 'Session expired. Sign in again.',
};

// Message-substring fallbacks for auth errors where the code isn't in err.code.
const PATTERNS: Array<[RegExp, string]> = [
  [/invalid login credentials/i,      "That email or password isn't right."],
  [/email not confirmed/i,            'Check your inbox to confirm your email first.'],
  [/user already registered/i,        'An account with that email already exists. Sign in instead.'],
  [/duplicate key/i,                  'That already exists.'],
  [/password should be at least/i,    'Password is too short — use at least 6 characters.'],
  [/rate limit/i,                     "Too many tries. Give it a minute and try again."],
  [/network|failed to fetch/i,        "Can't reach the server. Check your connection."],
  [/JWT|jwt expired/i,                'Your session expired. Sign in again to continue.'],
  [/not authenticated/i,              'Sign in to continue.'],
  [/permission denied|row-level security/i, "You don't have permission for that."],
];

/**
 * Return a user-safe string for any thrown value.
 *
 * ponytail: single flat map, add entries when a user reports a confusing
 * error. Don't pre-map every code in Postgrest.
 */
export function humanizeError(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (!err) return fallback;

  // Supabase / PostgrestError shape
  const anyErr = err as { code?: string; message?: string; error_description?: string };
  const code = anyErr.code;
  if (code && CODE_MAP[code]) return CODE_MAP[code];

  const msg = anyErr.message || anyErr.error_description || (typeof err === 'string' ? err : '');
  if (msg) {
    for (const [re, human] of PATTERNS) {
      if (re.test(msg)) return human;
    }
    // If the string is short and looks like a sentence, pass it through.
    if (msg.length < 120 && /[a-z]/i.test(msg) && !/^\{|^\[/.test(msg)) return msg;
  }
  return fallback;
}
