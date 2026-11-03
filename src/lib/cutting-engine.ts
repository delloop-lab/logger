/** Pure cutting / nesting engine — no React, no inventory side effects */

export const DEFAULT_KERF_MM = 3.2;
export const DEFAULT_END_TRIM_MM = 0;

export interface EngineBoard {
  id: string;
  tagId: string;
  species: string;
  source?: string;
  location?: string;
  length: number;
  width: number;
  thickness: number;
  status?: string;
}

export interface EnginePart {
  id: string;
  name: string;
  species: string;
  length: number;
  width: number;
  thickness: number;
  quantity: number;
}

export interface CutPiece {
  id: string;
  name: string;
  species: string;
  length: number;
  width: number;
  thickness: number;
}

export interface Placement {
  stepIndex: number;
  pieceId: string;
  partName: string;
  boardId: string;
  boardTag: string;
  species: string;
  source: string;
  location: string;
  stockLen: number;
  stockWid: number;
  thickness: number;
  cutLen: number;
  cutWid: number;
  posX: number;
  posY: number;
  kerf: number;
  rotated: boolean;
  remLen: number;
  remWid: number;
}

export interface CuttingPlan {
  placements: Placement[];
  unallocated: CutPiece[];
  rejectedBoards: { board: EngineBoard; reason: string }[];
  usedBoardTags: string[];
}

export interface PlanOptions {
  kerfMm?: number;
  endTrimMm?: number;
}

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function normalizeSpecies(value: string): string {
  return (value || '')
    .toLowerCase()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Species match only — source (Salvage, Pallet, etc.) must never block a match */
export function speciesMatches(required: string, boardSpecies: string): boolean {
  const a = normalizeSpecies(required);
  const b = normalizeSpecies(boardSpecies);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes('pine') && b.includes('pine')) return true;
  return false;
}

export function expandParts(parts: EnginePart[]): CutPiece[] {
  return parts.flatMap((part) =>
    Array.from({ length: Math.max(0, part.quantity) }, (_, i) => ({
      id: `${part.id}-${i + 1}`,
      name: `${part.name} (${i + 1}/${part.quantity})`,
      species: part.species,
      length: part.length,
      width: part.width,
      thickness: part.thickness,
    }))
  );
}

function orientations(piece: CutPiece): { cutLen: number; cutWid: number; rotated: boolean }[] {
  const opts = [{ cutLen: piece.length, cutWid: piece.width, rotated: false }];
  if (piece.length !== piece.width) {
    opts.push({ cutLen: piece.width, cutWid: piece.length, rotated: true });
  }
  return opts;
}

function canFitThickness(board: EngineBoard, piece: CutPiece): boolean {
  return board.thickness >= piece.thickness - 0.1;
}

function fitsInRect(
  rect: FreeRect,
  cutLen: number,
  cutWid: number
): boolean {
  return rect.w + 1e-9 >= cutLen && rect.h + 1e-9 >= cutWid;
}

/** Split free rectangle after placing a piece (guillotine-style), accounting for kerf */
function splitFreeRect(
  rect: FreeRect,
  cutLen: number,
  cutWid: number,
  kerf: number
): FreeRect[] {
  const next: FreeRect[] = [];
  const rightW = rect.w - cutLen - kerf;
  if (rightW > 0.5) {
    next.push({ x: rect.x + cutLen + kerf, y: rect.y, w: rightW, h: cutWid });
  }
  const belowH = rect.h - cutWid - kerf;
  if (belowH > 0.5) {
    next.push({
      x: rect.x,
      y: rect.y + cutWid + kerf,
      w: rect.w,
      h: belowH,
    });
  }
  return next;
}

function usableBoardRect(board: EngineBoard, endTrim: number): FreeRect | null {
  const w = board.length - endTrim * 2;
  const h = board.width - endTrim * 2;
  if (w <= 0 || h <= 0) return null;
  return { x: endTrim, y: endTrim, w, h };
}

export function boardRejectReason(
  board: EngineBoard,
  pieces: CutPiece[],
  endTrimMm = DEFAULT_END_TRIM_MM
): string | null {
  if (board.status === 'consumed') return 'Board already consumed';
  const usable = usableBoardRect(board, endTrimMm);
  if (!usable) return 'Board too small after end trim';

  const speciesOk = pieces.some((p) => speciesMatches(p.species, board.species));
  if (!speciesOk) return 'Wrong species for required parts';

  const thickOk = pieces.some((p) => speciesMatches(p.species, board.species) && canFitThickness(board, p));
  if (!thickOk) return 'Board too thin for required parts';

  const anyFit = pieces.some((p) => {
    if (!speciesMatches(p.species, board.species) || !canFitThickness(board, p)) return false;
    return orientations(p).some((o) => fitsInRect(usable, o.cutLen, o.cutWid));
  });
  if (!anyFit) return 'Board too short or narrow for any required piece';

  return null;
}

function packBoard(
  board: EngineBoard,
  pieces: CutPiece[],
  kerf: number,
  endTrim: number,
  startStep: number
): { placements: Placement[]; remaining: CutPiece[] } {
  const usable = usableBoardRect(board, endTrim);
  if (!usable) return { placements: [], remaining: pieces };

  let free: FreeRect[] = [usable];
  const placements: Placement[] = [];
  const remaining: CutPiece[] = [];
  let step = startStep;

  for (const piece of pieces) {
    if (!speciesMatches(piece.species, board.species) || !canFitThickness(board, piece)) {
      remaining.push(piece);
      continue;
    }

    let best: {
      rectIndex: number;
      cutLen: number;
      cutWid: number;
      rotated: boolean;
      waste: number;
    } | null = null;

    for (let ri = 0; ri < free.length; ri++) {
      const rect = free[ri];
      for (const orient of orientations(piece)) {
        if (!fitsInRect(rect, orient.cutLen, orient.cutWid)) continue;
        const waste = rect.w * rect.h - orient.cutLen * orient.cutWid;
        if (!best || waste < best.waste || (waste === best.waste && rect.w * rect.h < free[best.rectIndex].w * free[best.rectIndex].h)) {
          best = {
            rectIndex: ri,
            cutLen: orient.cutLen,
            cutWid: orient.cutWid,
            rotated: orient.rotated,
            waste,
          };
        }
      }
    }

    if (!best) {
      remaining.push(piece);
      continue;
    }

    const rect = free[best.rectIndex];
    const remLen = Math.max(0, usable.w - (best.cutLen + (rect.x - usable.x)));
    const remWid = Math.max(0, usable.h - (best.cutWid + (rect.y - usable.y)));

    placements.push({
      stepIndex: step++,
      pieceId: piece.id,
      partName: piece.name,
      boardId: board.id,
      boardTag: board.tagId || board.id,
      species: board.species,
      source: board.source || 'Stock',
      location: board.location || 'Workshop',
      stockLen: board.length,
      stockWid: board.width,
      thickness: board.thickness,
      cutLen: best.cutLen,
      cutWid: best.cutWid,
      posX: rect.x,
      posY: rect.y,
      kerf,
      rotated: best.rotated,
      remLen,
      remWid,
    });

    const used = free[best.rectIndex];
    const replacements = splitFreeRect(used, best.cutLen, best.cutWid, kerf);
    free = [...free.slice(0, best.rectIndex), ...free.slice(best.rectIndex + 1), ...replacements];
  }

  return { placements, remaining };
}

/**
 * Build a cutting plan: match species + thickness, reject unsuitable stock,
 * nest across multiple boards with kerf and optional end trim.
 * Does not mutate inventory.
 */
export function createCuttingPlan(
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

  // Prefer smaller suitable boards first (leave large stock for later)
  const candidates = activeBoards
    .filter((b) => !boardRejectReason(b, pieces, endTrim))
    .sort((a, b) => a.length * a.width - b.length * b.width);

  let queue = [...pieces];
  const placements: Placement[] = [];
  const usedBoardTags: string[] = [];

  for (const board of candidates) {
    if (queue.length === 0) break;
    // Only attempt pieces that match this board's species
    const forBoard = queue.filter((p) => speciesMatches(p.species, board.species));
    const deferred = queue.filter((p) => !speciesMatches(p.species, board.species));
    if (forBoard.length === 0) continue;

    const packed = packBoard(board, forBoard, kerf, endTrim, placements.length + 1);
    if (packed.placements.length > 0) {
      placements.push(...packed.placements);
      usedBoardTags.push(board.tagId || board.id);
    }
    queue = [...deferred, ...packed.remaining];
  }

  return {
    placements,
    unallocated: queue,
    rejectedBoards,
    usedBoardTags: Array.from(new Set(usedBoardTags)),
  };
}

export function placementsOverlap(plan: CuttingPlan): boolean {
  const byBoard = new Map<string, Placement[]>();
  for (const p of plan.placements) {
    const list = byBoard.get(p.boardTag) || [];
    list.push(p);
    byBoard.set(p.boardTag, list);
  }

  for (const list of Array.from(byBoard.values())) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const ax2 = a.posX + a.cutLen;
        const ay2 = a.posY + a.cutWid;
        const bx2 = b.posX + b.cutLen;
        const by2 = b.posY + b.cutWid;
        const overlap = a.posX < bx2 && ax2 > b.posX && a.posY < by2 && ay2 > b.posY;
        if (overlap) return true;
      }
    }
  }
  return false;
}

export function placementsOutOfBounds(plan: CuttingPlan): boolean {
  return plan.placements.some((p) => {
    const endTrimGuess = 0;
    return (
      p.posX < endTrimGuess - 1e-6 ||
      p.posY < endTrimGuess - 1e-6 ||
      p.posX + p.cutLen > p.stockLen + 1e-6 ||
      p.posY + p.cutWid > p.stockWid + 1e-6
    );
  });
}
