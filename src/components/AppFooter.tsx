'use client';

import React, { useState } from 'react';
import AppModal from '@/components/AppModal';
import HelpGuide from '@/components/HelpGuide';
import { formatAppVersion } from '@/lib/version';

export default function AppFooter() {
  const [helpOpen, setHelpOpen] = useState(false);
  const versionLabel = formatAppVersion();

  return (
    <>
      <footer className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-gray-800 bg-[#1a1d22]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-2.5 text-[11px] text-gray-400 md:px-8">
          <p className="m-0">Copyright (c) 2026 Trinagra Studio</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-mono text-gray-500" title="Application version">
              Version {versionLabel}
            </span>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="font-medium text-gray-300 hover:text-orange-400 transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Help
            </button>
            <a
              href="mailto:silvervirtual@gmail.com"
              className="font-medium text-gray-300 hover:text-orange-400 transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>

      <AppModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="TimberVault Help"
        subtitle={`${versionLabel} · workshop guide & FAQ`}
        size="xl"
      >
        <HelpGuide />
      </AppModal>
    </>
  );
}
