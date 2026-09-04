import { supabase } from './supabase';

// Fallback so undefined VITE_SERVER_URL doesn't blank-screen the app.
// API calls will 404 gracefully instead of crashing at import time.
const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) || 'https://api.dreno.app';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiPost(path: string, body: unknown) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${SERVER_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Server error');
  return data;
}

export async function apiGet(path: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${SERVER_URL}${path}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Server error');
  return data;
}

export async function adminGet(path: string, password: string) {
  const res = await fetch(`${SERVER_URL}${path}`, {
    headers: { 'x-admin-password': password },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Server error');
  return data;
}

export async function adminPost(path: string, body: unknown, password: string) {
  const res = await fetch(`${SERVER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Server error');
  return data;
}
