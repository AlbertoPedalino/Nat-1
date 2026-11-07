import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase, isCloudConfigured, usernameToEmail } from '../supabaseClient.js';

const AuthContext = createContext(null);

// status: 'loading' | 'anon' | 'authed'  (always 'anon' when cloud unconfigured)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState(isCloudConfigured() ? 'loading' : 'anon');
  const profileRequestRef = useRef(0);

  const loadProfile = useCallback(async (uid) => {
    const request = ++profileRequestRef.current;
    if (!supabase || !uid) { setProfile(null); return; }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, role')
        .eq('id', uid)
        .maybeSingle();
      if (request === profileRequestRef.current) setProfile(data || null);
    } catch (_) {
      if (request === profileRequestRef.current) setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    let authEventReceived = false;
    let profileTimer;
    let currentUserId = null;

    const applySession = (session) => {
      if (!alive) return;
      const u = session?.user || null;
      clearTimeout(profileTimer);
      if (currentUserId !== (u?.id || null)) {
        currentUserId = u?.id || null;
        profileRequestRef.current += 1;
        setProfile(null);
      }
      setUser(u);
      setStatus(u ? 'authed' : 'anon');
      // Auth notifications can run while the session refresh holds its lock.
      // Start cloud requests in a later task, after the callback has returned.
      if (u) profileTimer = setTimeout(() => { if (alive) loadProfile(u.id); }, 0);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!authEventReceived) applySession(data?.session);
    }).catch(() => {
      if (!authEventReceived) applySession(null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      applySession(session);
    });

    return () => {
      alive = false;
      clearTimeout(profileTimer);
      profileRequestRef.current += 1;
      sub?.subscription?.unsubscribe();
    };
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
    // Cloud configured and signed in: what every cloud read, write and channel waits for.
    cloudActive: isCloudConfigured() && status === 'authed',
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
