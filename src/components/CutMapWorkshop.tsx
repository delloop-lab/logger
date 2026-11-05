'use client';

import React from 'react';
import type { Placement } from '@/lib/cutting-engine';
import { formatDim, type UnitSystem } from '@/lib/units';

type Props = {
  step: Placement;
  allOnBoard: Placement[];
  unitSystem: UnitSystem;
  isCompleted: boolean;
  projectName?: string;
  pullTag?: string;
  stepLabel?: string;
};

const INK = '#111827';
const FAINT = '#6b7280';
const PAPER = '#ffffff';

function cutMark(n: number) {
  return String.fromCharCode(65 + Math.max(0, n) % 26);
}

function DimH({
  x1,
  x2,
  y,
  label,
  tick = 6,
}: {
  x1: number;
  x2: number;
  y: number;
  label: string;
  tick?: number;
}) {
  const a = Math.min(x1, x2);
  const b = Math.max(x1, x2);
  if (b - a < 4) return null;
  return (
    <g stroke={INK} fill={INK} strokeWidth={1.1}>
      <line x1={a} y1={y - tick} x2={a} y2={y + tick} />
      <line x1={b} y1={y - tick} x2={b} y2={y + tick} />
      <line x1={a} y1={y} x2={b} y2={y} />
      <line x1={a - 4} y1={y + 4} x2={a + 4} y2={y - 4} strokeWidth={1.3} />
      <line x1={b - 4} y1={y + 4} x2={b + 4} y2={y - 4} strokeWidth={1.3} />
      <text
        x={(a + b) / 2}
        y={y - 8}
        textAnchor="middle"
        fontSize={13}
        fontFamily="ui-monospace, monospace"
        fontWeight={700}
        stroke="none"
      >
        {label}
      </text>
    </g>
  );
}

function DimV({
  y1,
  y2,
  x,
  label,
  tick = 6,
}: {
  y1: number;
  y2: number;
  x: number;
  label: string;
  tick?: number;
}) {
  const a = Math.min(y1, y2);
  const b = Math.max(y1, y2);
  if (b - a < 4) return null;
  return (
    <g stroke={INK} fill={INK} strokeWidth={1.1}>
      <line x1={x - tick} y1={a} x2={x + tick} y2={a} />
      <line x1={x - tick} y1={b} x2={x + tick} y2={b} />
      <line x1={x} y1={a} x2={x} y2={b} />
      <line x1={x - 4} y1={a - 4} x2={x + 4} y2={a + 4} strokeWidth={1.3} />
      <line x1={x - 4} y1={b - 4} x2={x + 4} y2={b + 4} strokeWidth={1.3} />
      <text
        x={x - 12}
        y={(a + b) / 2}
        textAnchor="middle"
        fontSize={13}
        fontFamily="ui-monospace, monospace"
        fontWeight={700}
        stroke="none"
        transform={`rotate(-90, ${x - 12}, ${(a + b) / 2})`}
      >
        {label}
      </text>
    </g>
  );
}

function Callout({ cx, cy, letter }: { cx: number; cy: number; letter: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={14} fill={PAPER} stroke={INK} strokeWidth={1.8} />
      <text
        x={cx}
        y={cy + 5}
        textAnchor="middle"
        fontSize={14}
        fontFamily="ui-monospace, monospace"
        fontWeight={700}
        fill={INK}
      >
        {letter}
      </text>
    </g>
  );
}

function ShopDefs({ species }: { species: string }) {
  const ply = /ply/i.test(species);
  return (
    <defs>
      <pattern id="shop-grid" width={24} height={24} patternUnits="userSpaceOnUse">
        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#e5e7eb" strokeWidth={0.8} />
      </pattern>
      <pattern id="shop-grid-major" width={120} height={120} patternUnits="userSpaceOnUse">
        <rect width={120} height={120} fill="url(#shop-grid)" />
        <path d="M 120 0 L 0 0 0 120" fill="none" stroke="#d1d5db" strokeWidth={1.1} />
      </pattern>
      <pattern id="shop-grain" width={36} height={14} patternUnits="userSpaceOnUse">
        <rect width={36} height={14} fill="#f3f4f6" />
        {ply ? (
          <>
            <line x1={0} y1={3.5} x2={36} y2={3.5} stroke="#9ca3af" strokeWidth={0.8} />
            <line x1={0} y1={7} x2={36} y2={7} stroke="#6b7280" strokeWidth={1} />
            <line x1={0} y1={10.5} x2={36} y2={10.5} stroke="#9ca3af" strokeWidth={0.8} />
          </>
        ) : (
          <>
            <path
              d="M0 4.5 Q9 2.5 18 4.5 T36 4.5"
              fill="none"
              stroke="#9ca3af"
              strokeWidth={0.7}
            />
            <path
              d="M0 9.5 Q9 7.5 18 9.5 T36 9.5"
              fill="none"
              stroke="#6b7280"
              strokeWidth={0.55}
              opacity={0.7}
            />
          </>
        )}
      </pattern>
      <pattern
        id="shop-hatch"
        width={9}
        height={9}
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width={9} height={9} fill="#f9fafb" />
        <line x1={0} y1={0} x2={0} y2={9} stroke="#4b5563" strokeWidth={1.5} />
      </pattern>
    </defs>
  );
}

function LegendLines({
  x,
  y,
  lines,
}: {
  x: number;
  y: number;
  lines: string[];
}) {
  return (
    <g fontFamily="ui-monospace, monospace" fill={INK} fontWeight={700} fontSize={12}>
      {lines.map((line, i) => (
        <text key={i} x={x} y={y + i * 16}>
          {line}
        </text>
      ))}
    </g>
  );
}

/** Fit board face into a max box without forcing min pixel sizes that distort L×W. */
function fitBoardScale(lenMm: number, widMm: number, maxW = 820, maxH = 320) {
  const L = Math.max(lenMm, 1);
  const W = Math.max(widMm, 1);
  return Math.min(maxW / L, maxH / W);
}

function TitleBlock({
  x,
  y,
  w,
  projectName,
  boardTag,
  species,
  dims,
  op,
  stepLabel,
  pullTag,
}: {
  x: number;
  y: number;
  w: number;
  projectName: string;
  boardTag: string;
  species: string;
  dims: string;
  op: string;
  stepLabel: string;
  pullTag?: string;
}) {
  const blockW = Math.max(w, 560);
  const h = 64;
  const col1 = blockW * 0.38;
  const col2 = blockW * 0.32;
  return (
    <g fontFamily="ui-monospace, monospace" fill={INK}>
      <rect x={x} y={y} width={blockW} height={h} fill={PAPER} stroke={INK} strokeWidth={1.6} />
      <line x1={x + col1} y1={y} x2={x + col1} y2={y + h} stroke={INK} strokeWidth={1} />
      <line x1={x + col1 + col2} y1={y} x2={x + col1 + col2} y2={y + h} stroke={INK} strokeWidth={1} />
      <line x1={x} y1={y + 20} x2={x + blockW} y2={y + 20} stroke={INK} strokeWidth={0.8} />
      <line x1={x} y1={y + 42} x2={x + blockW} y2={y + 42} stroke={INK} strokeWidth={0.8} />

      <text x={x + 10} y={y + 14} fontSize={9} fill={FAINT}>
        PROJECT
      </text>
      <text x={x + 10} y={y + 36} fontSize={13} fontWeight={700}>
        {(projectName || 'unnamed').slice(0, 32)}
      </text>
      <text x={x + 10} y={y + 56} fontSize={11}>
        {stepLabel}
      </text>

      <text x={x + col1 + 10} y={y + 14} fontSize={9} fill={FAINT}>
        STOCK / PULL
      </text>
      <text x={x + col1 + 10} y={y + 36} fontSize={12} fontWeight={700}>
        {(pullTag || boardTag).slice(0, 36)}
      </text>
      <text x={x + col1 + 10} y={y + 56} fontSize={11}>
        {species.slice(0, 32)}
      </text>

      <text x={x + col1 + col2 + 10} y={y + 14} fontSize={9} fill={FAINT}>
        OPERATION
      </text>
      <text x={x + col1 + col2 + 10} y={y + 36} fontSize={12} fontWeight={700}>
        {op}
      </text>
      <text x={x + col1 + col2 + 10} y={y + 56} fontSize={11}>
        {dims}
      </text>
    </g>
  );
}

function SheetFrame({
  children,
  svgW,
  svgH,
  title,
  species,
}: {
  children: React.ReactNode;
  svgW: number;
  svgH: number;
  title: string;
  species: string;
}) {
  const m = 14;
  // Size from viewBox only — forced min-height letterboxed long/narrow boards into ribbons
  return (
    <div className="shop-drawing w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full max-w-none h-auto font-mono"
        style={{ background: PAPER }}
      >
        <ShopDefs species={species} />
        <rect width={svgW} height={svgH} fill={PAPER} />
        <rect
          x={m}
          y={m}
          width={svgW - m * 2}
          height={svgH - m * 2}
          fill="url(#shop-grid-major)"
          stroke={INK}
          strokeWidth={2.2}
        />
        <rect
          x={m + 5}
          y={m + 5}
          width={svgW - m * 2 - 10}
          height={svgH - m * 2 - 10}
          fill="none"
          stroke={INK}
          strokeWidth={0.7}
        />
        <text
          x={m + 14}
          y={m + 22}
          fontSize={12}
          fontWeight={700}
          fill={INK}
          fontFamily="ui-monospace, monospace"
          letterSpacing={0.6}
        >
          {title}
        </text>
        {children}
      </svg>
    </div>
  );
}

/**
 * Shop drafting cut map, white + grid, large external dims, set-aside below (no overlap).
 */
export default function CutMapWorkshop({
  step,
  allOnBoard,
  unitSystem,
  isCompleted,
  projectName = '',
  pullTag,
  stepLabel = '',
}: Props) {
  const isRip = step.opKind === 'rip';
  const isBlank = step.opKind === 'blank';
  const stripKey = step.stripKey;

  // Group every crosscut on this rip channel (same stripKey, or same Y + width)
  const stripParts = allOnBoard
    .filter((s) => {
      if (s.opKind !== 'crosscut') return false;
      if (stripKey && s.stripKey && s.stripKey === stripKey) return true;
      return (
        Math.abs(s.posY - step.posY) < 0.51 &&
        Math.abs(s.cutWid - step.cutWid) < 0.51
      );
    })
    .sort((a, b) => a.posX - b.posX || a.stepIndex - b.stepIndex);

  // Never fall back to an unrelated rip on a multi-strip board
  const openingRip =
    allOnBoard.find(
      (s) =>
        s.opKind === 'rip' &&
        (stripKey
          ? s.stripKey === stripKey
          : Math.abs(s.posY - step.posY) < 0.51)
    ) || null;

  const stripWid = isRip
    ? step.cutWid
    : Number(step.frameWid) > 0.5
      ? Number(step.frameWid)
      : openingRip?.cutWid || step.cutWid;
  const stripY = isRip ? 0 : openingRip?.posY || 0;
  /**
   * Full strip length for the track (must stay constant across every crosscut on that strip).
   * Do NOT use step.frameLen here: for later crosscuts frameLen is only the remainder from
   * posX, which made REMOVED overflow and pushed Cut A/B/C/D off the sheet.
   */
  const stripLen = isRip
    ? Math.min(step.cutLen > 0.5 ? step.cutLen : step.stockLen, step.stockLen)
    : Number(openingRip?.cutLen) > 0.5
      ? Math.min(Number(openingRip!.cutLen), step.stockLen)
      : Number(openingRip?.stockLen) > 0.5
        ? Number(openingRip!.stockLen)
        : step.stockLen;
  const kerf = step.kerf;

  // Parked odd piece from the rip — only use real edge dims (no fake stripLen fallback)
  const asideLen = Number(openingRip?.edgeLen) > 0.5 ? Number(openingRip!.edgeLen) : 0;
  const asideWid =
    Number(openingRip?.edgeWid) > 0.5
      ? Number(openingRip!.edgeWid)
      : isRip
        ? Math.max(0, Number(step.edgeWid) || 0)
        : Math.max(0, step.stockWid - stripY - stripWid - kerf);

  // ---------- BLANK (crosscut short blank, leave long continuous board) ----------
  if (isBlank) {
    const mx = 110;
    const my = 88;
    // Full remaining board in hand = blank + kerf + keep-whole (never blank length alone)
    const blankLen = Math.max(0, step.cutLen);
    const remLen = Math.max(0, step.remLen);
    const boardLen = Math.max(
      blankLen + step.kerf + remLen,
      Number(step.frameLen) > 0.5 ? Number(step.frameLen) : 0,
      step.stockLen
    );
    const boardWid = Math.max(step.stockWid, step.cutWid, 1);
    const scale = fitBoardScale(boardLen, boardWid, 820, 300);
    const bw = boardLen * scale;
    const bh = boardWid * scale;
    const blankW = blankLen * scale;
    const remW = remLen * scale;
    const kerfPx = Math.max(2, step.kerf * scale);
    const legendY = my + bh + 44;
    const titleY = legendY + 40;
    const svgW = Math.max(mx + bw + 100, mx + 560 + 40);
    const svgH = titleY + 78;

    return (
      <SheetFrame
        svgW={svgW}
        svgH={svgH}
        title="SHOP DRAWING, BLANK FIRST (PRESERVE LONG OFFCUT)"
        species={step.species}
      >
        <rect x={mx} y={my} width={bw} height={bh} fill="url(#shop-grain)" stroke={INK} strokeWidth={2.2} />
        <rect
          x={mx}
          y={my}
          width={blankW}
          height={bh}
          fill="url(#shop-grain)"
          stroke={INK}
          strokeWidth={2.4}
        />
        <rect x={mx + blankW} y={my} width={kerfPx} height={bh} fill={INK} />
        {remW > 1 && (
          <rect
            x={mx + blankW + kerfPx}
            y={my}
            width={remW}
            height={bh}
            fill="#f9fafb"
            stroke={INK}
            strokeWidth={1.8}
            strokeDasharray="7 4"
          />
        )}
        <DimH x1={mx} x2={mx + blankW} y={my - 28} label={`BLANK ${formatDim(blankLen, unitSystem)}`} />
        {remW > 1 && (
          <DimH
            x1={mx + blankW + kerfPx}
            x2={mx + blankW + kerfPx + remW}
            y={my + bh + 26}
            label={`KEEP WHOLE ${formatDim(remLen, unitSystem)}`}
          />
        )}
        <DimV y1={my} y2={my + bh} x={mx - 34} label={formatDim(boardWid, unitSystem)} />
        <Callout cx={mx + Math.min(Math.max(blankW / 2, 18), 48)} cy={my - 34} letter="A" />
        <LegendLines
          x={mx}
          y={legendY}
          lines={[
            `A = short blank to rip next (${formatDim(blankLen, unitSystem)} × ${formatDim(boardWid, unitSystem)})`,
            `Dashed = one continuous offcut — do not fragment${isCompleted ? ' · COMPLETE' : ''}`,
          ]}
        />
        <TitleBlock
          x={mx}
          y={titleY}
          w={bw}
          projectName={projectName}
          boardTag={step.boardTag}
          species={step.species}
          dims={`${formatDim(blankLen, unitSystem)} × ${formatDim(boardWid, unitSystem)}`}
          op="BLANK CROSSCUT"
          stepLabel={stepLabel || `Step ${step.stepIndex}`}
          pullTag={pullTag}
        />
      </SheetFrame>
    );
  }

  // ---------- RIP ----------
  if (isRip) {
    const mx = 120;
    const my = 88;
    const ripLen = stripLen;
    const ripAsideLen = Number(step.edgeLen) > 0.5 ? Number(step.edgeLen) : asideLen;
    const ripAsideWid = Number(step.edgeWid) > 0.5 ? Number(step.edgeWid) : asideWid;
    // Face in hand for this rip (blank or full stock width)
    const faceWid = Math.max(step.stockWid, stripWid + kerf + Math.max(ripAsideWid, 0), 1);
    const scale = fitBoardScale(ripLen, faceWid, 820, 340);
    const bw = ripLen * scale;
    const bh = faceWid * scale;
    const stripH = stripWid * scale;
    const kerfPx = Math.max(2, kerf * scale);
    const asideH = ripAsideWid > 0.5 ? ripAsideWid * scale : 0;
    const stripTop = my + Math.min(stripY, Math.max(0, faceWid - stripWid - kerf - ripAsideWid)) * scale;
    const legendY = my + bh + 48;
    const titleY = legendY + 48;
    const svgW = Math.max(mx + bw + 120, mx + 560 + 40);
    const svgH = titleY + 78;
    // Short piece in hand vs a long nest board → ripped from a blank, not full stock
    const isShortBlankRip =
      Number(step.frameLen) > ripLen + 1 ||
      allOnBoard.some((s) => s.opKind === 'blank' && s.stripKey === stripKey);

    return (
      <SheetFrame
        svgW={svgW}
        svgH={svgH}
        title={isShortBlankRip ? 'SHOP DRAWING, RIP (FROM BLANK)' : 'SHOP DRAWING, RIP (FULL LENGTH)'}
        species={step.species}
      >
        <rect x={mx} y={my} width={bw} height={bh} fill="url(#shop-grain)" stroke={INK} strokeWidth={2.2} />

        {/* A, keep strip / finished part */}
        <rect
          x={mx}
          y={stripTop}
          width={bw}
          height={stripH}
          fill={step.producesFinishedPart ? '#fef3c7' : 'url(#shop-grain)'}
          stroke={INK}
          strokeWidth={2.2}
        />
        {/* Kerf */}
        <rect x={mx} y={stripTop + stripH} width={bw} height={kerfPx} fill={INK} />

        {/* B, set aside (light fill + dashed, NOT hatch) — true width ratio */}
        {asideH > 1 && (
          <rect
            x={mx}
            y={stripTop + stripH + kerfPx}
            width={bw}
            height={asideH}
            fill="#f9fafb"
            stroke={INK}
            strokeWidth={1.8}
            strokeDasharray="7 4"
          />
        )}

        <DimH x1={mx} x2={mx + bw} y={my - 28} label={formatDim(ripLen, unitSystem)} />
        <DimV y1={my} y2={my + bh} x={mx + bw + 34} label={formatDim(faceWid, unitSystem)} />
        <DimV y1={stripTop} y2={stripTop + stripH} x={mx - 40} label={formatDim(stripWid, unitSystem)} />
        {asideH > 1 && (
          <DimV
            y1={stripTop + stripH + kerfPx}
            y2={stripTop + stripH + kerfPx + asideH}
            x={mx + bw + 68}
            label={formatDim(ripAsideWid, unitSystem)}
          />
        )}

        <Callout cx={mx - 62} cy={stripTop + stripH / 2} letter="A" />
        <line
          x1={mx - 48}
          y1={stripTop + stripH / 2}
          x2={mx - 2}
          y2={stripTop + stripH / 2}
          stroke={INK}
          strokeWidth={1.2}
        />
        {asideH > 1 && (
          <>
            <Callout cx={mx - 62} cy={stripTop + stripH + kerfPx + asideH / 2} letter="B" />
            <line
              x1={mx - 48}
              y1={stripTop + stripH + kerfPx + asideH / 2}
              x2={mx - 2}
              y2={stripTop + stripH + kerfPx + asideH / 2}
              stroke={INK}
              strokeWidth={1.2}
            />
          </>
        )}

        <LegendLines
          x={mx}
          y={legendY}
          lines={[
            `A = ${
              step.producesFinishedPart ? `FINISHED (${step.partName})` : 'KEEP strip'
            } ${formatDim(ripLen, unitSystem)} × ${formatDim(stripWid, unitSystem)}`,
            asideH > 1
              ? `B = SET ASIDE ${formatDim(ripAsideLen > 0.5 ? ripAsideLen : ripLen, unitSystem)} × ${formatDim(ripAsideWid, unitSystem)}, kerf ${formatDim(kerf, unitSystem)}${isCompleted ? ' · COMPLETE' : ''}`
              : `Kerf ${formatDim(kerf, unitSystem)}${isCompleted ? ' · COMPLETE' : ''}`,
          ]}
        />

        <TitleBlock
          x={mx}
          y={titleY}
          w={bw}
          projectName={projectName}
          boardTag={step.boardTag}
          species={step.species}
          dims={`${formatDim(ripLen, unitSystem)} × ${formatDim(stripWid, unitSystem)} × ${formatDim(step.thickness, unitSystem)}`}
          op={
            step.producesFinishedPart
              ? `RIP → FINISHED ${formatDim(stripWid, unitSystem)}`
              : `RIP → ${formatDim(stripWid, unitSystem)} strip`
          }
          stepLabel={stepLabel || `Step ${step.stepIndex}`}
          pullTag={pullTag}
        />
      </SheetFrame>
    );
  }

  // ---------- CROSSCUT ----------
  const priorOnStrip = stripParts.filter((s) => s.stepIndex < step.stepIndex);
  const laterOnStrip = stripParts.filter((s) => s.stepIndex > step.stepIndex);
  const cutOrd = Math.max(
    0,
    stripParts.findIndex((s) => s.stepIndex === step.stepIndex)
  );
  const letter = cutMark(cutOrd);

  // Length physically in hand (min of stock/frame so old plans with full stockLen still work)
  const stockL = Number(step.stockLen) || 0;
  const frameL = Number(step.frameLen) || 0;
  const inHandLen = Math.max(
    step.cutLen,
    frameL > 0.5 && stockL > 0.5
      ? Math.min(frameL, stockL)
      : frameL > 0.5
        ? frameL
        : stockL > 0.5
          ? stockL
          : stripLen
  );
  const tipLeft = Math.max(0, Number(step.remLen) > 0.5 ? Number(step.remLen) : inHandLen - step.cutLen - kerf);
  // Prior removals only for first-of-strip nest view; REM pulls already exclude them
  const showPriorRemoved = priorOnStrip.length > 0 && Math.abs(inHandLen - stripLen) < 1;
  const stripOriginX = Math.min(...stripParts.map((s) => s.posX), step.posX);
  const alreadyCutLen = showPriorRemoved
    ? Math.min(stripLen, Math.max(0, step.posX - stripOriginX))
    : 0;
  const drawLen = showPriorRemoved ? stripLen : inHandLen;
  const handLen = showPriorRemoved ? Math.max(step.cutLen, stripLen - alreadyCutLen) : inHandLen;

  const mx = 110;
  const my = 96;
  const scale = fitBoardScale(drawLen, stripWid, 860, 220);
  const fullTrackW = drawLen * scale;
  const goneW = alreadyCutLen * scale;
  const handW = Math.max(0, handLen * scale);
  const handX = mx + goneW;
  const bh = Math.max(stripWid * scale, 28);
  const kerfPx = Math.max(2, kerf * scale);
  const cutW = Math.min(step.cutLen * scale, Math.max(handW, step.cutLen * scale));
  const tipW = Math.max(0, tipLeft * scale);

  // Set-aside block BELOW the strip, full width, no side overlap
  const asideBlockY = my + bh + 56;
  const asideBlockH = 88;
  const legendY = asideBlockY + asideBlockH + 28;
  const titleY = legendY + 36;
  const svgW = Math.max(mx + fullTrackW + 100, mx + 560 + 40);
  const svgH = titleY + 78;

  return (
    <SheetFrame
      svgW={svgW}
      svgH={svgH}
      title="SHOP DRAWING, CROSSCUT (STRIP IN HAND)"
      species={step.species}
    >
      {/* Ghost / outline of the piece being drawn */}
      <rect
        x={mx}
        y={my}
        width={fullTrackW}
        height={bh}
        fill="none"
        stroke={FAINT}
        strokeWidth={1.3}
        strokeDasharray="5 3"
      />

      {goneW > 2 && (
        <>
          <rect
            x={mx}
            y={my}
            width={goneW}
            height={bh}
            fill="url(#shop-hatch)"
            stroke={INK}
            strokeWidth={1.3}
          />
          <DimH
            x1={mx}
            x2={mx + goneW}
            y={my - 30}
            label={`ALREADY CUT OFF ${formatDim(alreadyCutLen, unitSystem)}`}
          />
        </>
      )}

      {/* Remaining strip still in hand */}
      {handW > 2 && (
        <rect
          x={handX}
          y={my}
          width={handW}
          height={bh}
          fill="url(#shop-grain)"
          stroke={INK}
          strokeWidth={2.2}
        />
      )}

      {laterOnStrip.map((p) => {
        const lx = showPriorRemoved ? p.posX - step.posX : p.cutLen; // approx
        if (showPriorRemoved && lx < 0.5) return null;
        if (!showPriorRemoved) return null;
        return (
          <rect
            key={`later-${p.stepIndex}`}
            x={handX + lx * scale}
            y={my}
            width={p.cutLen * scale}
            height={bh}
            fill="none"
            stroke={FAINT}
            strokeWidth={1}
            strokeDasharray="3 2"
          />
        );
      })}

      {/* This crosscut */}
      {cutW > 2 && (
        <>
          <rect
            x={handX}
            y={my}
            width={cutW}
            height={bh}
            fill="#fef3c7"
            stroke={INK}
            strokeWidth={2.6}
          />
          <rect
            x={handX + cutW}
            y={my}
            width={Math.min(kerfPx, Math.max(0, handW - cutW))}
            height={bh}
            fill={INK}
          />
          <Callout cx={handX + Math.min(cutW / 2, 48)} cy={my - 34} letter={letter} />
          <line
            x1={handX + Math.min(cutW / 2, 48)}
            y1={my - 20}
            x2={handX + Math.min(cutW / 2, 48)}
            y2={my - 1}
            stroke={INK}
            strokeWidth={1.2}
          />
          <DimH
            x1={handX}
            x2={handX + cutW}
            y={my + bh + 26}
            label={`${formatDim(step.cutLen, unitSystem)} Cut ${letter} (${step.partName})`}
          />
        </>
      )}

      {handW > 2 && (
        <DimH
          x1={handX}
          x2={handX + handW}
          y={goneW > 2 ? my - 54 : my - 30}
          label={`IN HAND ${formatDim(handLen, unitSystem)} × ${formatDim(stripWid, unitSystem)}`}
        />
      )}
      <DimV y1={my} y2={my + bh} x={mx - 36} label={formatDim(stripWid, unitSystem)} />
      {tipW > 2 && tipLeft > 2 && (
        <DimH
          x1={handX + cutW + kerfPx}
          x2={handX + cutW + kerfPx + tipW}
          y={my + bh + 48}
          label={`STRIP TIP LEFT ${formatDim(tipLeft, unitSystem)}`}
        />
      )}

      {/* Set-aside from RIP, below, large clear dims (always full length × odd width) */}
      <rect
        x={mx}
        y={asideBlockY}
        width={fullTrackW}
        height={asideBlockH}
        fill={PAPER}
        stroke={INK}
        strokeWidth={1.8}
        strokeDasharray="7 4"
      />
      <text
        x={mx + 14}
        y={asideBlockY + 22}
        fontSize={12}
        fontFamily="ui-monospace, monospace"
        fontWeight={700}
        fill={FAINT}
      >
        SET ASIDE FROM RIP (parked, do not cut yet)
      </text>
      {asideWid > 1 ? (
        <>
          <rect
            x={mx + 14}
            y={asideBlockY + 34}
            width={Math.min(fullTrackW - 28, 520)}
            height={28}
            fill="#f3f4f6"
            stroke={INK}
            strokeWidth={1.3}
          />
          <text
            x={mx + 14 + Math.min(fullTrackW - 28, 520) / 2}
            y={asideBlockY + 54}
            textAnchor="middle"
            fontSize={16}
            fontFamily="ui-monospace, monospace"
            fontWeight={700}
            fill={INK}
          >
            {formatDim(asideLen, unitSystem)} × {formatDim(asideWid, unitSystem)}
          </text>
        </>
      ) : (
        <text
          x={mx + 14}
          y={asideBlockY + 56}
          fontSize={13}
          fontFamily="ui-monospace, monospace"
          fill={FAINT}
        >
          No large odd piece from this rip
        </text>
      )}

      <LegendLines
        x={mx}
        y={legendY}
        lines={[
          `Hatch = already cut off strip · Cut ${letter} = this crosscut · dark gap = kerf ${formatDim(kerf, unitSystem)}${isCompleted ? ' · COMPLETE' : ''}`,
        ]}
      />

      <TitleBlock
        x={mx}
        y={titleY}
        w={fullTrackW}
        projectName={projectName}
        boardTag={step.boardTag}
        species={step.species}
        dims={`${formatDim(step.cutLen, unitSystem)} × ${formatDim(step.cutWid, unitSystem)}`}
        op={`CROSSCUT ${letter}`}
        stepLabel={stepLabel || `Step ${step.stepIndex}`}
        pullTag={pullTag}
      />
    </SheetFrame>
  );
}
