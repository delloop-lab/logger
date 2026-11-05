'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Printer,
  Bluetooth,
  Sliders,
  RefreshCw,
  Download,
  Terminal,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import type { Board } from '@/lib/store';
import { formatDimsLWT } from '@/lib/units';
import type { UnitSystem } from '@/lib/units';
import AppModal from '@/components/AppModal';
import { toast } from '@/lib/notify';

type Props = {
  board: Board | null;
  unitSystem: UnitSystem;
  onClose: () => void;
};

export interface TiMiniCliConfig {
  bluetooth: string;
  printerModel: string;
  serial: string;
  darkness: number;
  imageMode: 'grayscale' | 'atkinson' | 'floyd_steinberg' | 'bayer_4' | 'bayer_8' | 'threshold';
  paper: string;
}

interface DiscoveredPrinter {
  raw: string;
  name: string;
  profile: string;
  model: string;
  source: string;
  address: string;
  transport: string;
  paired: boolean;
}

const STORAGE_KEY = 'timbervault_timini_cli_config_v3';

const DEFAULT_CONFIG: TiMiniCliConfig = {
  bluetooth: 'MXW01',
  printerModel: 'v5x',
  serial: '',
  darkness: 5,
  imageMode: 'threshold',
  paper: 'plain_384r',
};

/** Payload encoded in printed labels — scanner reads this back to tagId. */
export function boardLabelQrValue(tagId: string) {
  return tagId.trim().toUpperCase();
}

/**
 * Renders the Logger board label (branding header + QR code + stock metadata)
 * onto an offscreen 1-bit pure black/white (#000000 / #FFFFFF) 384px-wide thermal
 * label canvas (58mm @ 203 DPI) with zero grey anti-aliased pixels, exact 5px
 * integer QR module scaling (29 × 5 = 145px), and reinforced bold stroke text.
 */
export async function renderBoardLabelToPngDataUrl(
  board: Board,
  unitSystem: UnitSystem,
  svgElement: SVGSVGElement | null
): Promise<string> {
  const width = 384; // Standard 58mm thermal printer dot width (384 dots @ 203 dpi)
  const height = 240;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not initialize 2D canvas context');

  ctx.imageSmoothingEnabled = false;

  // 1. Pure white background (#FFFFFF)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2. Solid 4px outer frame border (pure #000000 rectangles, no half-pixel stroke anti-aliasing)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, 4);
  ctx.fillRect(0, height - 4, width, 4);
  ctx.fillRect(0, 0, 4, height);
  ctx.fillRect(width - 4, 0, 4, height);

  // 3. Top Logger branding banner (34px tall solid black header)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, 34);

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.font = '900 16px "Arial Black", Impact, sans-serif';
  ctx.fillText('LOGGER', 10, 18);

  ctx.font = '900 11px Consolas, "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('STOCK TAG', width - 10, 18);
  ctx.textAlign = 'left';

  // 4. Draw QR code at exact integer module multiple (29 modules × 5px = 145×145px)
  // with crispEdges and strict 128 luminance binarization so modules never merge or blur
  if (svgElement) {
    const qrSize = 145;
    const qrCanvas = document.createElement('canvas');
    qrCanvas.width = qrSize;
    qrCanvas.height = qrSize;
    const qrCtx = qrCanvas.getContext('2d', { willReadFrequently: true });
    if (qrCtx) {
      qrCtx.imageSmoothingEnabled = false;
      qrCtx.fillStyle = '#ffffff';
      qrCtx.fillRect(0, 0, qrSize, qrSize);

      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgElement);
      if (!svgString.includes('xmlns=')) {
        svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!svgString.includes('shape-rendering=')) {
        svgString = svgString.replace('<svg', '<svg shape-rendering="crispEdges"');
      }
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = url;
        });
        qrCtx.drawImage(img, 0, 0, qrSize, qrSize);
      } finally {
        URL.revokeObjectURL(url);
      }

      const qrData = qrCtx.getImageData(0, 0, qrSize, qrSize);
      for (let i = 0; i < qrData.data.length; i += 4) {
        const v = qrData.data[i] < 128 ? 0 : 255;
        qrData.data[i] = v;
        qrData.data[i + 1] = v;
        qrData.data[i + 2] = v;
        qrData.data[i + 3] = 255;
      }
      qrCtx.putImageData(qrData, 0, 0);
      // Place QR at (14, 46) preserving a >=10px pure-white quiet zone on all 4 sides
      ctx.drawImage(qrCanvas, 14, 46);
    }
  }

  // 5. Solid 3px vertical divider between QR quiet zone and stock metadata (from header to footer bar)
  ctx.fillStyle = '#000000';
  ctx.fillRect(171, 34, 3, 198 - 34);

  // 6. Render thickened stock metadata on a dedicated text layer and binarize at luminance <= 215
  // so every anti-aliased glyph edge turns into solid #000000 thermal dots without affecting QR geometry
  const textCanvas = document.createElement('canvas');
  textCanvas.width = width;
  textCanvas.height = height;
  const tCtx = textCanvas.getContext('2d', { willReadFrequently: true });
  if (tCtx) {
    tCtx.imageSmoothingEnabled = false;
    tCtx.fillStyle = '#ffffff';
    tCtx.fillRect(0, 0, width, height);
    tCtx.fillStyle = '#000000';
    tCtx.strokeStyle = '#000000';
    tCtx.textBaseline = 'top';

    const drawBoldText = (
      text: string,
      x: number,
      y: number,
      font: string,
      maxW: number,
      extraStroke = 0.6
    ) => {
      tCtx.font = font;
      if (extraStroke > 0) {
        tCtx.lineWidth = extraStroke;
        tCtx.strokeText(text, x, y, maxW);
      }
      tCtx.fillText(text, x, y, maxW);
    };

    const textX = 180;
    const maxTextW = width - textX - 8;

    // Stock ID (Tag ID) — extra large bold
    drawBoldText(
      board.tagId,
      textX,
      40,
      '900 28px Consolas, "Courier New", monospace',
      maxTextW,
      1.1
    );

    // Solid 3px horizontal bar under Tag ID
    tCtx.fillRect(174, 75, width - 178, 3);

    // Wood Species — larger bold sans-serif
    drawBoldText(
      board.species || 'Unknown Species',
      textX,
      84,
      '900 22px Arial, sans-serif',
      maxTextW,
      0.8
    );

    // Dimensions (L × W × T) — larger bold monospace
    const dimsText = formatDimsLWT(board.length, board.width, board.thickness, unitSystem);
    drawBoldText(
      dimsText,
      textX,
      118,
      '900 19px Consolas, "Courier New", monospace',
      maxTextW,
      0.8
    );

    // Storage Location — larger bold monospace (Source omitted per workshop label spec)
    drawBoldText(
      `Loc: ${board.location || 'None'}`,
      textX,
      154,
      '900 19px Consolas, "Courier New", monospace',
      maxTextW,
      0.8
    );

    // Solid 2px horizontal bar above footer
    tCtx.fillRect(4, 198, width - 8, 2);

    // Footer note
    drawBoldText(
      'SCAN QR FOR STOCK LOT',
      14,
      206,
      '900 14px Consolas, "Courier New", monospace',
      width - 28,
      0.6
    );

    const tData = tCtx.getImageData(0, 0, width, height);
    const mainData = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < tData.data.length; i += 4) {
      const lum = (tData.data[i] * 77 + tData.data[i + 1] * 150 + tData.data[i + 2] * 29) >> 8;
      if (lum <= 215) {
        mainData.data[i] = 0;
        mainData.data[i + 1] = 0;
        mainData.data[i + 2] = 0;
        mainData.data[i + 3] = 255;
      }
    }

    // Binarize top banner (white text on solid black background) to strictly 0 or 255
    for (let y = 0; y < 34; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const v = mainData.data[idx] > 110 ? 255 : 0;
        mainData.data[idx] = v;
        mainData.data[idx + 1] = v;
        mainData.data[idx + 2] = v;
        mainData.data[idx + 3] = 255;
      }
    }

    ctx.putImageData(mainData, 0, 0);
  }

  return canvas.toDataURL('image/png');
}

export default function BoardLabelPrint({ board, unitSystem, onClose }: Props) {
  const qrWrapRef = useRef<HTMLDivElement | null>(null);
  const [config, setConfig] = useState<TiMiniCliConfig>(DEFAULT_CONFIG);
  const [showCliSettings, setShowCliSettings] = useState(false);

  const [cliReady, setCliReady] = useState<boolean | null>(null);
  const [cliPath, setCliPath] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Checking local TiMini CLI...');
  const [lastResult, setLastResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [activeOperation, setActiveOperation] = useState<
    'idle' | 'printing' | 'scanning' | 'feeding' | 'retracting'
  >('idle');
  const [discoveredPrinters, setDiscoveredPrinters] = useState<DiscoveredPrinter[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<TiMiniCliConfig>;
        setConfig((prev) => ({
          ...prev,
          ...parsed,
          bluetooth: parsed.bluetooth ?? DEFAULT_CONFIG.bluetooth,
          printerModel: parsed.printerModel ?? DEFAULT_CONFIG.printerModel,
          darkness: parsed.darkness ?? DEFAULT_CONFIG.darkness,
          imageMode: parsed.imageMode ?? DEFAULT_CONFIG.imageMode,
          paper: parsed.paper ?? DEFAULT_CONFIG.paper,
        }));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const checkCliStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/timini-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' }),
      });
      const data = await res.json();
      setCliReady(Boolean(data.cliAvailable));
      setCliPath(data.cliPath || '');
      if (data.cliAvailable) {
        setStatusMessage('TiMini CLI ready');
      } else {
        setStatusMessage(data.error || 'TiMini CLI not found');
      }
    } catch {
      setCliReady(false);
      setStatusMessage('Could not reach /api/timini-print');
    }
  }, []);

  useEffect(() => {
    if (board) {
      setLastResult(null);
      void checkCliStatus();
    }
  }, [board, checkCliStatus]);

  const updateConfig = (patch: Partial<TiMiniCliConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  if (!board) return null;

  const isBusy = activeOperation !== 'idle';

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleDownloadPng = async () => {
    try {
      const svgEl = qrWrapRef.current?.querySelector('svg') || null;
      const dataUrl = await renderBoardLabelToPngDataUrl(board, unitSystem, svgEl);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `label-${board.tagId}.png`;
      a.click();
      toast.success(`Saved label-${board.tagId}.png`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate label PNG');
    }
  };

  const handleTiMiniPrint = async () => {
    if (isBusy) return;
    setActiveOperation('printing');
    setLastResult(null);
    setStatusMessage(
      `Connecting to ${config.bluetooth || 'MXW01'} (darkness ${config.darkness}/5) & sending label...`
    );

    try {
      const svgEl = qrWrapRef.current?.querySelector('svg') || null;
      const imageBase64 = await renderBoardLabelToPngDataUrl(board, unitSystem, svgEl);

      const res = await fetch('/api/timini-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'print',
          imageBase64,
          bluetooth: config.bluetooth,
          printerModel: config.printerModel,
          serial: config.serial,
          darkness: config.darkness,
          imageMode: config.imageMode,
          paper: config.paper,
          trimSideMargins: false,
          trimTopBottomMargins: false,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'TiMini CLI print failed');
      }

      const successMsg = `Printed label ${board.tagId} on ${config.bluetooth || 'MXW01'} (darkness ${config.darkness}/5)`;
      setLastResult({ ok: true, message: successMsg });
      setStatusMessage('Print completed');
      toast.success(successMsg);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'TiMini CLI print failed';
      setLastResult({ ok: false, message: msg });
      setStatusMessage('Print failed');
      toast.error(msg);
    } finally {
      setActiveOperation('idle');
    }
  };

  const handlePaperMotion = async (motion: 'feed' | 'retract') => {
    if (isBusy) return;
    setActiveOperation(motion === 'feed' ? 'feeding' : 'retracting');
    setLastResult(null);
    setStatusMessage(
      `${motion === 'feed' ? 'Advancing' : 'Retracting'} paper on ${config.bluetooth || 'MXW01'}...`
    );

    try {
      const res = await fetch('/api/timini-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: motion,
          bluetooth: config.bluetooth,
          printerModel: config.printerModel,
          serial: config.serial,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Failed to ${motion} paper`);
      }
      const msg = `Paper ${motion === 'feed' ? 'advanced' : 'retracted'} (${config.bluetooth || 'MXW01'})`;
      setLastResult({ ok: true, message: msg });
      setStatusMessage('Ready');
      toast.success(msg);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Failed to ${motion} paper`;
      setLastResult({ ok: false, message: msg });
      setStatusMessage('Paper motion failed');
      toast.error(msg);
    } finally {
      setActiveOperation('idle');
    }
  };

  const handleScanPrinters = async () => {
    if (isBusy) return;
    setActiveOperation('scanning');
    setLastResult(null);
    setStatusMessage('Scanning Bluetooth for thermal printers (about 15 to 20s)...');

    try {
      const res = await fetch('/api/timini-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Bluetooth scan failed');
      }

      const list: DiscoveredPrinter[] = Array.isArray(data.printers) ? data.printers : [];
      setDiscoveredPrinters(list);

      const mxw = list.find((p) => p.name.toUpperCase().includes('MXW01'));
      if (mxw) {
        updateConfig({ bluetooth: mxw.name, printerModel: mxw.model || 'v5x' });
        setLastResult({
          ok: true,
          message: `Found ${mxw.name} (${mxw.address}) [${mxw.transport.toUpperCase()} · profile ${mxw.profile}]`,
        });
        setStatusMessage(`Connected target: ${mxw.name} (${mxw.address})`);
      } else if (list.length > 0) {
        setLastResult({
          ok: true,
          message: `Found ${list.length} printer(s): ${list.map((p) => `${p.name} (${p.address})`).join(', ')}`,
        });
        setStatusMessage(`Found ${list.length} printer(s)`);
      } else {
        setLastResult({
          ok: false,
          message:
            'No supported printers found during scan. Ensure MXW01 is switched on and disconnected from TiMini GUI.',
        });
        setStatusMessage('No printers found');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bluetooth scan failed';
      setLastResult({ ok: false, message: msg });
      setStatusMessage('Scan failed');
    } finally {
      setActiveOperation('idle');
    }
  };

  return (
    <div data-allow-demo>
      <AppModal
        open={Boolean(board)}
        onClose={onClose}
        title={`Print label · ${board.tagId}`}
        subtitle="QR encodes the tag ID for the workshop scanner."
        size="md"
      >
        {/* Visual Preview & Browser Print Target */}
        <div
          id="timbervault-board-label"
          className="bg-white text-black rounded-xl border-[3px] border-black print:rounded-none"
        >
          <div className="board-label-header bg-black text-white px-4 py-1.5 flex items-center justify-between font-mono">
            <span className="board-label-brand text-xs font-black tracking-wider">LOGGER</span>
            <span className="board-label-subtitle text-[10px] font-black text-white tracking-wide">
              STOCK TAG
            </span>
          </div>
          <div className="board-label-body p-4 flex items-start gap-4">
            <div ref={qrWrapRef} className="board-label-qr shrink-0 bg-white p-1">
              <QRCodeSVG
                value={boardLabelQrValue(board.tagId)}
                size={145}
                level="M"
                includeMargin={false}
                className="shrink-0"
                style={{ shapeRendering: 'crispEdges' }}
              />
            </div>
            <div className="board-label-meta min-w-0 flex-1 space-y-2 font-mono border-l-[3px] border-black pl-3.5">
              <div className="board-label-tag text-2xl font-black tracking-wide border-b-2 border-black pb-1 text-black">
                {board.tagId}
              </div>
              <div className="board-label-species font-sans font-black text-lg text-black leading-tight">
                {board.species}
              </div>
              <div className="board-label-dims text-base font-black text-black leading-tight">
                {formatDimsLWT(board.length, board.width, board.thickness, unitSystem)}
              </div>
              <div className="board-label-loc text-base font-black text-black leading-tight">
                Loc: {board.location || 'None'}
              </div>
            </div>
          </div>
        </div>

        {/* Printer Status Bar */}
        <div className="no-print bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isBusy
                  ? 'bg-amber-400 animate-pulse'
                  : cliReady
                    ? 'bg-emerald-400'
                    : cliReady === false
                      ? 'bg-red-500'
                      : 'bg-gray-500'
              }`}
            />
            <div className="truncate">
              <span className="font-bold text-white">
                Printer: {config.bluetooth || 'Auto-detect'}
              </span>{' '}
              <span className="text-gray-400 font-mono text-[11px]">
                [{config.printerModel || 'v5x'} · {config.imageMode} · darkness {config.darkness}/5]
              </span>
              <div className="text-[11px] text-gray-400 truncate">{statusMessage}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleScanPrinters}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-orange-400 rounded-lg text-[11px] font-bold cursor-pointer shrink-0"
            title="Scan nearby Bluetooth printers"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${activeOperation === 'scanning' ? 'animate-spin' : ''}`}
            />
            {activeOperation === 'scanning' ? 'Scanning...' : 'Scan Bluetooth'}
          </button>
        </div>

        {/* Feedback Banner */}
        {lastResult && (
          <div
            className={`no-print rounded-xl px-3.5 py-2.5 text-xs flex items-start gap-2 border ${
              lastResult.ok
                ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                : 'bg-red-950/40 border-red-700/60 text-red-200'
            }`}
          >
            {lastResult.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <span className="leading-snug break-words">{lastResult.message}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="no-print space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleTiMiniPrint}
              disabled={isBusy || cliReady === false}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-orange-600/25"
            >
              {activeOperation === 'printing' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Bluetooth className="w-4 h-4" />
              )}
              {activeOperation === 'printing'
                ? `Printing to ${config.bluetooth || 'MXW01'}...`
                : `Print Label (${config.bluetooth || 'MXW01'})`}
            </button>

            <button
              type="button"
              onClick={handleBrowserPrint}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl cursor-pointer border border-gray-700"
            >
              <Printer className="w-4 h-4" /> System / Browser Print
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
            <button
              type="button"
              onClick={() => setShowCliSettings((v) => !v)}
              className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white font-semibold cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-orange-400" />
              {showCliSettings ? 'Hide printer options' : 'Printer options & paper feed'}
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
              title="Download 384px thermal label PNG"
            >
              <Download className="w-3.5 h-3.5" /> Save PNG
            </button>
          </div>

          {showCliSettings && (
            <div className="bg-[#121417] border border-gray-800 rounded-xl p-3.5 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-orange-500" /> MXW-01 / TiMini Configuration
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePaperMotion('feed')}
                    disabled={isBusy || cliReady === false}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 rounded-lg text-[11px] font-semibold cursor-pointer"
                    title="Advance thermal paper (--feed)"
                  >
                    <ArrowUp className="w-3 h-3 text-emerald-400" />
                    {activeOperation === 'feeding' ? 'Feeding...' : 'Feed'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaperMotion('retract')}
                    disabled={isBusy || cliReady === false}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 rounded-lg text-[11px] font-semibold cursor-pointer"
                    title="Retract thermal paper (--retract)"
                  >
                    <ArrowDown className="w-3 h-3 text-amber-400" />
                    {activeOperation === 'retracting' ? 'Retracting...' : 'Retract'}
                  </button>
                </div>
              </div>

              {discoveredPrinters.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] text-gray-400">Discovered Bluetooth printers:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {discoveredPrinters.map((p) => (
                      <button
                        key={`${p.address}-${p.name}`}
                        type="button"
                        onClick={() =>
                          updateConfig({
                            bluetooth: p.name,
                            printerModel: p.model || 'v5x',
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border cursor-pointer ${
                          config.bluetooth === p.name || config.bluetooth === p.address
                            ? 'bg-orange-600/20 border-orange-500 text-orange-300 font-bold'
                            : 'bg-[#1e2228] border-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {p.name} ({p.address}) [{p.profile}]
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Target Printer (<code>--bluetooth</code>)
                  </label>
                  <input
                    type="text"
                    value={config.bluetooth}
                    onChange={(e) => updateConfig({ bluetooth: e.target.value })}
                    placeholder="MXW01 or 48:0F:57:C4:4F:B0"
                    className="w-full bg-[#1e2228] border border-gray-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Model / Profile Key (<code>--printer-model</code>)
                  </label>
                  <input
                    type="text"
                    value={config.printerModel}
                    onChange={(e) => updateConfig({ printerModel: e.target.value })}
                    placeholder="v5x (MXW01 default)"
                    className="w-full bg-[#1e2228] border border-gray-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Image Mode (<code>--image-mode</code>)
                  </label>
                  <select
                    value={config.imageMode}
                    onChange={(e) =>
                      updateConfig({
                        imageMode: e.target.value as TiMiniCliConfig['imageMode'],
                      })
                    }
                    className="w-full bg-[#1e2228] border border-gray-700 rounded-lg px-2 py-1.5 text-white font-mono text-[11px]"
                  >
                    <option value="threshold">threshold (sharp 1-bit)</option>
                    <option value="atkinson">atkinson</option>
                    <option value="floyd_steinberg">floyd_steinberg</option>
                    <option value="bayer_4">bayer_4</option>
                    <option value="bayer_8">bayer_8</option>
                    <option value="grayscale">grayscale (v5x 4-bit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Darkness 1 to 5 (<code>--darkness</code>)
                  </label>
                  <select
                    value={config.darkness}
                    onChange={(e) => updateConfig({ darkness: Number(e.target.value) })}
                    className="w-full bg-[#1e2228] border border-gray-700 rounded-lg px-2 py-1.5 text-white font-mono text-[11px]"
                  >
                    {[5, 4, 3, 2, 1].map((d) => (
                      <option key={d} value={d}>
                        {d} {d === 5 ? '(max black default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">
                    Paper Preset (<code>--paper</code>)
                  </label>
                  <select
                    value={config.paper}
                    onChange={(e) => updateConfig({ paper: e.target.value })}
                    className="w-full bg-[#1e2228] border border-gray-700 rounded-lg px-2 py-1.5 text-white font-mono text-[11px]"
                  >
                    <option value="plain_384r">plain_384r (Continuous 58mm)</option>
                    <option value="tag_384r">tag_384r (Gap Label 58mm)</option>
                    <option value="">Profile default</option>
                  </select>
                </div>
              </div>

              {cliPath && (
                <div className="pt-1 border-t border-gray-800/80 text-[10px] font-mono text-gray-500 truncate">
                  CLI Binary: {cliPath}
                </div>
              )}
            </div>
          )}
        </div>
      </AppModal>
    </div>
  );
}
