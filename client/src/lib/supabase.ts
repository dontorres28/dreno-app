import { createClient } from '@supabase/supabase-js';

/**
 * Supabase config with public fallbacks.
 *
 * The Supabase anon key is designed to be shipped in browser bundles — it's
 * public by definition. Hardcoding it as a fallback prevents the app from
 * blank-screening when a build host (Vercel, Netlify, etc.) forgets to
 * inject VITE_* env vars.
 *
 * To override for a different Supabase project, set VITE_SUPABASE_URL and
 * VITE_SUPABASE_ANON_KEY in the host's environment or in client/.env.production.
 */
const FALLBACK_URL = 'https://rsoncepevfkwthozudkx.supabase.co';
const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzb25jZXBldmZrd3Rob3p1ZGt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0Mjc5NDcsImV4cCI6MjA5ODAwMzk0N30.RCtON-OWtFBv6ACwDZ-CROlUfC0nuFCTWipXeO5iA9M';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_URL;
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || FALLBACK_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
