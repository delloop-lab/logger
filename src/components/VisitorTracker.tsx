'use client';

import { Suspense, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { recordPageHit } from '@/lib/page-hits';

/** Map URL paths to Admin analytics tab keys (covers marketing + legal + app shell). */
export function tabFromPath(pathname: string | null): string {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';
  if (path === '/') return 'landing';
  if (path === '/landing') return 'landing';
  if (path === '/app' || path.startsWith('/app/')) return 'app';
  if (path === '/privacy' || path.startsWith('/privacy')) return 'privacy';
  if (path === '/terms' || path.startsWith('/terms')) return 'terms';
  if (path === '/cookies' || path.startsWith('/cookies')) return 'cookies';
  const segment = path.split('/').filter(Boolean)[0];
  return segment || 'page';
}

function TrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    const search = searchParams?.toString() || '';
    const fullPath = `${pathname || '/'}${search ? `?${search}` : ''}`.slice(0, 240);
    const key = fullPath;
    // Avoid duplicate hits from React Strict Mode double-mount in the same tick
    if (lastKey.current === key) return;
    lastKey.current = key;

    const tab = tabFromPath(pathname);
    void recordPageHit(tab, fullPath);
  }, [pathname, searchParams]);

  return null;
}

/** Fire-and-forget visitor logging for every route (landing, app, privacy, terms, …). */
export default function VisitorTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerInner />
    </Suspense>
  );
}
