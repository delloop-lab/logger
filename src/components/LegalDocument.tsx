import React from 'react';
import Link from 'next/link';

export type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  afterBullets?: string[];
};

export default function LegalDocument({
  title,
  updated,
  intro,
  sections,
  closing,
}: {
  title: string;
  updated: string;
  intro: string[];
  sections: LegalSection[];
  closing?: string[];
}) {
  return (
    <div className="min-h-screen bg-[#121417] text-gray-100">
      <header className="border-b border-gray-800 bg-[#1e2228]">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 md:px-6">
          <Link href="/" className="inline-flex items-center">
            <img
              src="/brand/logger-logo.png"
              alt="Logger"
              className="h-9 w-auto"
              draggable={false}
            />
          </Link>
          <Link
            href="/app"
            className="text-xs font-bold text-orange-400 hover:text-orange-300"
          >
            Back to Logger
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-14">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-500">
          Logger
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {updated}</p>

        <div className="mt-8 space-y-4 text-sm leading-relaxed text-gray-300">
          {intro.map((p) => (
            <p key={p.slice(0, 48)}>{p}</p>
          ))}
        </div>

        <div className="mt-10 space-y-10">
          {sections.map((section, i) => (
            <section key={section.title} id={`s-${i + 1}`} className="space-y-3">
              <h2 className="text-lg font-bold text-white">
                {i + 1}. {section.title}
              </h2>
              {(section.paragraphs || []).map((p) => (
                <p key={p.slice(0, 48)} className="text-sm leading-relaxed text-gray-300">
                  {p}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-gray-300">
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : null}
              {(section.afterBullets || []).map((p) => (
                <p key={p.slice(0, 48)} className="text-sm leading-relaxed text-gray-300">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        {closing && closing.length > 0 ? (
          <div className="mt-10 space-y-3 border-t border-gray-800 pt-8 text-sm leading-relaxed text-gray-300">
            {closing.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </div>
        ) : null}
      </main>

      <footer className="border-t border-gray-800 px-4 py-6 text-center text-[11px] text-gray-500">
        Logger (c) {new Date().getFullYear()} The Novita Group Pty Ltd
      </footer>
    </div>
  );
}
