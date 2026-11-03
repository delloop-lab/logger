import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEFAULT_LOCATIONS } from '@/lib/store';

export type SyncResult =
  | { ok: true; locations: string[]; message: string }
  | { ok: false; message: string };

/**
 * Pull this user's storage locations from Supabase.
 * If none exist yet, seed with the app defaults (Workbench, Rack 1, …).
 */
export async function pullStorageLocations(userId: string): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured yet.' };
  }

  const { data, error } = await supabase
    .from('storage_locations')
    .select('name, sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) {
    return { ok: false, message: error.message };
  }

  if (!data || data.length === 0) {
    const seeded = await pushStorageLocations(userId, DEFAULT_LOCATIONS);
    if (!seeded.ok) return seeded;
    return {
      ok: true,
      locations: DEFAULT_LOCATIONS,
      message: 'Seeded default workshop locations to Supabase.',
    };
  }

  return {
    ok: true,
    locations: data.map((row) => row.name),
    message: 'Loaded storage locations from Supabase.',
  };
}

/** Replace this user's storage locations in Supabase with the local list. */
export async function pushStorageLocations(
  userId: string,
  locations: string[]
): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured yet.' };
  }

  const { error: delError } = await supabase
    .from('storage_locations')
    .delete()
    .eq('user_id', userId);

  if (delError) {
    return { ok: false, message: delError.message };
  }

  const rows = locations.map((name, index) => ({
    user_id: userId,
    name,
    sort_order: index,
  }));

  if (rows.length > 0) {
    const { error: insError } = await supabase.from('storage_locations').insert(rows);
    if (insError) {
      return { ok: false, message: insError.message };
    }
  }

  return {
    ok: true,
    locations,
    message: isSupabaseConfigured()
      ? 'Saved storage locations to Supabase.'
      : 'Saved locally only.',
  };
}

export async function pushUnitPreference(
  userId: string,
  unitSystem: 'metric' | 'imperial'
): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured yet.' };
  }

  const { error } = await supabase.from('user_preferences').upsert(
    {
      user_id: userId,
      unit_system: unitSystem,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, locations: [], message: 'Saved unit preference to Supabase.' };
}
