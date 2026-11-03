'use client';

import React, { useMemo, useState } from 'react';
import { QrCode, Camera, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore, Board } from '@/lib/store';
import { formatDimsLWT } from '@/lib/units';

export default function ScannerTab() {
  const boards = useAppStore((s) => s.boards);
  const unitSystem = useAppStore((s) => s.unitSystem);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Board | null>(null);

  const activeTags = useMemo(
    () => boards.filter((b) => b.status === 'active').map((b) => b.tagId),
    [boards]
  );

  const lookup = (raw: string) => {
    const tag = raw.trim().toUpperCase();
    if (!tag) {
      toast.error('Enter or scan a tag ID.');
      return;
    }
    const board = boards.find((b) => b.tagId.toUpperCase() === tag);
    if (!board) {
      setFound(null);
      toast.error(`No board found for ${tag}`);
      return;
    }
    setFound(board);
    toast.success(`Found ${board.tagId}`);
  };

  const simulateScan = () => {
    if (activeTags.length === 0) {
      toast.error('No active boards to scan. Log inventory first.');
      return;
    }
    const tag = activeTags[0];
    setQuery(tag);
    lookup(tag);
  };

  return (
    <div className="bg-[#1e2228] border border-gray-800 p-8 rounded-2xl text-center space-y-6 max-w-xl mx-auto shadow-xl">
      <div className="bg-orange-600/20 border border-orange-500/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-orange-500">
        <QrCode className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white">QR / Tag Lookup</h3>
        <p className="text-sm text-gray-400">
          Enter a timber tag or simulate a camera scan against your live inventory.
        </p>
      </div>

      <div className="bg-[#121417] border border-gray-800 p-6 rounded-xl space-y-4 text-left">
        <label className="block text-xs font-medium text-gray-400">Tag ID</label>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. PIN-101"
            className="flex-1 bg-[#1e2228] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
          />
          <button
            type="button"
            onClick={() => lookup(query)}
            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" /> Find
          </button>
        </div>

        <button
          type="button"
          onClick={simulateScan}
          className="w-full bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Camera className="w-4 h-4" /> Simulate Camera Scan
        </button>

        <p className="text-[11px] text-gray-500 font-mono text-center">
          Live camera QR decoding will be wired next. Lookup already uses real stock.
        </p>
      </div>

      {found && (
        <div className="bg-[#121417] border border-emerald-800/50 rounded-xl p-4 text-left text-xs font-mono space-y-1">
          <div className="text-emerald-400 font-bold text-sm">{found.tagId}</div>
          <div className="text-gray-300">{found.species} · {found.source}</div>
          <div className="text-gray-400">
            {formatDimsLWT(found.length, found.width, found.thickness, unitSystem)}
          </div>
          <div className="text-gray-400">Location: {found.location}</div>
          <div className="text-gray-500">Status: {found.status}</div>
        </div>
      )}
    </div>
  );
}
