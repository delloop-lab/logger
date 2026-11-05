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

function isDuplicateEmailError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already exists') ||
    m.includes('email address is already') ||
    m.includes('duplicate') ||
    (m.includes('already') && m.includes('email'))
  );
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured yet.' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
  });

  if (error) {
    if (isDuplicateEmailError(error.message)) {
      return {
        ok: false,
        message: 'That email is already registered. Sign in instead, or use a different email.',
      };
    }
    return { ok: false, message: error.message };
  }
  if (!data.user) {
    return { ok: false, message: 'Sign up did not return a user.' };
  }

  // Supabase may return a user with no identities when the email is already taken
  // (avoids leaking existence in some project configs). Treat as duplicate.
  if (!data.user.identities || data.user.identities.length === 0) {
    return {
      ok: false,
      message: 'That email is already registered. Sign in instead, or use a different email.',
    };
  }

  // Email confirmation may be required depending on project Auth settings.
  if (!data.session) {
    return {
      ok: true,
      user: data.user,
      message: 'Check your email to confirm your address, then sign in.',
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
