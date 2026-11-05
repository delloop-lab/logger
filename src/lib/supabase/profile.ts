import { getSupabase } from '@/lib/supabase/client';
import { isAdminEmail } from '@/lib/admin';

/** Keep profiles row in sync for Admin user list / last seen. */
export async function syncUserProfile(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;

  const email = (user.email || '').trim().toLowerCase() || null;
  const payload: Record<string, unknown> = {
    id: user.id,
    email,
    last_seen_at: new Date().toISOString(),
  };
  if (email && isAdminEmail(email)) {
    payload.is_admin = true;
  }

  await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
}
