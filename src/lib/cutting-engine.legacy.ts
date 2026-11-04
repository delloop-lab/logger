/**
 * Legacy pre-Master-Spec cutting engine — kept as fallback and baseline for
 * A/B regression comparison tests (Stage 3–5).
 *
 * Known limitations documented in the Master Spec audit:
 * - Single-path greedy strip packing (no lookahead across remaining strips)
 * - Fixed blank-first rule that created multi-part intermediate blanks (e.g. 403mm
 *   blank for two 200mm pieces) and redundant secondary splits
 * - No user-selectable cutting strategies (Crosscut First / Rip First / Auto / Preserve Offcut)
 * - Always sorted boards smallest-area-first without comparing global alternatives
 */

import {
  DEFAULT_END_TRIM_MM,
  DEFAULT_KERF_MM,
  MIN_USEFUL_OFFCUT_MM,
  boardRejectReason,
  expandParts,
  preferBlankFirst,
  speciesMatches,
  type CutPiece,
  type CuttingPlan,
  type EngineBoard,
  type EnginePart,
  type Placement,
  type PlanOptions,
} from './cutting-engine';

interface OrientedItem {
  piece: CutPiece;
  cutLen: number;
  cutWid: number;
  rotated: boolean;
}

function orientations(piece: CutPiece) {
  const opts = [{ cutLen: piece.length, cutWid: piece.width, rotated: false }];
  if (piece.length !== piece.width) {
    opts.push({ cutLen: piece.width, cutWid: piece.length, rotated: true });
  }
  return opts;
}

function canFitThickness(board: EngineBoard, piece: CutPiece): boolean {
  if (!piece.thickness || piece.thickness <= 0) return true;
  return board.thickness >= piece.thickness - 0.1;
}

function legacyScoreStripPack(
  boardLen: number,
  boardWidLeft: number,
  stripWid: number,
  usedLen: number,
  partCount: number,
  kerf: number
): number {
  if (partCount === 0) return -1e9;
  let score = partCount * 10_000;
  const endScrap = Math.max(0, boardLen - usedLen - kerf);
  if (endScrap > 0.5 && endScrap < 80) score -= 250;
  if (endScrap >= MIN_USEFUL_OFFCUT_MM) {
    score += Math.min(endScrap, boardLen) * 0.9;
    if (endScrap >= usedLen) score += 600;
  }
  const remBelow = boardWidLeft - stripWid - kerf;
  if (remBelow > 80) score += 400;
  else if (remBelow > 0.5 && remBelow < 25) score -= 300;
  score += Math.min(stripWid, 400) * 0.5;
  if (usedLen < boardLen * 0.55 && endScrap >= MIN_USEFUL_OFFCUT_MM) score += 350;
  return score;
}

function packAlongLength(items: OrientedItem[], boardLen: number, kerf: number) {
  const sorted = [...items].sort((a, b) => b.cutLen - a.cutLen || b.cutWid - a.cutWid);
  const placed: { item: OrientedItem; posX: number }[] = [];
  let x = 0;
  for (const item of sorted) {
    if (x + (placed.length > 0 ? kerf : 0) + item.cutLen <= boardLen + 1e-9) {
      if (placed.length > 0) x += kerf;
      placed.push({ item, posX: x });
      x += item.cutLen;
    }
  }
  return { placed, usedLen: x };
}

function legacyPackBoard(
  board: EngineBoard,
  pieces: CutPiece[],
  kerf: number,
  endTrim: number,
  startStep: number
): { placements: Placement[]; remaining: CutPiece[] } {
  const w = board.length - endTrim * 2;
  const h = board.width - endTrim * 2;
  if (w <= 0 || h <= 0) return { placements: [], remaining: pieces };

  const unmatched: CutPiece[] = [];
  let queue = pieces.filter((p) => {
    const ok = speciesMatches(p.species, board.species) && canFitThickness(board, p);
    if (!ok) unmatched.push(p);
    return ok;
  });

  const placements: Placement[] = [];
  let step = startStep;
  let y = endTrim;
  let heightLeft = h;
  let stripIndex = 0;

  while (queue.length > 0 && heightLeft > 0.5) {
    const byWid = new Map<number, OrientedItem[]>();
    for (const piece of queue) {
      for (const o of orientations(piece)) {
        if (o.cutWid > heightLeft + 1e-9 || o.cutLen > w + 1e-9) continue;
        const key = Math.round(o.cutWid * 100) / 100;
        const list = byWid.get(key) || [];
        if (!list.some((x) => x.piece.id === piece.id)) {
          list.push({ piece, cutLen: o.cutLen, cutWid: o.cutWid, rotated: o.rotated });
          byWid.set(key, list);
        }
      }
    }

    let best: {
      stripWid: number;
      items: { item: OrientedItem; posX: number }[];
      usedLen: number;
      score: number;
    } | null = null;

    for (const [stripWid, items] of Array.from(byWid.entries())) {
      const packed = packAlongLength(items, w, kerf);
      if (packed.placed.length === 0) continue;
      const score = legacyScoreStripPack(w, heightLeft, stripWid, packed.usedLen, packed.placed.length, kerf);
      if (!best || score > best.score) {
        best = { stripWid, items: packed.placed, usedLen: packed.usedLen, score };
      }
    }

    if (!best) break;
    const stripKey = `${board.tagId || board.id}-S${stripIndex}`;

    for (const { item, posX } of best.items) {
      const remLen = Math.max(0, w - (posX + item.cutLen + kerf));
      placements.push({
        stepIndex: step++,
        pieceId: item.piece.id,
        partName: item.piece.name,
        boardId: board.id,
        boardTag: board.tagId || board.id,
        species: board.species,
        source: board.source || 'Stock',
        location: board.location || 'Workshop',
        opKind: 'crosscut',
        stockLen: board.length,
        stockWid: board.width,
        thickness: board.thickness,
        cutLen: item.cutLen,
        cutWid: item.cutWid,
        posX: endTrim + posX,
        posY: y,
        frameX: endTrim + posX,
        frameY: y,
        frameLen: Math.max(0, w - posX),
        frameWid: best.stripWid,
        localX: 0,
        localY: 0,
        kerf,
        rotated: item.rotated,
        remLen,
        remWid: best.stripWid,
        edgeLen: 0,
        edgeWid: 0,
        stripKey,
      });
      queue = queue.filter((p) => p.id !== item.piece.id);
    }

    y += best.stripWid + kerf;
    heightLeft = endTrim + h - y;
    stripIndex += 1;
  }

  return { placements, remaining: [...unmatched, ...queue] };
}

function legacyExpandToShopSequence(placements: Placement[], kerf: number): Placement[] {
  if (placements.length === 0) return [];
  const byBoard = new Map<string, Placement[]>();
  for (const p of placements) {
    const list = byBoard.get(p.boardTag) || [];
    list.push(p);
    byBoard.set(p.boardTag, list);
  }

  const out: Placement[] = [];
  let step = 1;

  for (const list of Array.from(byBoard.values())) {
    const stockLen = list[0].stockLen;
    const stockWid = list[0].stockWid;
    const base = list[0];
    const stripMap = new Map<string, Placement[]>();
    for (const p of list) {
      const key = p.stripKey || `y:${Math.round(p.posY * 100) / 100}`;
      const row = stripMap.get(key) || [];
      row.push(p);
      stripMap.set(key, row);
    }

    const strips = Array.from(stripMap.values()).sort(
      (a, b) => a[0].posY - b[0].posY || a[0].posX - b[0].posX
    );

    for (const row of strips) {
      const sorted = [...row].sort((a, b) => a.posX - b.posX);
      const stripWid = sorted[0].cutWid;
      const stripY = sorted[0].posY;
      const stripKey = sorted[0].stripKey;
      const needsRip = stripWid < stockWid - 0.5 && sorted.length >= 2;
      const originX = sorted[0].posX;
      const usedLen = sorted[sorted.length - 1].posX + sorted[sorted.length - 1].cutLen - originX;
      const blankFirst = needsRip && preferBlankFirst(stockLen, usedLen, kerf);
      const workLen = blankFirst ? usedLen : stockLen;
      const remBoard = Math.max(0, stockLen - usedLen - kerf);

      if (blankFirst) {
        out.push({
          ...base,
          stepIndex: step++,
          pieceId: `blank-${base.boardTag}-${Math.round(stripY)}`,
          partName: `Crosscut ${Number(usedLen.toFixed(1))}mm blank`,
          opKind: 'blank',
          cutLen: usedLen,
          cutWid: stockWid,
          posX: originX,
          posY: 0,
          frameX: 0,
          frameY: 0,
          frameLen: stockLen,
          frameWid: stockWid,
          localX: 0,
          localY: 0,
          rotated: false,
          remLen: remBoard,
          remWid: stockWid,
          edgeLen: 0,
          edgeWid: 0,
          stripKey,
          kerf,
        });
      }

      if (needsRip) {
        const edgeWid = Math.max(0, stockWid - stripY - stripWid - kerf);
        out.push({
          ...base,
          stepIndex: step++,
          pieceId: `rip-${base.boardTag}-${Math.round(stripY)}`,
          partName: blankFirst
            ? `Rip ${Number(stripWid.toFixed(1))}mm strip from blank`
            : `Rip ${Number(stripWid.toFixed(1))}mm strip`,
          opKind: 'rip',
          cutLen: workLen,
          cutWid: stripWid,
          posX: blankFirst ? 0 : originX,
          posY: stripY,
          frameX: 0,
          frameY: stripY,
          frameLen: workLen,
          frameWid: stockWid - stripY,
          localX: 0,
          localY: 0,
          rotated: false,
          remLen: workLen,
          remWid: stripWid,
          edgeLen: workLen,
          edgeWid: Math.max(0, edgeWid),
          stripKey,
          kerf,
        });
      }

      let lenLeft = workLen;
      for (const p of sorted) {
        const remLen = Math.max(0, lenLeft - p.cutLen - kerf);
        const localX = blankFirst ? p.posX - originX : p.posX;
        out.push({
          ...p,
          stepIndex: step++,
          opKind: 'crosscut',
          posX: blankFirst ? localX : p.posX,
          frameX: workLen - lenLeft,
          frameY: stripY,
          frameLen: lenLeft,
          frameWid: stripWid,
          localX: 0,
          localY: 0,
          remLen,
          remWid: stripWid,
          edgeLen: 0,
          edgeWid: 0,
          stockLen: blankFirst ? workLen : p.stockLen,
          stockWid: p.stockWid,
        });
        lenLeft = remLen;
      }
    }
  }
  return out;
}

export function createLegacyCuttingPlan(
  boards: EngineBoard[],
  parts: EnginePart[],
  options: PlanOptions = {}
): CuttingPlan {
  const kerf = options.kerfMm ?? DEFAULT_KERF_MM;
  const endTrim = options.endTrimMm ?? DEFAULT_END_TRIM_MM;
  const pieces = expandParts(parts);
  const activeBoards = boards.filter((b) => b.status !== 'consumed');
  const rejectedBoards: CuttingPlan['rejectedBoards'] = [];

  for (const board of activeBoards) {
    const reason = boardRejectReason(board, pieces, endTrim);
    if (reason) rejectedBoards.push({ board, reason });
  }

  const candidates = activeBoards
    .filter((b) => !boardRejectReason(b, pieces, endTrim))
    .sort((a, b) => a.length * a.width - b.length * b.width);

  let queue = [...pieces];
  const placements: Placement[] = [];
  const usedBoardTags: string[] = [];

  for (const board of candidates) {
    if (queue.length === 0) break;
    const forBoard = queue.filter((p) => speciesMatches(p.species, board.species));
    const deferred = queue.filter((p) => !speciesMatches(p.species, board.species));
    if (forBoard.length === 0) continue;

    const packed = legacyPackBoard(board, forBoard, kerf, endTrim, placements.length + 1);
    if (packed.placements.length > 0) {
      placements.push(...packed.placements);
      usedBoardTags.push(board.tagId || board.id);
    }
    queue = [...deferred, ...packed.remaining];
  }

  return {
    placements: legacyExpandToShopSequence(placements, kerf),
    unallocated: queue,
    rejectedBoards,
    usedBoardTags: Array.from(new Set(usedBoardTags)),
    strategy: 'legacy',
  };
}
