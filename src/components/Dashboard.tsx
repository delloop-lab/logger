'use client';

import React from 'react';
import { useAppStore, DEFAULT_LOCATIONS } from '@/lib/store';
import { Layers, Package, Scissors, MapPin, PlusCircle } from 'lucide-react';
import { areaM2, areaSqFt, formatDimsLWT } from '@/lib/units';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const boards = useAppStore((s) => s.boards);
  const savedProjects = useAppStore((s) => s.savedProjects);
  const activeParts = useAppStore((s) => s.activeParts);
  const unitSystem = useAppStore((s) => s.unitSystem);
  const storageLocations = useAppStore((s) =>
    s.storageLocations?.length ? s.storageLocations : DEFAULT_LOCATIONS
  );

  const isFinished = (b: (typeof boards)[number]) =>
    b.classification === 'finished_piece' || /-PART$/i.test(b.tagId || '');
  /** Pullable stock + offcuts (finished parts are staged, not available). */
  const availableBoards = boards.filter((b) => b.status === 'active' && !isFinished(b));
  const offcuts = availableBoards.filter((b) => b.classification === 'reusable_offcut');
  const stagedFinished = boards.filter((b) => isFinished(b) && b.status !== 'consumed');
  const installedFinished = boards.filter((b) => isFinished(b) && b.status === 'consumed');
  const pieceCount = (list: typeof boards) =>
    list.reduce((sum, b) => sum + (b.quantity || 1), 0);
  const availablePieces = pieceCount(availableBoards);
  const offcutPieces = pieceCount(offcuts);
  const totalArea =
    unitSystem === 'imperial'
      ? availableBoards.reduce(
          (sum, b) => sum + areaSqFt(b.length, b.width, b.quantity || 1),
          0
        )
      : availableBoards.reduce(
          (sum, b) => sum + areaM2(b.length, b.width, b.quantity || 1),
          0
        );

  const speciesBreakdown = availableBoards.reduce<Record<string, number>>((acc, b) => {
    acc[b.species] = (acc[b.species] || 0) + (b.quantity || 1);
    return acc;
  }, {});

  const recent = [...boards]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const stats = [
    {
      label: 'Available stock',
      value: String(availablePieces),
      hint: `${offcutPieces} offcut${offcutPieces === 1 ? '' : 's'} in stock`,
      tone: 'text-white',
    },
    {
      label: 'Active area',
      value:
        unitSystem === 'imperial'
          ? `${totalArea.toFixed(3)} ft²`
          : `${totalArea.toFixed(3)} m²`,
      hint: 'Face area (L × W), available stock',
      tone: 'text-white',
    },
    {
      label: 'Projects',
      value: String(savedProjects.length),
      hint: `${activeParts.length} parts in current cut list`,
      tone: 'text-white',
    },
    {
      label: 'Staged, installed',
      value: `${pieceCount(stagedFinished)} / ${pieceCount(installedFinished)}`,
      hint: 'Finished pieces leave stock when marked installed',
      tone: 'text-orange-400',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-2 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-orange-500" /> Workshop Dashboard
        </h2>
        <p className="text-xs text-gray-400">
          Live view of your timber stock. Start empty, log boards in Quick Log to build inventory.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#1e2228] border border-gray-800 p-5 rounded-2xl">
            <p className="text-sm text-gray-400">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.tone}`}>{s.value}</p>
            <span className="text-xs text-gray-500 mt-2 inline-block">{s.hint}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-500" /> Recent inventory
            </h3>
            <button
              type="button"
              data-nav-tab
              onClick={() => onNavigate('quick-log')}
              className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Quick Log
            </button>
          </div>

          {recent.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-gray-800 rounded-xl space-y-3">
              <p className="text-sm text-gray-400">No timber logged yet.</p>
              <button
                type="button"
                onClick={() => onNavigate('quick-log')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Log your first piece of timber
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((b) => (
                <div
                  key={b.id}
                  className="bg-[#121417] border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs font-mono"
                >
                  <div>
                    <span className="text-orange-400 font-bold">{b.tagId}</span>
                    <span className="text-gray-500 mx-2">,</span>
                    <span className="text-gray-300">{b.species}</span>
                    <div className="text-gray-500 mt-0.5">
                      {formatDimsLWT(b.length, b.width, b.thickness, unitSystem)}, {b.location}
                      {(b.quantity || 1) > 1 ? `, qty ${b.quantity}` : ''}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-gray-400 border border-gray-700 px-2 py-0.5 rounded">
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-white">Species on hand</h3>
            {Object.keys(speciesBreakdown).length === 0 ? (
              <p className="text-xs text-gray-500">Nothing in stock yet.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(speciesBreakdown).map(([species, count]) => (
                  <div key={species} className="flex justify-between text-xs">
                    <span className="text-gray-300">{species}</span>
                    <span className="text-orange-400 font-mono font-bold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-3 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" /> Storage slots
            </h3>
            <p className="text-xs text-gray-400 font-mono">{storageLocations.length} locations configured</p>
            <button
              type="button"
              data-nav-tab
              onClick={() => onNavigate('storage')}
              className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-bold cursor-pointer"
            >
              Manage storage
            </button>
            <button
              type="button"
              data-nav-tab
              onClick={() => onNavigate('cut-list')}
              className="w-full py-2.5 bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/30 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-2"
            >
              <Scissors className="w-3.5 h-3.5" /> Open projects & cut list
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
