'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Camera, Search, CameraOff, SwitchCamera, ImageUp } from 'lucide-react';
import { toast } from '@/lib/notify';
import { useAppStore, Board } from '@/lib/store';
import { formatDefectsList, hasDefects } from '@/lib/defects';
import { formatDimsLWT } from '@/lib/units';
import { extractTagFromScan } from '@/lib/qr-tag';
import { useCameraStream } from '@/hooks/useCameraStream';
import { useQrFromVideo } from '@/hooks/useQrFromVideo';

export default function ScannerTab() {
  const boards = useAppStore((s) => s.boards);
  const unitSystem = useAppStore((s) => s.unitSystem);
  const demoPreview = useAppStore((s) => s.demoPreview);

  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Board | null>(null);
  const [lastRaw, setLastRaw] = useState<string | null>(null);
  const [fileBusy, setFileBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const camera = useCameraStream();

  const activeCount = useMemo(
    () => boards.filter((b) => b.status === 'active').length,
    [boards]
  );

  const lookup = useCallback(
    (raw: string) => {
      const tag = extractTagFromScan(raw);
      setLastRaw(raw.trim());
      setQuery(tag);
      if (!tag) {
        toast.error('Could not read a tag from that scan.');
        return;
      }

      const board =
        boards.find((b) => b.tagId.toUpperCase() === tag) ||
        boards.find((b) => tag.startsWith(b.tagId.toUpperCase() + '-')) ||
        boards.find((b) => b.tagId.toUpperCase().startsWith(tag));

      if (!board) {
        setFound(null);
        toast.error(`No board found for ${tag}`);
        return;
      }
      setFound(board);
      toast.success(`Found ${board.tagId}`);
    },
    [boards]
  );

  useQrFromVideo(camera.videoRef, camera.isLive && !camera.isTransitioning, lookup);

  const handlePhotoScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFileBusy(true);
    const host = document.createElement('div');
    host.id = `tv-qr-file-${Date.now()}`;
    host.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
    document.body.appendChild(host);

    try {
      // Try native BarcodeDetector first
      if (typeof window !== 'undefined' && window.BarcodeDetector) {
        const bmp = await createImageBitmap(file);
        const det = new window.BarcodeDetector({ formats: ['qr_code'] });
        const codes = await det.detect(bmp);
        bmp.close?.();
        const raw = codes[0]?.rawValue;
        if (raw) {
          lookup(raw);
          return;
        }
      }

      const qr = new Html5Qrcode(host.id, { verbose: false });
      const text = await qr.scanFile(file, false);
      try {
        qr.clear();
      } catch {
        /* ignore */
      }
      lookup(text);
    } catch {
      toast.error('No QR code found in that image. Try a clearer close-up of the label.');
    } finally {
      host.remove();
      setFileBusy(false);
    }
  };

  const defectLabel = found ? formatDefectsList(found.defects, found.defectNotes) : null;
  const locked = camera.isTransitioning;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl text-center space-y-3 shadow-xl">
        <div className="bg-orange-600/20 border border-orange-500/30 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-orange-500">
          <QrCode className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white">QR / Tag Lookup</h3>
        <p className="text-sm text-gray-400">
          Point the camera at a printed board label, or upload a photo of the QR.
          {activeCount > 0 ? (
            <>
              {' '}
              <span className="text-gray-300 font-mono">{activeCount}</span> available boards
              {demoPreview ? ' (demo)' : ' in stock'}.
            </>
          ) : (
            <> Log stock first so scans can match inventory.</>
          )}
        </p>
      </div>

      <div className="bg-[#1e2228] border border-gray-800 p-5 rounded-2xl space-y-4 shadow-xl">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoScan}
          className="hidden"
        />

        <div className="flex flex-wrap gap-2 justify-center">
          {!camera.isLive ? (
            <button
              type="button"
              disabled={locked}
              onClick={() => void camera.start()}
              className="px-5 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-600/30"
            >
              <Camera className="w-4 h-4" />
              {locked ? 'Starting…' : 'Start camera'}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={locked}
                onClick={() => void camera.stop()}
                className="px-5 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <CameraOff className="w-4 h-4" /> Stop camera
              </button>
              {camera.devices.length > 1 && (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => void camera.flip()}
                  className="px-5 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer"
                >
                  <SwitchCamera className="w-4 h-4" />
                  {locked ? 'Switching…' : 'Flip camera'}
                </button>
              )}
            </>
          )}

          <button
            type="button"
            disabled={fileBusy}
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer"
          >
            <ImageUp className="w-4 h-4" />
            {fileBusy ? 'Reading…' : 'Scan QR from photo'}
          </button>
        </div>

        {(camera.isLive || locked) && (
          <p className="text-[10px] text-gray-500 text-center font-mono truncate">
            {camera.devices.length > 0
              ? `Camera ${camera.deviceIndex + 1}/${camera.devices.length}${
                  camera.devices[camera.deviceIndex]?.label
                    ? ` · ${camera.devices[camera.deviceIndex].label}`
                    : ''
                }`
              : 'Camera'}
            {camera.isLive ? ' · live' : locked ? ' · starting…' : ''}
          </p>
        )}

        {camera.error && (
          <div className="space-y-2">
            <p className="text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-xl px-3 py-2 text-center">
              {camera.error}
            </p>
            {!camera.isLive && (
              <button
                type="button"
                disabled={locked}
                onClick={() => void camera.retry()}
                className="w-full px-4 py-2.5 bg-orange-600/90 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Retry Start Camera
              </button>
            )}
          </div>
        )}

        <div
          className={`relative overflow-hidden rounded-xl border border-gray-800 bg-[#121417] ${
            camera.isLive || locked ? 'min-h-[280px]' : 'hidden'
          }`}
        >
          <video
            ref={camera.videoRef}
            playsInline
            muted
            autoPlay
            className="w-full max-h-[360px] object-cover rounded-xl bg-black"
          />
          {locked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-mono text-gray-200">
              Starting camera…
            </div>
          )}
        </div>

        {!camera.isLive && !camera.error && !locked && (
          <p className="text-[11px] text-gray-500 text-center font-mono">
            Tap Start camera, or Scan QR from photo (uses phone camera or a saved image).
          </p>
        )}
      </div>

      <div className="bg-[#1e2228] border border-gray-800 p-5 rounded-2xl space-y-3 shadow-xl">
        <label className="block text-xs font-medium text-gray-400">Manual tag lookup</label>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') lookup(query);
            }}
            placeholder="e.g. PIN-001-1"
            className="flex-1 bg-[#121417] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
          />
          <button
            type="button"
            onClick={() => lookup(query)}
            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" /> Find
          </button>
        </div>
        {lastRaw && lastRaw.toUpperCase() !== query && (
          <p className="text-[10px] text-gray-500 font-mono truncate">Last scan: {lastRaw}</p>
        )}
      </div>

      {found && (
        <div className="bg-[#121417] border border-emerald-800/50 rounded-2xl p-5 text-left text-xs font-mono space-y-2 shadow-xl">
          <div className="text-emerald-400 font-bold text-base font-sans">{found.tagId}</div>
          <div className="text-gray-300 font-sans">
            {found.species} · {found.source}
          </div>
          <div className="text-gray-400">
            {formatDimsLWT(found.length, found.width, found.thickness, unitSystem)}
            {(found.quantity || 1) > 1 ? ` · qty ${found.quantity}` : ''}
          </div>
          <div className="text-gray-400">Location: {found.location || 'None'}</div>
          <div className="text-gray-500">
            Status: {found.status}
            {found.classification ? ` · ${found.classification}` : ''}
            {found.originProject ? ` · project ${found.originProject}` : ''}
          </div>
          {hasDefects(found.defects, found.defectNotes) && defectLabel && (
            <div className="text-amber-300 pt-1 border-t border-gray-800">{defectLabel}</div>
          )}
        </div>
      )}
    </div>
  );
}
