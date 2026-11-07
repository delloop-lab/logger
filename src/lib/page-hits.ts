import { getSupabase } from '@/lib/supabase/client';

const SESSION_KEY = 'logger_hit_session_v1';
const VISITOR_KEY = 'logger_visitor_id_v1';
const GEO_CACHE_KEY = 'logger_visitor_geo_v1';

type GeoContext = {
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
};

let geoPromise: Promise<GeoContext> | null = null;

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = makeId('s');
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `s-${Date.now()}`;
  }
}

export function getVisitorId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = makeId('v');
    window.localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return sessionId();
  }
}

export function parseUserAgent(ua: string | null | undefined): {
  browser: string;
  os: string;
  deviceType: string;
} {
  const s = ua || '';
  if (!s) return { browser: 'Unknown', os: 'Unknown', deviceType: 'Desktop' };

  let deviceType = 'Desktop';
  if (/ipad|tablet|playbook|silk/i.test(s) || (/android/i.test(s) && !/mobile/i.test(s))) {
    deviceType = 'Tablet';
  } else if (/Mobile|iP(hone|od)|Android.*Mobile|BlackBerry|IEMobile|Opera Mini/i.test(s)) {
    deviceType = 'Mobile';
  } else if (/bot|crawler|spider|crawling/i.test(s)) {
    deviceType = 'Bot';
  }

  let browser = 'Other';
  if (/Edg\//i.test(s)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(s)) browser = 'Opera';
  else if (/Firefox\/|FxiOS\//i.test(s)) browser = 'Firefox';
  else if (/CriOS\/|Chrome\//i.test(s)) browser = 'Chrome';
  else if (/Safari\//i.test(s) && /Version\//i.test(s)) browser = 'Safari';

  let os = 'Other';
  if (/Windows NT 10\.0/i.test(s)) os = 'Windows';
  else if (/Windows NT/i.test(s)) os = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(s)) os = 'iOS';
  else if (/Mac OS X|Macintosh/i.test(s)) os = 'macOS';
  else if (/Android/i.test(s)) os = 'Android';
  else if (/CrOS/i.test(s)) os = 'ChromeOS';
  else if (/Linux/i.test(s)) os = 'Linux';

  return { browser, os, deviceType };
}

function getUtmParams(): {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
} {
  if (typeof window === 'undefined') {
    return { utmSource: null, utmMedium: null, utmCampaign: null };
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const utmSource =
      params.get('utm_source') || params.get('ref') || params.get('source') || null;
    const utmMedium = params.get('utm_medium') || null;
    const utmCampaign = params.get('utm_campaign') || null;
    return {
      utmSource: utmSource ? utmSource.slice(0, 120) : null,
      utmMedium: utmMedium ? utmMedium.slice(0, 120) : null,
      utmCampaign: utmCampaign ? utmCampaign.slice(0, 120) : null,
    };
  } catch {
    return { utmSource: null, utmMedium: null, utmCampaign: null };
  }
}

async function resolveGeoContext(): Promise<GeoContext> {
  if (typeof window === 'undefined') {
    return { ip: null, country: null, region: null, city: null, timezone: null };
  }
  try {
    const cached = window.sessionStorage.getItem(GEO_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as GeoContext;
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    /* ignore */
  }

  if (!geoPromise) {
    geoPromise = (async (): Promise<GeoContext> => {
      try {
        const res = await fetch('/api/visitor-context', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as Partial<GeoContext>;
          const ctx: GeoContext = {
            ip: data.ip || null,
            country: data.country || null,
            region: data.region || null,
            city: data.city || null,
            timezone: data.timezone || null,
          };
          try {
            window.sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(ctx));
          } catch {
            /* ignore */
          }
          return ctx;
        }
      } catch {
        /* ignore */
      }
      return { ip: null, country: null, region: null, city: null, timezone: null };
    })();
  }
  return geoPromise;
}

/**
 * Fire-and-forget page/tab hit for Admin analytics.
 * Logs both anonymous visitors and signed-in users with location, referrer, UTM, and device details.
 */
export async function recordPageHit(tab: string, path?: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const [{ data }, geo] = await Promise.all([
      supabase.auth.getSession(),
      resolveGeoContext(),
    ]);
    const userId = data.session?.user?.id ?? null;

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 280) : null;
    const { browser, os, deviceType } = parseUserAgent(ua);
    const { utmSource, utmMedium, utmCampaign } = getUtmParams();

    const resolvedPath =
      path ||
      (typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`.slice(0, 240)
        : '/');

    const referrer =
      typeof document !== 'undefined' && document.referrer
        ? document.referrer.slice(0, 400)
        : null;

    const clientTz =
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || null
        : null;

    const language =
      typeof navigator !== 'undefined' ? navigator.language || null : null;

    const screenSize =
      typeof window !== 'undefined' && window.screen
        ? `${window.screen.width}x${window.screen.height}`
        : null;

    const richPayload = {
      path: resolvedPath,
      tab,
      user_id: userId,
      session_id: sessionId(),
      visitor_id: getVisitorId(),
      referrer,
      user_agent: ua,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      timezone: geo.timezone || clientTz,
      language,
      screen: screenSize,
      device_type: deviceType,
      browser,
      os,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      ip: geo.ip,
    };

    const { error } = await supabase.from('page_hits').insert(richPayload);

    // Graceful fallback if the database hasn't had the newest columns migrated yet
    if (error) {
      await supabase.from('page_hits').insert({
        path: resolvedPath,
        tab,
        user_id: userId,
        session_id: sessionId(),
        referrer,
        user_agent: ua,
      });
    }
  } catch {
    /* analytics must never break the app */
  }
}
