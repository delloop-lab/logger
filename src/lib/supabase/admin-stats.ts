import { getSupabase } from '@/lib/supabase/client';
import { ADMIN_TAB_LABELS } from '@/lib/admin';

export type AdminUserRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: string | null;
  lastSeenAt: string | null;
  isAdmin: boolean;
  boardCount: number;
  projectCount: number;
};

export type AdminHitRow = {
  id: string;
  tab: string;
  path: string;
  email: string | null;
  createdAt: string;
};

export type DayCount = { day: string; count: number };
export type NamedCount = { name: string; count: number };

export type AdminDashboardData = {
  totals: {
    users: number;
    hitsToday: number;
    hits7d: number;
    hitsAll: number;
    boards: number;
    projects: number;
  };
  hitsByDay: DayCount[];
  hitsByTab: NamedCount[];
  speciesTop: NamedCount[];
  users: AdminUserRow[];
  recentHits: AdminHitRow[];
  message?: string;
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function emptyDashboard(message: string): AdminDashboardData {
  return {
    totals: { users: 0, hitsToday: 0, hits7d: 0, hitsAll: 0, boards: 0, projects: 0 },
    hitsByDay: [],
    hitsByTab: [],
    speciesTop: [],
    users: [],
    recentHits: [],
    message,
  };
}

export async function loadAdminDashboard(): Promise<AdminDashboardData> {
  const supabase = getSupabase();
  if (!supabase) return emptyDashboard('Supabase is not configured.');

  const since14 = new Date();
  since14.setDate(since14.getDate() - 13);
  since14.setHours(0, 0, 0, 0);
  const since14Iso = since14.toISOString();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const since7 = new Date();
  since7.setDate(since7.getDate() - 6);
  since7.setHours(0, 0, 0, 0);
  const since7Iso = since7.toISOString();

  const [profilesRes, hitsRes, boardsRes, projectsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, display_name, created_at, last_seen_at, is_admin')
      .order('last_seen_at', { ascending: false }),
    supabase
      .from('page_hits')
      .select('id, path, tab, user_id, created_at')
      .gte('created_at', since14Iso)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase.from('boards').select('user_id, species, status'),
    supabase.from('saved_projects').select('user_id, name, status'),
  ]);

  if (profilesRes.error || hitsRes.error) {
    const msg =
      profilesRes.error?.message ||
      hitsRes.error?.message ||
      'Could not load admin data. Run supabase/migrate-admin-analytics.sql in the SQL editor.';
    return emptyDashboard(msg);
  }

  const profiles = profilesRes.data || [];
  const hits = hitsRes.data || [];
  const boards = boardsRes.error ? [] : boardsRes.data || [];
  const projects = projectsRes.error ? [] : projectsRes.data || [];

  const boardsByUser = new Map<string, number>();
  const projectsByUser = new Map<string, number>();
  const speciesMap = new Map<string, number>();

  for (const b of boards) {
    const uid = String(b.user_id || '');
    if (uid) boardsByUser.set(uid, (boardsByUser.get(uid) || 0) + 1);
    const sp = String(b.species || 'Unknown').trim() || 'Unknown';
    speciesMap.set(sp, (speciesMap.get(sp) || 0) + 1);
  }
  for (const p of projects) {
    const uid = String(p.user_id || '');
    if (uid) projectsByUser.set(uid, (projectsByUser.get(uid) || 0) + 1);
  }

  const emailById = new Map<string, string | null>();
  for (const p of profiles) {
    emailById.set(String(p.id), p.email ? String(p.email) : null);
  }

  const users: AdminUserRow[] = profiles.map((p) => {
    const id = String(p.id);
    return {
      id,
      email: p.email ? String(p.email) : null,
      displayName: p.display_name ? String(p.display_name) : null,
      createdAt: p.created_at ? String(p.created_at) : null,
      lastSeenAt: p.last_seen_at ? String(p.last_seen_at) : null,
      isAdmin: Boolean(p.is_admin),
      boardCount: boardsByUser.get(id) || 0,
      projectCount: projectsByUser.get(id) || 0,
    };
  });

  const dayMap = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(since14);
    d.setDate(since14.getDate() + i);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  const tabMap = new Map<string, number>();
  let hitsToday = 0;
  let hits7d = 0;

  for (const h of hits) {
    const created = String(h.created_at);
    const day = dayKey(created);
    if (dayMap.has(day)) dayMap.set(day, (dayMap.get(day) || 0) + 1);
    const tab = String(h.tab || h.path || 'unknown');
    tabMap.set(tab, (tabMap.get(tab) || 0) + 1);
    if (created >= todayIso) hitsToday += 1;
    if (created >= since7Iso) hits7d += 1;
  }

  const hitsByDay: DayCount[] = Array.from(dayMap.entries()).map(([day, count]) => ({
    day,
    count,
  }));
  const hitsByTab: NamedCount[] = Array.from(tabMap.entries())
    .map(([name, count]) => ({
      name: ADMIN_TAB_LABELS[name] || name,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const speciesTop: NamedCount[] = Array.from(speciesMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const recentHits: AdminHitRow[] = hits.slice(0, 40).map((h) => ({
    id: String(h.id),
    tab: ADMIN_TAB_LABELS[String(h.tab || '')] || String(h.tab || h.path || '—'),
    path: String(h.path || '/'),
    email: h.user_id ? emailById.get(String(h.user_id)) || null : null,
    createdAt: String(h.created_at),
  }));

  // Total hit count (14d window is enough for chart; show all-time approx as window size if needed)
  const hitsAll = hits.length;

  return {
    totals: {
      users: users.length,
      hitsToday,
      hits7d,
      hitsAll,
      boards: boards.length,
      projects: projects.length,
    },
    hitsByDay,
    hitsByTab,
    speciesTop,
    users,
    recentHits,
  };
}
