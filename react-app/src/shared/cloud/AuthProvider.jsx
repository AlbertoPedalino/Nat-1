import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isCloudConfigured, usernameToEmail } from './supabaseClient.js';

const AuthContext = createContext(null);

// status: 'loading' | 'anon' | 'authed'  (always 'anon' when cloud unconfigured)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(isCloudConfigured() ? 'loading' : 'anon');

  const loadProfile = useCallback(async (uid) => {
    if (!supabase || !uid) { setProfile(null); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, role')
      .eq('id', uid)
      .maybeSingle();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const u = data?.session?.user || null;
      setUser(u);
      setStatus(u ? 'authed' : 'anon');
      if (u) loadProfile(u.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUser(u);
      setStatus(u ? 'authed' : 'anon');
      if (u) loadProfile(u.id); else setProfile(null);
    });

    return () => { alive = false; sub?.subscription?.unsubscribe(); };
  }, [loadProfile]);

  const signIn = useCallback(async (username, password) => {
    if (!supabase) throw new Error('Online features not configured.');
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (username, password) => {
    if (!supabase) throw new Error('Online features not configured.');
    const { error } = await supabase.auth.signUp({
      email: usernameToEmail(username),
      password,
      options: { data: { username: String(username || '').trim() } },
    });
    if (error) throw error;
    // With email confirmation disabled the session is created immediately.
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value = {
    cloudEnabled: isCloudConfigured(),
    status,
    user,
    profile,
    username: profile?.username || user?.user_metadata?.username || null,
    role: profile?.role || (user ? 'player' : null),
    isGm: profile?.role === 'gm',
    signIn,
    signUp,
    signOut,
    refreshProfile: () => loadProfile(user?.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>.');
  return ctx;
}
