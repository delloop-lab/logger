import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

function safeDecode(val: string | null): string | null {
  if (!val) return null;
  try {
    return decodeURIComponent(val).trim() || null;
  } catch {
    return val.trim() || null;
  }
}

function firstIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    req.headers.get('x-vercel-forwarded-for');
  return realIp ? realIp.split(',')[0]?.trim() || null : null;
}

function isLocalOrPrivateIp(ip: string | null): boolean {
  if (!ip) return true;
  const clean = ip.replace(/^::ffff:/, '');
  if (clean === '127.0.0.1' || clean === '::1' || clean === 'localhost') return true;
  if (clean.startsWith('10.') || clean.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(clean)) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const ip = firstIp(req);

  let country =
    safeDecode(req.headers.get('x-vercel-ip-country')) ||
    safeDecode(req.headers.get('cf-ipcountry')) ||
    safeDecode(req.headers.get('x-country-code')) ||
    null;

  let region =
    safeDecode(req.headers.get('x-vercel-ip-country-region')) ||
    safeDecode(req.headers.get('cf-region')) ||
    null;

  let city =
    safeDecode(req.headers.get('x-vercel-ip-city')) ||
    safeDecode(req.headers.get('cf-ipcity')) ||
    null;

  let timezone = safeDecode(req.headers.get('x-vercel-ip-timezone')) || null;

  // Fallback to lightweight GeoIP lookup if edge headers aren't present
  if (!country) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const targetUrl =
        ip && !isLocalOrPrivateIp(ip)
          ? `https://ipwho.is/${encodeURIComponent(ip)}`
          : 'https://ipwho.is/';
      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      clearTimeout(timeout);
      if (res.ok) {
        const geo = (await res.json()) as {
          success?: boolean;
          ip?: string;
          country?: string;
          country_code?: string;
          region?: string;
          city?: string;
          timezone?: { id?: string };
        };
        if (geo && geo.success !== false) {
          country = geo.country || geo.country_code || country;
          region = geo.region || region;
          city = geo.city || city;
          timezone = geo.timezone?.id || timezone;
        }
      }
    } catch {
      /* ignore geo lookup failures */
    }
  }

  return NextResponse.json({
    ip,
    country,
    region,
    city,
    timezone,
  });
}
