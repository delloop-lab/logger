import { getSupabase } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export type AuthResult =
  | { ok: true; user: User; message: string }
  | { ok: false; message: string };

export async function getCurrentSession(): Promise<Session | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured yet.' };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { ok: false, message: error.message };
  }
  if (!data.user) {
    return { ok: false, message: 'Sign up did not return a user.' };
  }

  // Email confirmation may be required depending on project Auth settings.
  if (!data.session) {
    return {
      ok: true,
      user: data.user,
      message: 'Account created. Check your email to confirm, then sign in.',
    };
  }

  return { ok: true, user: data.user, message: 'Account created and signed in.' };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured yet.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, message: error.message };
  }
  if (!data.user) {
    return { ok: false, message: 'Sign in did not return a user.' };
  }

  return { ok: true, user: data.user, message: 'Signed in.' };
}

export async function signOut(): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured yet.' };
  }
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
