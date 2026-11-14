import { createClient } from '@neon/neon-js/supabase';

// Migrated from Supabase to Neon (Managed Better Auth + Data API). The
// SupabaseAuthAdapter keeps client.auth's Supabase API shape
// (signInWithPassword, signUp, signInWithOAuth, getSession, onAuthStateChange),
// and the Data API keeps client.from(...) working, so the ~40 call sites are
// unchanged. Auth and Data API live on different subdomains, so both URLs are
// passed explicitly rather than derived from one base.
const AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;
const DATA_API_URL = import.meta.env.VITE_NEON_DATA_API_URL as string | undefined;

const FALLBACK_AUTH = 'https://ep-silent-lake-b9kfgqoc.neonauth.c-7.eu-central-1.aws.neon.tech/neondb/auth';
const FALLBACK_DATA = 'https://ep-silent-lake-b9kfgqoc.apirest.c-7.eu-central-1.aws.neon.tech/neondb/rest/v1';

const client = createClient({
  auth: { url: AUTH_URL || FALLBACK_AUTH },
  dataApi: { url: DATA_API_URL || FALLBACK_DATA },
});

// ── Compatibility shims for features not yet migrated ──────────────────────────
// Realtime (supabase.channel) -> Neon Realtime, and Storage (supabase.storage)
// -> Neon Object Storage, are separate services wired in a later slice. Until
// then: channel subscriptions are inert (no live updates, but no crash), and
// uploads fail with a clear message instead of a type error.
// ponytail: swap these for real Neon Realtime + Object Storage next.
const noopChannel = () => {
  const ch: any = {
    on: () => ch, subscribe: () => ch, unsubscribe: () => {},
    track: async () => {}, send: async () => {},
  };
  return ch;
};
const noopStorage = {
  from: (..._a: any[]) => ({
    upload: async (..._a: any[]) => ({ data: null, error: new Error('File uploads are being reconnected. Try again shortly.') }),
    getPublicUrl: (..._a: any[]) => ({ data: { publicUrl: '' } }),
    remove: async (..._a: any[]) => ({ data: null, error: null }),
  }),
};

export const supabase = Object.assign(client, {
  channel: noopChannel,
  removeChannel: () => {},
  storage: noopStorage,
}) as typeof client & {
  channel: (...a: any[]) => any;
  removeChannel: (...a: any[]) => any;
  storage: typeof noopStorage;
};
