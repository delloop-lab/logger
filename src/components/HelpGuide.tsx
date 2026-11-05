'use client';

import React from 'react';
import { formatAppVersion } from '@/lib/version';

function HelpShot({
  src,
  alt,
  caption,
  imgClassName = 'block w-full h-auto bg-[#121417]',
}: {
  src: string;
  alt: string;
  caption?: string;
  /** Optional image sizing (e.g. height-limited stock tag). */
  imgClassName?: string;
}) {
  return (
    <figure className="m-0 overflow-hidden rounded-xl border border-gray-700 bg-[#121417]">
      <img src={src} alt={alt} className={imgClassName} />
      {caption ? (
        <figcaption className="px-3 py-2 text-[11px] text-gray-500 border-t border-gray-800">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

export default function HelpGuide({
  onOpenGettingStarted,
}: {
  onOpenGettingStarted?: () => void;
}) {
  const version = formatAppVersion();

  return (
    <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100 text-xs font-medium">
        <strong className="font-black tracking-wide">BETA</strong>; Logger is a beta product and is
        being updated all the time. Screens and workflows may change between sessions. You are on{' '}
        <span className="font-mono text-amber-200">{version}</span>.
      </div>

      <div className="rounded-xl border border-gray-700 bg-[#121417] px-4 py-3 text-xs text-gray-300">
        Works in your <strong className="text-gray-100">browser</strong>. Nothing to download or
        install. Use it on your <strong className="text-gray-100">phone</strong>,{' '}
        <strong className="text-gray-100">tablet</strong>, or{' '}
        <strong className="text-gray-100">computer</strong>.
      </div>

      <section className="space-y-3">
        <h3 className="text-white font-black text-xs uppercase tracking-widest">What it is for</h3>
        <p>
          Logger is a workshop timber inventory and cutting planner. Catalogue boards and
          offcuts, plan projects with less waste, match builds to stock on hand, print QR stock
          tags, scan tags at the rack, and sync your workshop when signed in.
        </p>
        {onOpenGettingStarted ? (
          <button
            type="button"
            onClick={onOpenGettingStarted}
            className="w-full text-left rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm font-medium text-orange-100 hover:bg-orange-500/15 hover:border-orange-400/50 transition-colors cursor-pointer"
          >
            New here? Open{' '}
            <span className="font-black text-orange-300 underline underline-offset-2 decoration-orange-400/60">
              Getting started
            </span>{' '}
            for a short first-run walkthrough.
          </button>
        ) : (
          <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 text-sm font-medium text-orange-100">
            New here? Open <strong className="font-black text-orange-300">Getting started</strong>{' '}
            for a short first-run walkthrough.
          </div>
        )}
      </section>

      <section className="space-y-5">
        <h3 className="text-white font-black text-xs uppercase tracking-widest">
          What each tab does
        </h3>

        <div className="space-y-2">
          <h4 className="font-bold text-gray-100">Dashboard</h4>
          <p className="text-xs text-gray-400">
            Your workshop home screen. Shows how much timber is available (piece count and face
            area), how many projects you have, and staged vs installed finished pieces. Lists
            recent lots, species currently on hand, and how many storage locations are configured.
            Use the shortcuts to jump into Quick Log, Settings, or Projects &amp; Cuts.
          </p>
          <HelpShot
            src="/help/help-tab-dashboard.png"
            alt="Logger Dashboard tab showing stock stats and recent inventory"
            caption="Dashboard: live workshop overview"
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-gray-100">Quick Log</h4>
          <p className="text-xs text-gray-400">
            Fast way to add new timber to stock. Choose species from your lumber types, set source,
            storage location, dimensions, and quantity. Source opens an optional field beside
            location: <strong className="text-gray-200">Description</strong> (for Salvaged or
            Furniture Teardown, e.g. bedhead or stool leg) or{' '}
            <strong className="text-gray-200">Supplier</strong> (for New or Purchased). Optionally
            mark defects (warp, knot, split, and so on) plus defect notes. Logger assigns a lot tag
            id automatically (based on species). After you save, the lot appears in Inventory and on
            the Dashboard.
          </p>
          <HelpShot
            src="/help/help-tab-quick-log.png"
            alt="Logger Quick Log form with species, source, location, and optional description or supplier"
            caption="Quick Log: species, source, location, optional description or supplier"
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-gray-100">Inventory</h4>
          <p className="text-xs text-gray-400">
            Full catalogue of every lot: raw stock, reusable offcuts, waste remnants, and finished
            parts. Filter by status (available, staged, consumed), type (stock / offcuts /
            finished), species, or project. Sort columns, edit dimensions and location, delete
            lots, mark finished pieces installed, and open{' '}
            <strong className="text-gray-200">Print label</strong> for QR tags (system print or
            save as image).
          </p>
          <HelpShot
            src="/help/help-tab-inventory.png"
            alt="Logger Inventory list with filters and board lots"
            caption="Inventory: browse, filter, edit, and print tags"
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-gray-100">Projects &amp; Cuts</h4>
          <p className="text-xs text-gray-400">
            Plan a build end to end. Name or open a project, add parts (name, species from your
            lumber types, size, quantity), set kerf and cutting strategy, then generate nested
            cutting sheets against available boards. Review shop drawings, save or pause projects
            when stock is short, resume later, and apply cuts so remnants / finished parts update
            Inventory.
          </p>
          <HelpShot
            src="/help/help-tab-projects-cuts.png"
            alt="Logger Projects and Cuts tab with saved projects and cut list steps"
            caption="Projects & Cuts: name, parts, save, generate sheets"
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-gray-100">
            What Can I Build?{' '}
            <span className="font-semibold text-orange-300/90">(in development)</span>
          </h4>
          <p className="text-xs text-gray-400">
            Idea finder for the timber you already have. Compares project templates and your saved
            projects to available boards by species and size so you can pick a realistic next
            build, then open it in Projects &amp; Cuts to generate a cut list. This area is still
            in development.
          </p>
          <HelpShot
            src="/help/help-tab-what-can-i-build.png"
            alt="Logger What Can I Build tab matching projects to stock"
            caption="What Can I Build? (in development)"
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-gray-100">QR Scanner</h4>
          <p className="text-xs text-gray-400">
            Find a board at the rack without typing. Start the camera (or upload a photo of a
            tag), scan the printed QR, and Logger looks up the lot. You can also type or paste
            a tag id. A match shows species, dimensions, location, defects, and status so you pull
            the right piece.
          </p>
          <HelpShot
            src="/help/help-tab-qr-scanner.png"
            alt="Logger QR Scanner tab with camera and manual tag lookup"
            caption="QR Scanner: camera, photo, or manual tag lookup"
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-bold text-gray-100">Settings</h4>
          <p className="text-xs text-gray-400">
            Workshop preferences: metric (mm) or imperial (inches), default saw kerf for new
            projects, minimum size that counts as a reusable offcut, lumber types (add or rename
            species such as Birch Plywood or Jarrah), and your list of storage locations (rack,
            workbench, shed, and so on). Also shows who is signed in and tools to reset workshop
            data if you need a clean start.
          </p>
          <HelpShot
            src="/help/help-tab-settings.png"
            alt="Logger Settings tab for units, kerf, offcuts, lumber types, and locations"
            caption="Settings: kerf, offcut rules, lumber types (add/rename), locations"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-white font-black text-xs uppercase tracking-widest">
          QR labels &amp; printing
        </h3>
        <HelpShot
          src="/help/workshop-stock-tag.jpg"
          alt="Logger Stock Tag stapled to the end of a board, showing QR code, tag id, species, dimensions, and location"
          caption="Example: a printed Stock Tag on a board end. Scan the QR in Inventory / QR Scanner to look up the lot."
          imgClassName="block h-44 sm:h-56 w-auto max-w-full object-contain bg-[#121417]"
        />
        <ul className="list-disc pl-5 space-y-1.5 text-xs">
          <li>
            <strong className="text-gray-100">System Print</strong>: browser print dialog for a
            large readable label on A4/Letter.
          </li>
          <li>
            <strong className="text-gray-100">Save PNG</strong>: download the label as an image
            file.
          </li>
        </ul>
        <p className="text-xs text-gray-400">
          Printed tags encode the board tag id so the QR Scanner can find the lot again.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-white font-black text-xs uppercase tracking-widest">FAQ</h3>
        <div className="space-y-3 text-xs">
          <div>
            <p className="font-bold text-gray-100">Is this finished software?</p>
            <p className="text-gray-400 mt-0.5">
              No. It is BETA and is updated frequently as features are refined.
            </p>
          </div>
          <div>
            <p className="font-bold text-gray-100">Do I need an account?</p>
            <p className="text-gray-400 mt-0.5">
              Yes, to keep and sync your own workshop. Without login you may only see demo data.
            </p>
          </div>
          <div>
            <p className="font-bold text-gray-100">Metric or imperial?</p>
            <p className="text-gray-400 mt-0.5">
              Either. Switch in Settings. Display units change; stock stays consistent underneath.
            </p>
          </div>
          <div>
            <p className="font-bold text-gray-100">Can I add my own lumber types?</p>
            <p className="text-gray-400 mt-0.5">
              Yes. In Settings, add or rename types such as Birch Plywood or Jarrah. They appear in
              Quick Log and Projects &amp; Cuts.
            </p>
          </div>
          <div>
            <p className="font-bold text-gray-100">
              What are Description and Supplier on Quick Log?
            </p>
            <p className="text-gray-400 mt-0.5">
              Optional fields beside Storage Location. Salvaged or Furniture Teardown shows
              Description (what the piece was). New or Purchased shows Supplier (where you bought
              it).
            </p>
          </div>
          <div>
            <p className="font-bold text-gray-100">How do I report a problem?</p>
            <p className="text-gray-400 mt-0.5">
              Use Contact in the footer:{' '}
              <a
                href="mailto:lou@schillaci.me"
                className="text-orange-400 hover:text-orange-300"
              >
                lou@schillaci.me
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <p className="text-[11px] text-gray-500 border-t border-gray-800 pt-4">
        Copyright (c) 2026 Lou Schillaci · {version}
      </p>
    </div>
  );
}
