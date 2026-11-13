'use client';

import React from 'react';
import { formatAppVersion } from '@/lib/version';

export default function GettingStartedGuide() {
  const version = formatAppVersion();

  return (
    <div className="space-y-5 text-sm text-gray-300 leading-relaxed">
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-100 text-xs font-medium">
        <strong className="font-black tracking-wide">BETA</strong>; Logger is a beta product and is
        being updated all the time. Screens and workflows may change between sessions. You are on{' '}
        <span className="font-mono text-amber-200">{version}</span>.
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-gray-300">
          Welcome to Logger. In a few minutes you can set shop defaults, log raw stock, and generate
          your first optimized cut list.
        </p>
        <p className="text-[11px] text-gray-500">
          Logger In first so your workshop stays in the cloud. Signed out browsing may only show demo
          data.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-orange-300">Step 1 · Set up your shop defaults</h4>
          <p className="text-xs text-gray-400">
            Open <strong className="text-gray-200">Settings</strong> before logging the first board
            so kerf and offcut rules stay precise.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-400">
            <li>
              <strong className="text-gray-200">Primary units:</strong> Metric (mm) or Imperial
              (inches). Display switches; stock is stored consistently underneath.
            </li>
            <li>
              <strong className="text-gray-200">Default saw kerf:</strong> Your usual table or miter
              saw blade width (for example 3 mm or 0.125 in). New projects pick this up; you can
              still override kerf on a single project.
            </li>
            <li>
              <strong className="text-gray-200">Minimum reusable offcut size:</strong> Length and
              width thresholds (for example 100 × 100 mm). Pieces at or above this return to
              inventory as offcuts; smaller scraps are treated as waste.
            </li>
            <li>
              <strong className="text-gray-200">Timber species:</strong> Add or rename lumber types
              in Settings (for example Birch Plywood or Jarrah). These appear in Quick Log and
              Projects &amp; Cuts when you pick wood species.
            </li>
            <li>
              <strong className="text-gray-200">Suppliers:</strong> Maintain the list used by Quick
              Log when source is New or Purchased (you can still pick Other… while logging).
            </li>
            <li>
              <strong className="text-gray-200">Storage locations:</strong> Add racks, bins, shed
              shelves, and benches that match your shop so Quick Log can tag where each lot sits.
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-orange-300">Step 2 · Log your first inventory</h4>
          <p className="text-xs text-gray-400">
            Take a tape to the rack or offcut bin and log a few boards in{' '}
            <strong className="text-gray-200">Quick Log</strong> (3 to 5 lots is enough to try
            nesting).
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-400">
            <li>
              <strong className="text-gray-200">Dimensions:</strong> Length × Width × Thickness in
              your chosen units, plus quantity for identical boards in one lot.
            </li>
            <li>
              <strong className="text-gray-200">Species / material:</strong> Pick from your lumber
              types in Settings (defaults include Pine / Pallet, Walnut, European Oak, and more).
              Logger assigns a lot tag id from the species prefix.
            </li>
            <li>
              <strong className="text-gray-200">Source:</strong> New, pallet, salvaged, cut-off,
              furniture teardown, offcut bin, or purchased.
            </li>
            <li>
              <strong className="text-gray-200">Description or Supplier (optional):</strong> Beside
              storage location. Salvaged or Furniture Teardown opens Description (e.g. bedhead,
              stool leg). New or Purchased opens Supplier — choose from Settings or Other….
            </li>
            <li>
              <strong className="text-gray-200">Defects &amp; condition:</strong> Flag warp, knots,
              checks, live edge, waney edges, nail or screw holes, and similar. Optional defect
              notes travel onto pull tags when that lot is used.
            </li>
            <li>
              <strong className="text-gray-200">Storage location:</strong> Choose the rack or bin so
              you can find the board later from Inventory or a QR scan.
            </li>
          </ul>
          <p className="text-[11px] text-gray-500">
            Quick Log stays open after each save so you can add several lots. Review them under
            Inventory. Print a Stock Tag (System Print or Save PNG) if you want rack labels you can
            scan later.
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-orange-300">
            Step 3 · Create a project and parts list
          </h4>
          <p className="text-xs text-gray-400">
            Open <strong className="text-gray-200">Projects &amp; Cuts</strong> to set up a build and
            see the yield engine work against your stock.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-400">
            <li>
              <strong className="text-gray-200">Project name:</strong> Something clear such as Dining
              Table or Shop Cabinet (required before generating sheets).
            </li>
            <li>
              <strong className="text-gray-200">Parts list:</strong> Add each finished piece with
              name, species, thickness × width × length, and quantity.
            </li>
            <li>
              <strong className="text-gray-200">Strategy &amp; kerf:</strong> Leave{' '}
              <em>Let Logger Decide</em> unless you prefer rip-first or crosscut-first. Kerf
              defaults from Settings.
            </li>
            <li>
              Click <strong className="text-gray-200">Save project</strong> so it stays in your
              project library (you can pause and resume if stock is short).
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-bold text-orange-300">
            Step 4 · Run the cut list and nesting engine
          </h4>
          <p className="text-xs text-gray-400">
            Match project parts to logged lumber and get shop-ready layouts.
          </p>
          <ol className="list-decimal pl-5 space-y-1.5 text-xs text-gray-400">
            <li>
              Click <strong className="text-gray-200">Generate instructions</strong>. If stock does
              not fit, stock check explains each part (required vs on hand) and lets you laminate
              thin solid timber, acknowledge planing thicker solid stock, skip a part, pause to buy
              stock, or generate what already fits. Sheet goods must match thickness exactly.
            </li>
            <li>
              Review the visual cut sheets: rip and crosscut passes aimed at higher yield and less
              waste. Laminate layers show as reserved stock — glue and plane before cutting, then
              re-log leftovers in Quick Log when prompted.
            </li>
            <li>
              Confirm cuts one at a time or mark all remaining complete. Usable remnants at or above
              your minimum offcut size return to inventory; true scrap is retired. Finished pieces
              show as staged until you mark them installed.
            </li>
          </ol>
        </div>

        <div className="space-y-2 border-t border-gray-800 pt-3">
          <h4 className="text-sm font-bold text-gray-200">What to try next</h4>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-gray-400">
            <li>
              <strong className="text-gray-200">What Can I Build? (in development)</strong> ranks
              templates and saved projects against stock on hand.
            </li>
            <li>
              <strong className="text-gray-200">QR Scanner</strong> looks up a board from a printed
              tag at the rack (camera, photo, or typed tag id).
            </li>
            <li>
              Keep location names consistent between Settings and Quick Log so filters stay useful.
            </li>
            <li>
              Open <strong className="text-gray-200">Help</strong> in the footer for tab screenshots
              and FAQ.
            </li>
          </ul>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 border-t border-gray-800 pt-4">
        Copyright (c) {new Date().getFullYear()} The Novita Group Pty Ltd · {version}
      </p>
    </div>
  );
}
