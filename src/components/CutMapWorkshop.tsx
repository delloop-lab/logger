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
  if (b - a < 8) return null;
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
  if (b - a < 8) return null;
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
  const h = 64;
  const col1 = w * 0.38;
  const col2 = w * 0.32;
  return (
    <g fontFamily="ui-monospace, monospace" fill={INK}>
      <rect x={x} y={y} width={w} height={h} fill={PAPER} stroke={INK} strokeWidth={1.6} />
      <line x1={x + col1} y1={y} x2={x + col1} y2={y + h} stroke={INK} strokeWidth={1} />
      <line x1={x + col1 + col2} y1={y} x2={x + col1 + col2} y2={y + h} stroke={INK} strokeWidth={1} />
      <line x1={x} y1={y + 20} x2={x + w} y2={y + 20} stroke={INK} strokeWidth={0.8} />
      <line x1={x} y1={y + 42} x2={x + w} y2={y + 42} stroke={INK} strokeWidth={0.8} />

      <text x={x + 10} y={y + 14} fontSize={9} fill={FAINT}>
        PROJECT
      </text>
      <text x={x + 10} y={y + 36} fontSize={13} fontWeight={700}>
        {(projectName || 'unnamed').slice(0, 28)}
      </text>
      <text x={x + 10} y={y + 56} fontSize={11}>
        {stepLabel}
      </text>

      <text x={x + col1 + 10} y={y + 14} fontSize={9} fill={FAINT}>
        STOCK / PULL
      </text>
      <text x={x + col1 + 10} y={y + 36} fontSize={12} fontWeight={700}>
        {(pullTag || boardTag).slice(0, 24)}
      </text>
      <text x={x + col1 + 10} y={y + 56} fontSize={11}>
        {species.slice(0, 26)}
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
  return (
    <div className="shop-drawing w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full max-w-none h-auto min-h-[420px] md:min-h-[560px] font-mono"
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

  const stripParts = allOnBoard
    .filter(
      (s) =>
        s.opKind === 'crosscut' &&
        (stripKey ? s.stripKey === stripKey : Math.abs(s.posY - step.posY) < 0.51)
    )
    .sort((a, b) => a.posX - b.posX || a.stepIndex - b.stepIndex);

  const openingRip =
    allOnBoard.find(
      (s) =>
        s.opKind === 'rip' &&
        ((stripKey && s.stripKey === stripKey) || Math.abs(s.posY - step.posY) < 0.51)
    ) || allOnBoard.find((s) => s.opKind === 'rip');

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

  // Parked odd piece from the rip, same length as the piece being ripped
  const asideLen =
    Number(openingRip?.edgeLen) > 0.5
      ? Number(openingRip!.edgeLen)
      : isRip
        ? stripLen
        : step.stockLen;
  const asideWid =
    Number(openingRip?.edgeWid) > 0.5
      ? Number(openingRip!.edgeWid)
      : Math.max(0, step.stockWid - stripY - stripWid - kerf);

  // ---------- BLANK (crosscut short blank, leave long continuous board) ----------
  if (isBlank) {
    const mx = 110;
    const my = 88;
    const boardLen = Number(step.frameLen) > 0.5 ? Number(step.frameLen) : step.stockLen;
    const scale = Math.min(820 / boardLen, 280 / Math.max(step.stockWid, 1));
    const bw = boardLen * scale;
    const bh = Math.max(step.stockWid * scale, 72);
    const blankW = step.cutLen * scale;
    const remW = Math.max(0, step.remLen) * scale;
    const kerfPx = Math.max(4, step.kerf * scale);
    const legendY = my + bh + 36;
    const titleY = legendY + 32;
    const svgW = mx + bw + 100;
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
        {remW > 2 && (
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
        <DimH x1={mx} x2={mx + blankW} y={my - 28} label={`BLANK ${formatDim(step.cutLen, unitSystem)}`} />
        {remW > 2 && (
          <DimH
            x1={mx + blankW + kerfPx}
            x2={mx + blankW + kerfPx + remW}
            y={my + bh + 26}
            label={`KEEP WHOLE ${formatDim(step.remLen, unitSystem)}`}
          />
        )}
        <DimV y1={my} y2={my + bh} x={mx - 34} label={formatDim(step.stockWid, unitSystem)} />
        <Callout cx={mx + Math.min(blankW / 2, 48)} cy={my - 34} letter="A" />
        <text x={mx} y={legendY} fontSize={13} fontFamily="ui-monospace, monospace" fill={INK} fontWeight={700}>
          A = short blank to rip/crosscut, dashed = one continuous offcut (do not fragment)
          {isCompleted ? ', COMPLETE' : ''}
        </text>
        <TitleBlock
          x={mx}
          y={titleY}
          w={bw}
          projectName={projectName}
          boardTag={step.boardTag}
          species={step.species}
          dims={`${formatDim(step.cutLen, unitSystem)} × ${formatDim(step.cutWid, unitSystem)}`}
          op="BLANK CROSSCUT"
          stepLabel={stepLabel || `Step ${step.stepIndex}`}
          pullTag={pullTag}
        />
      </SheetFrame>
    );
  }

  // ---------- RIP ----------
  if (isRip) {
    const mx = 110;
    const my = 88;
    const ripLen = stripLen;
    const scale = Math.min(820 / Math.max(ripLen, 1), 360 / Math.max(step.stockWid, 1));
    const bw = ripLen * scale;
    const bh = Math.max(step.stockWid * scale, 100);
    const stripH = Math.max(stripWid * scale, 36);
    const kerfPx = Math.max(4, kerf * scale);
    const asideH = Math.max(asideWid * scale, asideWid > 0.5 ? 44 : 0);
    const stripTop = my + stripY * scale;
    const legendY = my + bh + 36;
    const titleY = legendY + 32;
    const svgW = mx + bw + 110;
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

        {/* A, keep strip */}
        <rect
          x={mx}
          y={stripTop}
          width={bw}
          height={stripH}
          fill="url(#shop-grain)"
          stroke={INK}
          strokeWidth={2.2}
        />
        {/* Kerf */}
        <rect x={mx} y={stripTop + stripH} width={bw} height={kerfPx} fill={INK} />

        {/* B, set aside (light fill + dashed, NOT hatch) */}
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
        <DimV y1={my} y2={my + bh} x={mx + bw + 34} label={formatDim(step.stockWid, unitSystem)} />
        <DimV y1={stripTop} y2={stripTop + stripH} x={mx - 34} label={formatDim(stripWid, unitSystem)} />
        {asideH > 1 && (
          <DimV
            y1={stripTop + stripH + kerfPx}
            y2={stripTop + stripH + kerfPx + asideH}
            x={mx + bw + 68}
            label={formatDim(asideWid, unitSystem)}
          />
        )}

        <Callout cx={mx - 58} cy={stripTop + stripH / 2} letter="A" />
        <line
          x1={mx - 44}
          y1={stripTop + stripH / 2}
          x2={mx - 2}
          y2={stripTop + stripH / 2}
          stroke={INK}
          strokeWidth={1.2}
        />
        {asideH > 1 && (
          <>
            <Callout cx={mx - 58} cy={stripTop + stripH + kerfPx + asideH / 2} letter="B" />
            <line
              x1={mx - 44}
              y1={stripTop + stripH + kerfPx + asideH / 2}
              x2={mx - 2}
              y2={stripTop + stripH + kerfPx + asideH / 2}
              stroke={INK}
              strokeWidth={1.2}
            />
          </>
        )}

        <text x={mx} y={legendY} fontSize={13} fontFamily="ui-monospace, monospace" fill={INK} fontWeight={700}>
          A = {step.producesFinishedPart ? `FINISHED PART (${step.partName})` : 'KEEP strip'}{' '}
          {formatDim(ripLen, unitSystem)} × {formatDim(stripWid, unitSystem)}, B =
          SET ASIDE {formatDim(asideLen, unitSystem)} × {formatDim(asideWid, unitSystem)}, kerf{' '}
          {formatDim(kerf, unitSystem)}
          {isCompleted ? ', COMPLETE' : ''}
        </text>

        <TitleBlock
          x={mx}
          y={titleY}
          w={bw}
          projectName={projectName}
          boardTag={step.boardTag}
          species={step.species}
          dims={`${formatDim(ripLen, unitSystem)} × ${formatDim(step.stockWid, unitSystem)} × ${formatDim(step.thickness, unitSystem)}`}
          op={`RIP → ${formatDim(stripWid, unitSystem)} strip`}
          stepLabel={stepLabel || `Step ${step.stepIndex}`}
          pullTag={pullTag}
        />
      </SheetFrame>
    );
  }

  // ---------- CROSSCUT ----------
  const stripOriginX = stripParts[0]?.posX ?? step.posX;
  const alreadyCutLen = Math.min(stripLen, Math.max(0, step.posX - stripOriginX));
  const handLen = Math.max(step.cutLen, stripLen - alreadyCutLen);
  const laterOnStrip = stripParts.filter((s) => s.stepIndex > step.stepIndex);
  const lastOnStrip = stripParts[stripParts.length - 1];
  const endWaste =
    lastOnStrip != null
      ? Math.max(0, stripLen - (lastOnStrip.posX - stripOriginX + lastOnStrip.cutLen))
      : Math.max(0, step.remLen);

  const cutOrd = Math.max(
    0,
    stripParts.findIndex((s) => s.stepIndex === step.stepIndex)
  );
  const letter = cutMark(cutOrd);

  const mx = 110;
  const my = 96;
  const scale = Math.min(860 / Math.max(stripLen, 1), 200 / Math.max(stripWid, 1));
  const fullTrackW = stripLen * scale;
  const goneW = alreadyCutLen * scale;
  const handW = Math.max(0, handLen * scale);
  const handX = mx + goneW;
  const bh = Math.max(stripWid * scale, 56);
  const kerfPx = Math.max(4, kerf * scale);
  const cutW = Math.min(step.cutLen * scale, Math.max(handW, step.cutLen * scale));

  // Set-aside block BELOW the strip, full width, no side overlap
  const asideBlockY = my + bh + 56;
  const asideBlockH = 88;
  const legendY = asideBlockY + asideBlockH + 28;
  const titleY = legendY + 28;
  const svgW = mx + fullTrackW + 100;
  const svgH = titleY + 78;

  return (
    <SheetFrame
      svgW={svgW}
      svgH={svgH}
      title="SHOP DRAWING, CROSSCUT (STRIP IN HAND)"
      species={step.species}
    >
      {/* Ghost original strip length */}
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
            label={`REMOVED ${formatDim(alreadyCutLen, unitSystem)}`}
          />
        </>
      )}

      {/* Remaining strip still in hand (to the right of removed) */}
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
        const lx = p.posX - step.posX;
        if (lx < 0.5) return null;
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

      {/* This crosscut: light fill + heavy outline + letter so it cannot vanish */}
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
      {endWaste > 2 && handW > 2 && (
        <DimH
          x1={handX + handW - endWaste * scale}
          x2={handX + handW}
          y={my + bh + 48}
          label={`STRIP TIP LEFT ${formatDim(endWaste, unitSystem)}`}
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

      <text x={mx} y={legendY} fontSize={13} fontFamily="ui-monospace, monospace" fill={INK} fontWeight={700}>
        Hatch = already cut off strip, Cut {letter} = this crosscut, dark gap = kerf{' '}
        {formatDim(kerf, unitSystem)}
        {isCompleted ? ', COMPLETE' : ''}
      </text>

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
