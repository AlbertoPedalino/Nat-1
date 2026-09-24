import { createClient } from '@supabase/supabase-js';
import {
  createRealtimeStats, exposeRealtimeDiagnostics, realtimeDebugRequested, realtimeDiagnosticsOptions,
} from './sync/realtimeStats.js';

// Cloud sync is OPTIONAL. If the env vars are missing the whole feature stays
// dark and the app keeps working 100% locally (localStorage only).
const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EMAIL_DOMAIN = import.meta.env.VITE_AUTH_EMAIL_DOMAIN || 'players.gmboard.local';

export function isCloudConfigured() {
  return Boolean(URL && ANON_KEY);
}

// Traffic counters, only when explicitly requested (see realtimeStats.js).
const diagnostics = typeof window !== 'undefined' && isCloudConfigured() && realtimeDebugRequested({
  storage: window.localStorage, session: window.sessionStorage, search: window.location?.search,
}) ? createRealtimeStats() : null;

// Single shared client (or null when unconfigured). Persists the session in
// localStorage so a player stays logged in across reloads.
export const supabase = isCloudConfigured()
  ? createClient(URL, ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
      ...realtimeDiagnosticsOptions(diagnostics, (...args) => fetch(...args)),
    })
  : null;

if (diagnostics) exposeRealtimeDiagnostics(diagnostics, supabase, window);

// Supabase Auth needs an email. Players only type a username, so we map it to a
// stable synthetic email. Same username always yields the same email.
export function usernameToEmail(username) {
  const clean = String(username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${clean}@${EMAIL_DOMAIN}`;
}

export function requireClient() {
  if (!supabase) throw new Error('Online features not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
  return supabase;
}
