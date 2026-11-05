import { getSupabase } from '@/lib/supabase/client';

const SESSION_KEY = 'logger_hit_session_v1';

function sessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `s-${Date.now()}`;
  }
}

/** Fire-and-forget page/tab hit for Admin analytics. */
export async function recordPageHit(tab: string, path = '/'): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id ?? null;
    // Only persist hits for signed-in sessions (RLS insert policy)
    if (!userId) return;

    await supabase.from('page_hits').insert({
      path,
      tab,
      user_id: userId,
      session_id: sessionId(),
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 280) : null,
    });
  } catch {
    /* analytics must never break the app */
  }
}
