import { getSupabase } from '@/lib/supabase/client';
import { ADMIN_TAB_LABELS } from '@/lib/admin';
import { parseUserAgent } from '@/lib/page-hits';
import { useAppStore } from '@/lib/store';
import { saveProjects } from '@/lib/supabase/workspace';

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
  visitorId: string | null;
  sessionId: string | null;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  locationLabel: string;
  referrer: string | null;
  referrerLabel: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  deviceType: string;
  browser: string;
  os: string;
  screen: string | null;
  language: string | null;
  timezone: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AdminVisitorSummary = {
  visitorKey: string;
  email: string | null;
  isAnonymous: boolean;
  locationLabel: string;
  country: string | null;
  city: string | null;
  ip: string | null;
  referrerLabel: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  deviceType: string;
  browser: string;
  os: string;
  screen: string | null;
  language: string | null;
  timezone: string | null;
  hitCount: number;
  tabsVisited: string[];
  firstSeenAt: string;
  lastSeenAt: string;
};

export type DayCount = { day: string; count: number };
export type NamedCount = { name: string; count: number };

export type AdminDashboardData = {
  totals: {
    users: number;
    uniqueVisitorsToday: number;
    uniqueVisitors7d: number;
    uniqueVisitors14d: number;
    hitsToday: number;
    hits7d: number;
    hitsAll: number;
    boards: number;
    projects: number;
  };
  hitsByDay: DayCount[];
  visitorsByDay: DayCount[];
  hitsByTab: NamedCount[];
  topLocations: NamedCount[];
  topReferrers: NamedCount[];
  topDevices: NamedCount[];
  speciesTop: NamedCount[];
  users: AdminUserRow[];
  visitors: AdminVisitorSummary[];
  recentHits: AdminHitRow[];
  message?: string;
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatLocation(
  city?: string | null,
  region?: string | null,
  country?: string | null,
  timezone?: string | null
): string {
  const parts = [city, region, country]
    .map((p) => (p ? String(p).trim() : ''))
    .filter(Boolean);
  if (parts.length > 0) return parts.join(', ');
  if (timezone) return String(timezone);
  return 'Unknown';
}

function formatReferrer(
  referrer?: string | null,
  utmSource?: string | null,
  utmMedium?: string | null,
  utmCampaign?: string | null
): string {
  const utmParts = [utmSource, utmMedium, utmCampaign].filter(Boolean);
  const utmSuffix = utmParts.length > 0 ? ` (${utmParts.join(' / ')})` : '';

  if (!referrer) {
    return utmSource ? `${utmSource}${utmSuffix}` : 'Direct';
  }
  try {
    const url = new URL(referrer);
    if (
      typeof window !== 'undefined' &&
      url.hostname &&
      url.hostname === window.location.hostname
    ) {
      return utmSource ? `${utmSource}${utmSuffix}` : 'Internal';
    }
    const host = url.hostname.replace(/^www\./i, '');
    const path = url.pathname && url.pathname !== '/' ? url.pathname : '';
    return `${host}${path}${utmSuffix}`;
  } catch {
    return `${referrer.slice(0, 60)}${utmSuffix}`;
  }
}

function emptyDashboard(message: string): AdminDashboardData {
  return {
    totals: {
      users: 0,
      uniqueVisitorsToday: 0,
      uniqueVisitors7d: 0,
      uniqueVisitors14d: 0,
      hitsToday: 0,
      hits7d: 0,
      hitsAll: 0,
      boards: 0,
      projects: 0,
    },
    hitsByDay: [],
    visitorsByDay: [],
    hitsByTab: [],
    topLocations: [],
    topReferrers: [],
    topDevices: [],
    speciesTop: [],
    users: [],
    visitors: [],
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

  // Ensure any open project in the local store is synced into savedProjects
  const storeState = useAppStore.getState();
  if (storeState.cloudUserId && !storeState.demoPreview) {
    storeState.syncActiveProjectToLibrary();
  }

  const [profilesRes, hitsRes, boardsRes, projectsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, display_name, created_at, last_seen_at, is_admin')
      .order('last_seen_at', { ascending: false }),
    supabase
      .from('page_hits')
      .select('*')
      .gte('created_at', since14Iso)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase.from('boards').select('id, user_id, species, status'),
    // Counts only — never pull other users' project names/parts into the client
    supabase.from('saved_projects').select('user_id'),
  ]);

  if (profilesRes.error || hitsRes.error) {
    const msg =
      profilesRes.error?.message ||
      hitsRes.error?.message ||
      'Could not load admin data. Run supabase/migrate-admin-analytics.sql in the SQL editor.';
    return emptyDashboard(msg);
  }

  const profiles = profilesRes.data || [];
  const hits = (hitsRes.data || []) as Record<string, unknown>[];
  const cloudBoards = boardsRes.error ? [] : boardsRes.data || [];
  const cloudProjects = projectsRes.error ? [] : projectsRes.data || [];

  // Merge active signed-in admin's in-memory boards & projects in case recovery/hydration projects haven't flushed to cloud yet
  const latestStore = useAppStore.getState();
  const activeUid =
    latestStore.cloudUserId && !latestStore.demoPreview ? latestStore.cloudUserId : null;

  const boards: Array<{ id?: string; user_id: string; species: string; status?: string }> = [
    ...cloudBoards,
  ];
  if (activeUid && latestStore.boards.length > 0) {
    const seenBoardIds = new Set(
      cloudBoards
        .filter((b) => String(b.user_id || '') === activeUid)
        .map((b) => String(b.id || ''))
    );
    for (const lb of latestStore.boards) {
      if (!seenBoardIds.has(String(lb.id))) {
        boards.push({
          id: lb.id,
          user_id: activeUid,
          species: lb.species,
          status: lb.status,
        });
      }
    }
  }

  const projects: Array<{ user_id: string }> = cloudProjects.map((p) => ({
    user_id: String(p.user_id || ''),
  }));

  // If the signed-in admin has more local projects than cloud yet, count local and push sync
  if (activeUid && latestStore.savedProjects.length > 0) {
    const cloudCountForUser = projects.filter((p) => p.user_id === activeUid).length;
    const localCount = latestStore.savedProjects.length;
    if (localCount > cloudCountForUser) {
      for (let i = 0; i < localCount - cloudCountForUser; i++) {
        projects.push({ user_id: activeUid });
      }
      void saveProjects(activeUid, latestStore.savedProjects);
    }
  }

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
  const dayVisitorsMap = new Map<string, Set<string>>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(since14);
    d.setDate(since14.getDate() + i);
    const k = d.toISOString().slice(0, 10);
    dayMap.set(k, 0);
    dayVisitorsMap.set(k, new Set<string>());
  }

  const tabMap = new Map<string, number>();
  const locationMap = new Map<string, number>();
  const referrerMap = new Map<string, number>();
  const deviceMap = new Map<string, number>();

  const uniqueToday = new Set<string>();
  const unique7d = new Set<string>();
  const unique14d = new Set<string>();

  let hitsToday = 0;
  let hits7d = 0;

  const visitorGroupMap = new Map<string, AdminVisitorSummary>();
  const parsedHits: AdminHitRow[] = [];

  for (const h of hits) {
    const id = String(h.id || '');
    const created = String(h.created_at || '');
    const day = dayKey(created);
    const rawTab = String(h.tab || h.path || 'unknown');
    const tabLabel = ADMIN_TAB_LABELS[rawTab] || String(h.tab || h.path || '—');
    const path = String(h.path || '/');
    const userId = h.user_id ? String(h.user_id) : null;
    const email = userId ? emailById.get(userId) || null : null;
    const visitorId = h.visitor_id ? String(h.visitor_id) : null;
    const sessionId = h.session_id ? String(h.session_id) : null;
    const ip = h.ip ? String(h.ip) : null;
    const country = h.country ? String(h.country) : null;
    const region = h.region ? String(h.region) : null;
    const city = h.city ? String(h.city) : null;
    const timezone = h.timezone ? String(h.timezone) : null;
    const referrer = h.referrer ? String(h.referrer) : null;
    const utmSource = h.utm_source ? String(h.utm_source) : null;
    const utmMedium = h.utm_medium ? String(h.utm_medium) : null;
    const utmCampaign = h.utm_campaign ? String(h.utm_campaign) : null;
    const userAgent = h.user_agent ? String(h.user_agent) : null;
    const uaParsed = parseUserAgent(userAgent);
    const deviceType = h.device_type ? String(h.device_type) : uaParsed.deviceType;
    const browser = h.browser ? String(h.browser) : uaParsed.browser;
    const os = h.os ? String(h.os) : uaParsed.os;
    const screen = h.screen ? String(h.screen) : null;
    const language = h.language ? String(h.language) : null;

    const locationLabel = formatLocation(city, region, country, timezone);
    const referrerLabel = formatReferrer(referrer, utmSource, utmMedium, utmCampaign);

    const visitorKey =
      visitorId ||
      userId ||
      sessionId ||
      ip ||
      `anon-${id.slice(0, 8)}`;

    if (dayMap.has(day)) {
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
      dayVisitorsMap.get(day)?.add(visitorKey);
    }

    tabMap.set(rawTab, (tabMap.get(rawTab) || 0) + 1);

    const countryOrLoc = country || (city ? city : timezone || 'Unknown');
    locationMap.set(countryOrLoc, (locationMap.get(countryOrLoc) || 0) + 1);
    referrerMap.set(referrerLabel, (referrerMap.get(referrerLabel) || 0) + 1);

    const deviceKey = `${deviceType} · ${browser}`;
    deviceMap.set(deviceKey, (deviceMap.get(deviceKey) || 0) + 1);

    unique14d.add(visitorKey);
    if (created >= todayIso) {
      hitsToday += 1;
      uniqueToday.add(visitorKey);
    }
    if (created >= since7Iso) {
      hits7d += 1;
      unique7d.add(visitorKey);
    }

    parsedHits.push({
      id,
      tab: tabLabel,
      path,
      email,
      visitorId,
      sessionId,
      ip,
      country,
      region,
      city,
      locationLabel,
      referrer,
      referrerLabel,
      utmSource,
      utmMedium,
      utmCampaign,
      deviceType,
      browser,
      os,
      screen,
      language,
      timezone,
      userAgent,
      createdAt: created,
    });

    const existingVisitor = visitorGroupMap.get(visitorKey);
    if (!existingVisitor) {
      visitorGroupMap.set(visitorKey, {
        visitorKey,
        email,
        isAnonymous: !email && !userId,
        locationLabel,
        country,
        city,
        ip,
        referrerLabel,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
        deviceType,
        browser,
        os,
        screen,
        language,
        timezone,
        hitCount: 1,
        tabsVisited: [tabLabel],
        firstSeenAt: created,
        lastSeenAt: created,
      });
    } else {
      existingVisitor.hitCount += 1;
      if (!existingVisitor.email && email) {
        existingVisitor.email = email;
        existingVisitor.isAnonymous = false;
      }
      if (existingVisitor.locationLabel === 'Unknown' && locationLabel !== 'Unknown') {
        existingVisitor.locationLabel = locationLabel;
        existingVisitor.country = country;
        existingVisitor.city = city;
      }
      if (!existingVisitor.ip && ip) existingVisitor.ip = ip;
      if (
        (existingVisitor.referrerLabel === 'Direct' ||
          existingVisitor.referrerLabel === 'Internal') &&
        referrerLabel !== 'Direct' &&
        referrerLabel !== 'Internal'
      ) {
        existingVisitor.referrerLabel = referrerLabel;
        existingVisitor.referrer = referrer;
      }
      if (!existingVisitor.utmSource && utmSource) existingVisitor.utmSource = utmSource;
      if (!existingVisitor.utmMedium && utmMedium) existingVisitor.utmMedium = utmMedium;
      if (!existingVisitor.utmCampaign && utmCampaign) existingVisitor.utmCampaign = utmCampaign;
      if (!existingVisitor. tabsVisited.includes(tabLabel)) {
        existingVisitor.tabsVisited.push(tabLabel);
      }
      if (created < existingVisitor.firstSeenAt) existingVisitor.firstSeenAt = created;
      if (created > existingVisitor.lastSeenAt) existingVisitor.lastSeenAt = created;
    }
  }

  const hitsByDay: DayCount[] = Array.from(dayMap.entries()).map(([day, count]) => ({
    day,
    count,
  }));

  const visitorsByDay: DayCount[] = Array.from(dayVisitorsMap.entries()).map(
    ([day, set]) => ({
      day,
      count: set.size,
    })
  );

  const hitsByTab: NamedCount[] = Array.from(tabMap.entries())
    .map(([name, count]) => ({
      name: ADMIN_TAB_LABELS[name] || name,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const topLocations: NamedCount[] = Array.from(locationMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topReferrers: NamedCount[] = Array.from(referrerMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topDevices: NamedCount[] = Array.from(deviceMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const speciesTop: NamedCount[] = Array.from(speciesMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const visitors: AdminVisitorSummary[] = Array.from(visitorGroupMap.values())
    .sort((a, b) => (a.lastSeenAt < b.lastSeenAt ? 1 : -1))
    .slice(0, 100);

  const recentHits = parsedHits.slice(0, 100);
  const hitsAll = hits.length;

  return {
    totals: {
      users: users.length,
      uniqueVisitorsToday: uniqueToday.size,
      uniqueVisitors7d: unique7d.size,
      uniqueVisitors14d: unique14d.size,
      hitsToday,
      hits7d,
      hitsAll,
      boards: boards.length,
      projects: projects.length,
    },
    hitsByDay,
    visitorsByDay,
    hitsByTab,
    topLocations,
    topReferrers,
    topDevices,
    speciesTop,
    users,
    visitors,
    recentHits,
  };
}
