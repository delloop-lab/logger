'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import AppModal from '@/components/AppModal';
import GettingStartedGuide from '@/components/GettingStartedGuide';
import HelpGuide from '@/components/HelpGuide';
import { formatAppVersion } from '@/lib/version';
import { useAppStore } from '@/lib/store';

export default function AppFooter() {
  const pathname = usePathname();
  const signedIn = Boolean(useAppStore((s) => s.cloudUserId));
  const [helpOpen, setHelpOpen] = useState(false);
  const [gettingStartedOpen, setGettingStartedOpen] = useState(false);
  const versionLabel = formatAppVersion();

  // Marketing + legal pages use their own chrome
  if (
    !pathname ||
    pathname === '/' ||
    pathname.startsWith('/landing') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms')
  ) {
    return null;
  }

  return (
    <>
      <footer className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-gray-800 bg-[#1a1d22]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-2.5 text-[11px] text-gray-400 md:px-8">
          <p className="m-0">Copyright (c) {new Date().getFullYear()} The Novita Group Pty Ltd</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={() => setGettingStartedOpen(true)}
              className="font-medium text-gray-300 hover:text-orange-400 transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Getting started
            </button>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="font-medium text-gray-300 hover:text-orange-400 transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Help
            </button>
            {signedIn ? (
              <>
                <a
                  href="/privacy"
                  className="font-medium text-gray-300 hover:text-orange-400 transition-colors"
                >
                  Privacy
                </a>
                <a
                  href="/terms"
                  className="font-medium text-gray-300 hover:text-orange-400 transition-colors"
                >
                  Terms
                </a>
              </>
            ) : null}
            <a
              href="mailto:loggerhelp@novitagroup.com"
              className="font-medium text-gray-300 hover:text-orange-400 transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>

      <AppModal
        open={gettingStartedOpen}
        onClose={() => setGettingStartedOpen(false)}
        title="Getting started"
        subtitle={`${versionLabel} · first cut list in a few minutes`}
        size="app"
      >
        <GettingStartedGuide />
      </AppModal>

      <AppModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Help"
        subtitle={`${versionLabel} · workshop guide & FAQ`}
        size="app"
      >
        <HelpGuide
          onOpenGettingStarted={() => {
            setHelpOpen(false);
            setGettingStartedOpen(true);
          }}
        />
      </AppModal>
    </>
  );
}
