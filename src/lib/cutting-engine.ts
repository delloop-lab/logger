/** Pure cutting / nesting engine — no React, no inventory side effects */

export const DEFAULT_KERF_MM = 3.2;
export const DEFAULT_END_TRIM_MM = 0;

/** Prefer blank-first when leftover board is at least this long (mm) */
export const MIN_USEFUL_OFFCUT_MM = 100;

/** Offcut width below this is usually scrap (skinny rip waste) */
export const SKINNY_OFFCUT_MM = 25;

/** User-selectable cutting strategy (§4) */
export type CuttingStrategy =
  | 'auto'
  | 'crosscut-first'
  | 'rip-first'
  | 'preserve-offcut';

export type OffcutTier = 'reusable' | 'potentially_reusable' | 'scrap';

export interface OffcutThreshold {
  minLength: number;
  minWidth: number;
}

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
  /** True when this board came from an earlier cut / offcut rack */
  isOffcut?: boolean;
}

export interface EnginePart {
  id: string;
  name: string;
  length: number;
  width: number;
  thickness: number;
  quantity: number;
  species: string;
  /** When true, do not rotate 90° (keep length along board grain) */
  constrainGrain?: boolean;
}

export interface CutPiece {
  id: string;
  name: string;
  species: string;
  length: number;
  width: number;
  thickness: number;
  constrainGrain?: boolean;
}

export type CutOpKind = 'blank' | 'rip' | 'crosscut';

export interface Placement {
  stepIndex: number;
  pieceId: string;
  partName: string;
  boardId: string;
  boardTag: string;
  species: string;
  source: string;
  location: string;
  /**
   * blank = crosscut a short working blank, leave long continuous board
   * rip = edge-to-edge strip from stock or blank
   * crosscut = finished part from a strip
   */
  opKind: CutOpKind;
  /**
   * True when this op directly produces a finished component (all `crosscut` ops,
   * and `rip` from a single-piece blank where the strip IS the finished part).
   */
  producesFinishedPart?: boolean;
  stockLen: number;
  stockWid: number;
  thickness: number;
  cutLen: number;
  cutWid: number;
  posX: number;
  posY: number;
  frameX: number;
  frameY: number;
  frameLen: number;
  frameWid: number;
  localX: number;
  localY: number;
  kerf: number;
  rotated: boolean;
  remLen: number;
  remWid: number;
  edgeLen: number;
  edgeWid: number;
  /** Strip row id for grouping rip → crosscuts */
  stripKey?: string;
}

export interface OffcutSummaryItem {
  boardTag: string;
  length: number;
  width: number;
  thickness: number;
  species: string;
  source?: string;
  location?: string;
  aspectRatio?: number;
  tier: OffcutTier;
  kind: 'continuous_board' | 'parallel_aside' | 'strip_end';
}

export interface StrategyAlternative {
  strategy: Exclude<CuttingStrategy, 'auto'>;
  label: string;
  reason: string;
  plan: CuttingPlan;
}

export interface CuttingPlan {
  placements: Placement[];
  unallocated: CutPiece[];
  rejectedBoards: { board: EngineBoard; reason: string }[];
  usedBoardTags: string[];
  /** Multi-objective score of the chosen plan (higher is better). */
  score?: number;
  /** Internal packing/shop key that won. */
  strategy?: string;
  /** User-facing strategy that produced this plan */
  selectedStrategy?: CuttingStrategy;
  /** Concrete mode chosen when selectedStrategy === 'auto' */
  effectiveStrategy?: Exclude<CuttingStrategy, 'auto'>;
  /** Plain-English explanation of why this plan was selected */
  explanation?: string;
  /** Populated when user picked a non-auto strategy but another is materially better */
  betterAlternative?: StrategyAlternative;
  /** Classified offcuts produced by this plan */
  offcuts?: OffcutSummaryItem[];
}

export interface PlanOptions {
  kerfMm?: number;
  endTrimMm?: number;
  strategy?: CuttingStrategy;
  offcutThresholds?: OffcutThreshold;
}

/** Breakdown used when comparing candidate plans (exported for tests / debug). */
export interface PlanScoreBreakdown {
  total: number;
  partsPlaced: number;
  unallocated: number;
  setupOps: number;
  finishedOps: number;
  totalOps: number;
  longestOffcutLen: number;
  longestOffcutWid: number;
  continuousFullWidthArea: number;
  reusableOffcutArea: number;
  reusableOffcutCount: number;
  scrapCount: number;
  skinnyWasteMm: number;
  offcutsUsed: number;
  freshBoardsUsed: number;
  boardsUsed: number;
  consumedArea: number;
  unusedArea: number;
  strategy: string;
}

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface OrientedItem {
  piece: CutPiece;
  cutLen: number;
  cutWid: number;
  rotated: boolean;
}

interface StripPackResult {
  stripWid: number;
  items: { item: OrientedItem; posX: number }[];
  usedLen: number;
  score: number;
}

/** How to expand a nested strip into workshop operations */
export type ShopMode = 'crosscut-only' | 'blank-rip-crosscut' | 'full-rip-crosscut';

type PackPolicy =
  | 'balanced'
  | 'full-width-first'
  | 'dense-strip'
  | 'preserve-offcut'
  | 'blank-columns';

type BoardOrder = 'small-first' | 'large-first' | 'offcuts-first';

interface RawNest {
  placements: Placement[];
  remaining: CutPiece[];
  policy: PackPolicy;
  boardOrder: BoardOrder;
  forcedShop?: Exclude<CuttingStrategy, 'auto'>;
}

export const STRATEGY_META: Record<
  CuttingStrategy,
  { label: string; short: string; description: string }
> = {
  auto: {
    label: 'Let Logger Decide (Recommended)',
    short: 'Logger Decide',
    description:
      'Compares crosscut-first, rip-first, and offcut-preserving layouts and picks the most practical shop sequence.',
  },
  'crosscut-first': {
    label: 'Crosscut First',
    short: 'Crosscut First',
    description:
      'Cut short blanks from the board length first, then rip those blanks to width, keeps the rest of the board in one long piece.',
  },
  'rip-first': {
    label: 'Rip First',
    short: 'Rip First',
    description:
      'Rip full-length strips to width first, then crosscut finished lengths down the strip, best when many parts share a width.',
  },
  'preserve-offcut': {
    label: 'Preserve Maximum Useful Offcut',
    short: 'Preserve Offcut',
    description:
      'Prioritises keeping the longest, widest reusable remnant and using existing offcuts before opening fresh boards.',
  },
};

export function isFinishedPlacement(p: Placement): boolean {
  if (p.producesFinishedPart != null) return p.producesFinishedPart;
  return p.opKind === 'crosscut';
}

export function classifyOffcut(
  length: number,
  width: number,
  thresholds: OffcutThreshold = { minLength: MIN_USEFUL_OFFCUT_MM, minWidth: MIN_USEFUL_OFFCUT_MM }
): OffcutTier {
  const l = Math.max(length, width);
  const w = Math.min(length, width);
  const minL = Math.max(thresholds.minLength, thresholds.minWidth);
  const minW = Math.min(thresholds.minLength, thresholds.minWidth);

  if (w < SKINNY_OFFCUT_MM || l < Math.min(50, minL * 0.5)) return 'scrap';

  const aspect = l / Math.max(w, 1);
  if (l >= minL && w >= minW) {
    // Ultra-slender edging sliver barely over min width is only potentially reusable
    if (aspect > 40 && w < minW * 1.25) return 'potentially_reusable';
    return 'reusable';
  }
  // Well-proportioned stocky block (e.g. 220x180 when minLength=300, minWidth=50)
  if (
    (l >= minL * 0.6 && w >= Math.max(SKINNY_OFFCUT_MM, minW * 0.5)) ||
    (l * w >= minL * minW && w >= Math.max(SKINNY_OFFCUT_MM * 1.5, minW * 0.75))
  ) {
    return 'potentially_reusable';
  }
  return 'scrap';
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
  if (a.includes('any') || b.includes('any')) return true;
  return false;
}

function boardFaceFits(board: EngineBoard, piece: CutPiece): boolean {
  const L = Number(board.length) || 0;
  const W = Number(board.width) || 0;
  const pl = Number(piece.length) || 0;
  const pw = Number(piece.width) || 0;
  if (pl <= L + 1e-6 && pw <= W + 1e-6) return true;
  if (!piece.constrainGrain && pl <= W + 1e-6 && pw <= L + 1e-6) return true;
  return false;
}

/**
 * Human-readable reason a part could not nest (wrong species, too small, too thin, etc.).
 */
export function diagnoseUnallocated(
  piece: CutPiece,
  boards: EngineBoard[]
): string {
  const active = boards.filter((b) => (b.status || 'active') !== 'consumed');
  const matching = active.filter((b) => speciesMatches(piece.species, b.species));

  if (matching.length === 0) {
    return `No ${piece.species} stock logged. Add a ${piece.species} board/sheet at least ${Math.round(piece.length)}×${Math.round(piece.width)} mm before cutting this part.`;
  }

  const thickOk = matching.filter((b) => canFitThickness(b, piece));
  if (thickOk.length === 0) {
    const thickest = matching.reduce((a, b) => (a.thickness >= b.thickness ? a : b));
    return `${piece.species} stock is too thin (need ${piece.thickness} mm, thickest on hand is ${thickest.thickness} mm on ${thickest.tagId}).`;
  }

  const faceOk = thickOk.filter((b) => boardFaceFits(b, piece));
  if (faceOk.length === 0) {
    const largest = thickOk.reduce((a, b) =>
      a.length * a.width >= b.length * b.width ? a : b
    );
    return `${piece.species} stock is too small for ${Math.round(piece.length)}×${Math.round(piece.width)} mm. Largest ${piece.species} on hand: ${largest.tagId} (${Math.round(largest.length)}×${Math.round(largest.width)} mm).`;
  }

  return `Could not fit on remaining ${piece.species} stock after other parts were placed.`;
}

/** Summarise every unallocated piece with a concrete stock reason. */
export function explainUnallocated(
  pieces: CutPiece[],
  boards: EngineBoard[]
): Array<{ piece: CutPiece; reason: string }> {
  return pieces.map((piece) => ({
    piece,
    reason: diagnoseUnallocated(piece, boards),
  }));
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
      constrainGrain: part.constrainGrain,
    }))
  );
}

function orientations(piece: CutPiece): { cutLen: number; cutWid: number; rotated: boolean }[] {
  const opts = [{ cutLen: piece.length, cutWid: piece.width, rotated: false }];
  if (!piece.constrainGrain && piece.length !== piece.width) {
    opts.push({ cutLen: piece.width, cutWid: piece.length, rotated: true });
  }
  return opts;
}

function canFitThickness(board: EngineBoard, piece: CutPiece): boolean {
  if (!piece.thickness || piece.thickness <= 0) return true;
  return board.thickness >= piece.thickness - 0.1;
}

function fitsInRect(rect: FreeRect, cutLen: number, cutWid: number): boolean {
  return rect.w + 1e-9 >= cutLen && rect.h + 1e-9 >= cutWid;
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

  const thickOk = pieces.some(
    (p) => speciesMatches(p.species, board.species) && canFitThickness(board, p)
  );
  if (!thickOk) return 'Board too thin for required parts';

  const anyFit = pieces.some((p) => {
    if (!speciesMatches(p.species, board.species) || !canFitThickness(board, p)) return false;
    return orientations(p).some((o) => fitsInRect(usable, o.cutLen, o.cutWid));
  });
  if (!anyFit) return 'Board too short or narrow for any required piece';

  return null;
}

/**
 * Score a candidate strip fill (higher is better).
 */
export function scoreStripPack(
  boardLen: number,
  boardWidLeft: number,
  stripWid: number,
  usedLen: number,
  partCount: number,
  kerf: number,
  policy: PackPolicy = 'balanced'
): number {
  if (partCount === 0) return -1e9;

  let score = partCount * 10_000;

  const endScrap = Math.max(0, boardLen - usedLen - kerf);
  if (endScrap > 0.5 && endScrap < 80) score -= 250;
  if (endScrap >= MIN_USEFUL_OFFCUT_MM) {
    const weight = policy === 'preserve-offcut' ? 1.5 : 0.9;
    score += Math.min(endScrap, boardLen) * weight;
    if (endScrap >= usedLen) score += policy === 'preserve-offcut' ? 950 : 600;
  }

  const remBelow = boardWidLeft - stripWid - kerf;
  const fullWidth = stripWid >= boardWidLeft - 0.5;

  if (fullWidth) {
    score += 900;
    if (policy === 'full-width-first') score += 450;
  } else if (remBelow > 80) {
    score += policy === 'preserve-offcut' ? 550 : 400;
  } else if (remBelow > 0.5 && remBelow < SKINNY_OFFCUT_MM) {
    score -= 550;
  }

  score += Math.min(stripWid, 400) * 0.5;

  if (usedLen < boardLen * 0.55 && endScrap >= MIN_USEFUL_OFFCUT_MM) {
    score += 350;
  }

  if (policy === 'dense-strip') {
    score += (usedLen / Math.max(boardLen, 1)) * 350;
  }

  return score;
}

/** True when shop should cut a short blank first, then rip — preserving long continuous stock */
export function preferBlankFirst(
  stockLen: number,
  usedLen: number,
  kerf: number,
  minUseful = MIN_USEFUL_OFFCUT_MM
): boolean {
  if (usedLen <= 0 || usedLen >= stockLen - 0.5) return false;
  const remBoard = Math.max(0, stockLen - usedLen - kerf);
  if (remBoard < minUseful) return false;
  return remBoard + 1e-6 >= usedLen * 0.75;
}

/**
 * Choose workshop mode for one strip channel, respecting strategy preference when given.
 * Full-width strips ALWAYS use `crosscut-only` (no rip needed, never blank-then-split).
 */
export function chooseShopMode(
  stockLen: number,
  stockWid: number,
  stripWid: number,
  usedLen: number,
  partCount: number,
  kerf: number,
  forcedStrategy?: Exclude<CuttingStrategy, 'auto'>
): ShopMode {
  const needsRip = stripWid < stockWid - 0.5;
  if (!needsRip || partCount <= 0) return 'crosscut-only';

  if (forcedStrategy === 'rip-first') {
    return 'full-rip-crosscut';
  }
  if (forcedStrategy === 'crosscut-first') {
    const remBoard = Math.max(0, stockLen - usedLen - kerf);
    if (remBoard >= 50) return 'blank-rip-crosscut';
    return 'full-rip-crosscut';
  }
  if (forcedStrategy === 'preserve-offcut') {
    const remBoard = Math.max(0, stockLen - usedLen - kerf);
    if (remBoard >= MIN_USEFUL_OFFCUT_MM) return 'blank-rip-crosscut';
    return 'full-rip-crosscut';
  }

  return preferBlankFirst(stockLen, usedLen, kerf) ? 'blank-rip-crosscut' : 'full-rip-crosscut';
}

function packAlongLength(
  items: OrientedItem[],
  boardLen: number,
  kerf: number
): { placed: { item: OrientedItem; posX: number }[]; usedLen: number; leftover: OrientedItem[] } {
  const sorted = [...items].sort((a, b) => b.cutLen - a.cutLen || b.cutWid - a.cutWid);
  const placed: { item: OrientedItem; posX: number }[] = [];
  const leftover: OrientedItem[] = [];
  let x = 0;

  for (const item of sorted) {
    if (x + (placed.length > 0 ? kerf : 0) + item.cutLen <= boardLen + 1e-9) {
      if (placed.length > 0) x += kerf;
      placed.push({ item, posX: x });
      x += item.cutLen;
    } else {
      leftover.push(item);
    }
  }

  return { placed, usedLen: x, leftover };
}

function collectStripCandidates(
  pieces: CutPiece[],
  board: EngineBoard,
  heightLeft: number,
  boardLen: number
): Map<number, OrientedItem[]> {
  const byWid = new Map<number, OrientedItem[]>();

  for (const piece of pieces) {
    if (!speciesMatches(piece.species, board.species) || !canFitThickness(board, piece)) continue;
    for (const o of orientations(piece)) {
      if (o.cutWid > heightLeft + 1e-9 || o.cutLen > boardLen + 1e-9) continue;
      const key = Math.round(o.cutWid * 100) / 100;
      const list = byWid.get(key) || [];
      if (!list.some((x) => x.piece.id === piece.id)) {
        list.push({ piece, cutLen: o.cutLen, cutWid: o.cutWid, rotated: o.rotated });
        byWid.set(key, list);
      }
    }
  }
  return byWid;
}

function estimateRemainingFit(
  remaining: CutPiece[],
  board: EngineBoard,
  boardLen: number,
  heightAfter: number,
  kerf: number
): number {
  if (remaining.length === 0 || heightAfter < 0.5) return 0;
  let height = heightAfter;
  let left = [...remaining];
  let fitted = 0;
  while (left.length > 0 && height > 0.5) {
    const best = chooseBestStripRaw(left, board, height, boardLen, kerf, 'balanced', false);
    if (!best) break;
    fitted += best.items.length;
    const placedIds = new Set(best.items.map((x) => x.item.piece.id));
    left = left.filter((p) => !placedIds.has(p.id));
    height -= best.stripWid + kerf;
  }
  return fitted;
}

function chooseBestStripRaw(
  pieces: CutPiece[],
  board: EngineBoard,
  heightLeft: number,
  boardLen: number,
  kerf: number,
  policy: PackPolicy,
  withLookahead: boolean
): StripPackResult | null {
  const candidates = collectStripCandidates(pieces, board, heightLeft, boardLen);
  let best: StripPackResult | null = null;

  for (const [stripWid, items] of Array.from(candidates.entries())) {
    const packed = packAlongLength(items, boardLen, kerf);
    if (packed.placed.length === 0) continue;

    let score = scoreStripPack(
      boardLen,
      heightLeft,
      stripWid,
      packed.usedLen,
      packed.placed.length,
      kerf,
      policy
    );

    if (withLookahead) {
      const placedIds = new Set(packed.placed.map((x) => x.item.piece.id));
      const remaining = pieces.filter((p) => !placedIds.has(p.id));
      const heightAfter = heightLeft - stripWid - kerf;
      const extra = estimateRemainingFit(remaining, board, boardLen, heightAfter, kerf);
      score += extra * 10_000;
    }

    if (!best || score > best.score) {
      best = {
        stripWid,
        items: packed.placed,
        usedLen: packed.usedLen,
        score,
      };
    }
  }

  return best;
}

function chooseBestStrip(
  pieces: CutPiece[],
  board: EngineBoard,
  heightLeft: number,
  boardLen: number,
  kerf: number,
  policy: PackPolicy
): StripPackResult | null {
  return chooseBestStripRaw(pieces, board, heightLeft, boardLen, kerf, policy, true);
}

function makePartPlacement(
  board: EngineBoard,
  item: OrientedItem,
  posX: number,
  posY: number,
  stripWid: number,
  boardLen: number,
  kerf: number,
  step: number,
  stripKey: string
): Placement {
  const remLen = Math.max(0, boardLen - (posX + item.cutLen + kerf));
  return {
    stepIndex: step,
    pieceId: item.piece.id,
    partName: item.piece.name,
    boardId: board.id,
    boardTag: board.tagId || board.id,
    species: board.species,
    source: board.source || 'Stock',
    location: board.location || 'Workshop',
    opKind: 'crosscut',
    producesFinishedPart: true,
    stockLen: board.length,
    stockWid: board.width,
    thickness: board.thickness,
    cutLen: item.cutLen,
    cutWid: item.cutWid,
    posX,
    posY,
    frameX: posX,
    frameY: posY,
    frameLen: Math.max(0, boardLen - posX),
    frameWid: stripWid,
    localX: 0,
    localY: 0,
    kerf,
    rotated: item.rotated,
    remLen,
    remWid: stripWid,
    edgeLen: 0,
    edgeWid: 0,
    stripKey,
  };
}

/**
 * Crosscut-Blank column packer: cuts short full-width blanks of length `blankLen`
 * and stacks parts sharing that length ACROSS the board width (Y axis).
 * Ideal when multiple narrow parts share a length (e.g. 2× 200×20 on 2000×85 →
 * one 200×85 blank ripped twice, preserving 1796.8×85 of the board).
 */
function packBoardByBlanks(
  board: EngineBoard,
  pieces: CutPiece[],
  kerf: number,
  endTrim: number,
  startStep: number
): { placements: Placement[]; remaining: CutPiece[] } {
  const usable = usableBoardRect(board, endTrim);
  if (!usable) return { placements: [], remaining: pieces };

  const unmatched: CutPiece[] = [];
  let queue = pieces.filter((p) => {
    const ok = speciesMatches(p.species, board.species) && canFitThickness(board, p);
    if (!ok) unmatched.push(p);
    return ok;
  });

  const placements: Placement[] = [];
  let step = startStep;
  let curX = usable.x;
  let lenLeft = usable.w;
  let blankIndex = 0;

  while (queue.length > 0 && lenLeft > 0.5) {
    const byLen = new Map<number, OrientedItem[]>();
    for (const piece of queue) {
      for (const o of orientations(piece)) {
        if (o.cutLen > lenLeft + 1e-9 || o.cutWid > usable.h + 1e-9) continue;
        const key = Math.round(o.cutLen * 100) / 100;
        const list = byLen.get(key) || [];
        if (!list.some((x) => x.piece.id === piece.id)) {
          list.push({ piece, cutLen: o.cutLen, cutWid: o.cutWid, rotated: o.rotated });
          byLen.set(key, list);
        }
      }
    }

    let bestCol: {
      blankLen: number;
      placed: { item: OrientedItem; posY: number }[];
      usedWid: number;
      score: number;
    } | null = null;

    for (const [blankLen, items] of Array.from(byLen.entries())) {
      const sorted = [...items].sort((a, b) => b.cutWid - a.cutWid);
      const placed: { item: OrientedItem; posY: number }[] = [];
      let y = 0;
      // Only group parts of the SAME width into a single blank column so the saw fence
      // isn't reset to multiple widths on every blank
      const firstWid = sorted[0]?.cutWid ?? 0;
      for (const item of sorted) {
        if (Math.abs(item.cutWid - firstWid) > 0.5) continue;
        if (y + (placed.length > 0 ? kerf : 0) + item.cutWid <= usable.h + 1e-9) {
          if (placed.length > 0) y += kerf;
          placed.push({ item, posY: y });
          y += item.cutWid;
        }
      }
      if (placed.length === 0) continue;

      const remLen = Math.max(0, lenLeft - blankLen - kerf);
      const remWid = Math.max(0, usable.h - y - kerf);
      const fullWid = y >= usable.h - 0.5;
      let score =
        placed.length * 12_000 +
        remLen * 1.5 +
        (fullWid ? 1200 : 0) -
        (remWid > 0.5 && remWid < SKINNY_OFFCUT_MM ? 600 : 0);

      if (!bestCol || score > bestCol.score) {
        bestCol = { blankLen, placed, usedWid: y, score };
      }
    }

    if (!bestCol) break;

    const stripKey = `${board.tagId || board.id}-B${blankIndex}`;
    for (const { item, posY } of bestCol.placed) {
      const remLen = Math.max(0, usable.w - (curX - usable.x + bestCol.blankLen + kerf));
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
        producesFinishedPart: true,
        stockLen: board.length,
        stockWid: board.width,
        thickness: board.thickness,
        cutLen: item.cutLen,
        cutWid: item.cutWid,
        posX: curX,
        posY: usable.y + posY,
        frameX: curX,
        frameY: usable.y + posY,
        frameLen: bestCol.blankLen,
        frameWid: item.cutWid,
        localX: 0,
        localY: 0,
        kerf,
        rotated: item.rotated,
        remLen,
        remWid: item.cutWid,
        edgeLen: 0,
        edgeWid: 0,
        stripKey,
      });
      queue = queue.filter((p) => p.id !== item.piece.id);
    }

    curX += bestCol.blankLen + kerf;
    lenLeft = usable.x + usable.w - curX;
    blankIndex += 1;
  }

  return { placements, remaining: [...unmatched, ...queue] };
}

function packBoard(
  board: EngineBoard,
  pieces: CutPiece[],
  kerf: number,
  endTrim: number,
  startStep: number,
  policy: PackPolicy
): { placements: Placement[]; remaining: CutPiece[] } {
  // Only use blank-columns when parts share a single width (or when forced to crosscut-first)
  if (policy === 'blank-columns') {
    const widths = new Set(
      pieces.map((p) => Math.round(Math.min(p.length, p.width) * 10) / 10)
    );
    if (widths.size <= 1) {
      return packBoardByBlanks(board, pieces, kerf, endTrim, startStep);
    }
  }
  const usable = usableBoardRect(board, endTrim);
  if (!usable) return { placements: [], remaining: pieces };

  const unmatched: CutPiece[] = [];
  let queue = pieces.filter((p) => {
    const ok = speciesMatches(p.species, board.species) && canFitThickness(board, p);
    if (!ok) unmatched.push(p);
    return ok;
  });

  const placements: Placement[] = [];
  let step = startStep;
  let y = usable.y;
  let heightLeft = usable.h;
  let stripIndex = 0;

  while (queue.length > 0 && heightLeft > 0.5) {
    const best = chooseBestStrip(queue, board, heightLeft, usable.w, kerf, policy);
    if (!best) break;

    const stripKey = `${board.tagId || board.id}-S${stripIndex}`;
    const posY = y;

    for (const { item, posX } of best.items) {
      placements.push(
        makePartPlacement(
          board,
          item,
          usable.x + posX,
          posY,
          best.stripWid,
          usable.w,
          kerf,
          step++,
          stripKey
        )
      );
      queue = queue.filter((p) => p.id !== item.piece.id);
    }

    y += best.stripWid + kerf;
    heightLeft = usable.y + usable.h - y;
    stripIndex += 1;
  }

  return { placements, remaining: [...unmatched, ...queue] };
}

function expandBlankColumnGroup(
  col: Placement[],
  base: Placement,
  boardLenLeft: number,
  stockWid: number,
  kerf: number,
  startStep: number
): { ops: Placement[]; nextStep: number; nextBoardLenLeft: number } {
  const sortedByY = [...col].sort((a, b) => a.posY - b.posY);
  const blankLen = Math.max(...sortedByY.map((p) => p.cutLen));
  const blankRem = Math.max(0, boardLenLeft - blankLen - kerf);
  const stripKey = sortedByY[0].stripKey;
  const ops: Placement[] = [];
  let step = startStep;

  // Single full-width piece → direct crosscut off the board (no blank/rip needed)
  if (sortedByY.length === 1 && sortedByY[0].cutWid >= stockWid - 0.5) {
    const p = sortedByY[0];
    ops.push({
      ...p,
      stepIndex: step++,
      opKind: 'crosscut',
      producesFinishedPart: true,
      frameX: p.posX,
      frameY: 0,
      frameLen: boardLenLeft,
      frameWid: stockWid,
      remLen: blankRem,
      remWid: stockWid,
      edgeLen: 0,
      edgeWid: 0,
      stockLen: p.stockLen,
      stockWid,
    });
    return { ops, nextStep: step, nextBoardLenLeft: blankRem };
  }

  // 1) Crosscut the short full-width blank from the remaining board
  ops.push({
    ...base,
    stepIndex: step++,
    pieceId: `blank-${base.boardTag}-${step}-${stripKey}`,
    partName: `Crosscut ${Number(blankLen.toFixed(1))}mm blank`,
    opKind: 'blank',
    producesFinishedPart: false,
    cutLen: blankLen,
    cutWid: stockWid,
    posX: sortedByY[0].posX,
    posY: 0,
    frameX: 0,
    frameY: 0,
    frameLen: boardLenLeft,
    frameWid: stockWid,
    localX: 0,
    localY: 0,
    rotated: false,
    remLen: blankRem,
    remWid: stockWid,
    edgeLen: 0,
    edgeWid: 0,
    stockLen: boardLenLeft,
    stockWid,
    stripKey,
    kerf,
  });

  // 2) Rip each piece stacked across the width of that short blank.
  // Because the blank length ALREADY equals p.cutLen, each rip directly produces
  // the finished part — no impossible 0mm-remainder secondary crosscut!
  let blankWidLeft = stockWid;
  for (const p of sortedByY) {
    const edgeWid = Math.max(0, blankWidLeft - p.cutWid - kerf);
    ops.push({
      ...p,
      stepIndex: step++,
      opKind: 'rip',
      producesFinishedPart: true,
      cutLen: p.cutLen,
      cutWid: p.cutWid,
      posX: p.posX,
      posY: p.posY,
      frameX: 0,
      frameY: 0,
      frameLen: blankLen,
      frameWid: blankWidLeft,
      localX: 0,
      localY: 0,
      remLen: p.cutLen,
      remWid: p.cutWid,
      edgeLen: blankLen,
      edgeWid,
      stockLen: blankLen,
      stockWid: blankWidLeft,
      stripKey,
      kerf,
    });
    blankWidLeft = edgeWid;
  }

  return { ops, nextStep: step, nextBoardLenLeft: blankRem };
}

function expandStripRow(
  sorted: Placement[],
  base: Placement,
  stockLen: number,
  stockWid: number,
  kerf: number,
  mode: ShopMode,
  startStep: number
): { ops: Placement[]; nextStep: number } {
  const stripWid = sorted[0].cutWid;
  const stripY = sorted[0].posY;
  const stripKey = sorted[0].stripKey;
  const originX = sorted[0].posX;

  const ops: Placement[] = [];
  let step = startStep;
  const edgeWid = Math.max(0, stockWid - stripY - stripWid - kerf);

  /**
   * Blank-first (per piece): crosscut ONE part length from the long board, then rip
   * that short blank to strip width. Because the blank is already exact part length,
   * the rip directly yields the finished piece (`producesFinishedPart: true`) —
   * never emit a redundant 0mm-remainder crosscut after ripping an exact-length blank!
   */
  if (mode === 'blank-rip-crosscut') {
    let boardLenLeft = stockLen;
    let nestX = originX;
    for (const p of sorted) {
      const blankRem = Math.max(0, boardLenLeft - p.cutLen - kerf);
      const pieceStripKey = `${stripKey}-${p.pieceId}`;

      ops.push({
        ...base,
        stepIndex: step++,
        pieceId: `blank-${base.boardTag}-${step}-${p.pieceId}`,
        partName: `Crosscut ${Number(p.cutLen.toFixed(1))}mm blank`,
        opKind: 'blank',
        producesFinishedPart: false,
        cutLen: p.cutLen,
        cutWid: stockWid,
        posX: nestX,
        posY: 0,
        frameX: 0,
        frameY: 0,
        frameLen: boardLenLeft,
        frameWid: stockWid,
        localX: 0,
        localY: 0,
        rotated: false,
        remLen: blankRem,
        remWid: stockWid,
        edgeLen: 0,
        edgeWid: 0,
        stockLen: boardLenLeft,
        stockWid,
        stripKey: pieceStripKey,
        kerf,
      });

      ops.push({
        ...p,
        stepIndex: step++,
        opKind: 'rip',
        producesFinishedPart: true,
        cutLen: p.cutLen,
        cutWid: stripWid,
        posX: nestX,
        posY: stripY,
        frameX: 0,
        frameY: 0,
        frameLen: p.cutLen,
        frameWid: stockWid,
        localX: 0,
        localY: 0,
        remLen: p.cutLen,
        remWid: stripWid,
        edgeLen: p.cutLen,
        edgeWid: Math.max(0, edgeWid),
        stockLen: p.cutLen,
        stockWid,
        stripKey: pieceStripKey,
        kerf,
      });

      nestX += p.cutLen + kerf;
      boardLenLeft = blankRem;
    }
    return { ops, nextStep: step };
  }

  if (mode === 'full-rip-crosscut') {
    ops.push({
      ...base,
      stepIndex: step++,
      pieceId: `rip-${base.boardTag}-${Math.round(stripY)}`,
      partName: `Rip ${Number(stripWid.toFixed(1))}mm strip`,
      opKind: 'rip',
      producesFinishedPart: false,
      cutLen: stockLen,
      cutWid: stripWid,
      posX: originX,
      posY: stripY,
      frameX: 0,
      frameY: stripY,
      frameLen: stockLen,
      frameWid: stockWid - stripY,
      localX: 0,
      localY: 0,
      rotated: false,
      remLen: stockLen,
      remWid: stripWid,
      edgeLen: stockLen,
      edgeWid: Math.max(0, edgeWid),
      stripKey,
      kerf,
    });
  }

  let lenLeft = stockLen;
  for (const p of sorted) {
    const remLen = Math.max(0, lenLeft - p.cutLen - kerf);
    ops.push({
      ...p,
      stepIndex: step++,
      opKind: 'crosscut',
      producesFinishedPart: true,
      posX: p.posX,
      frameX: stockLen - lenLeft,
      frameY: stripY,
      frameLen: lenLeft,
      frameWid: stripWid,
      localX: 0,
      localY: 0,
      remLen,
      remWid: stripWid,
      edgeLen: 0,
      edgeWid: 0,
      stockLen: p.stockLen,
      stockWid: p.stockWid,
    });
    lenLeft = remLen;
  }

  return { ops, nextStep: step };
}

/**
 * Expand nested placements into workshop sequence.
 */
export function expandToShopSequence(
  placements: Placement[],
  kerf: number,
  forcedStrategy?: Exclude<CuttingStrategy, 'auto'>
): Placement[] {
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

    const isBlankColumns = list.some((p) => /-B\d+$/.test(p.stripKey || ''));
    if (isBlankColumns) {
      const cols = Array.from(stripMap.values()).sort(
        (a, b) => a[0].posX - b[0].posX || a[0].posY - b[0].posY
      );
      const totalBlankLen =
        cols.reduce((acc, col) => acc + Math.max(...col.map((p) => p.cutLen)), 0) +
        Math.max(0, cols.length - 1) * kerf;
      const uniqueWidths = new Set(list.map((p) => Math.round(p.cutWid * 10) / 10));
      // Use blank-column expansion when all parts on this board share one width (or 1 blank column)
      // and it preserves a long continuous board (or user explicitly forced crosscut-first)
      if (
        (uniqueWidths.size <= 1 || cols.length <= 1 || forcedStrategy === 'crosscut-first') &&
        (forcedStrategy === 'crosscut-first' ||
          preferBlankFirst(stockLen, totalBlankLen, kerf))
      ) {
        let boardLenLeft = stockLen;
        for (const col of cols) {
          const res = expandBlankColumnGroup(col, base, boardLenLeft, stockWid, kerf, step);
          out.push(...res.ops);
          step = res.nextStep;
          boardLenLeft = res.nextBoardLenLeft;
        }
        continue;
      }
    }

    const strips = Array.from(stripMap.values()).sort(
      (a, b) => a[0].posY - b[0].posY || a[0].posX - b[0].posX
    );

    // Multi-strip on the same board uses full-rip channels so Y strips don't conflict
    const multiStripBoard = strips.length > 1;

    for (const row of strips) {
      const sorted = [...row].sort((a, b) => a.posX - b.posX);
      const stripWid = sorted[0].cutWid;
      const originX = sorted[0].posX;
      const usedLen = sorted[sorted.length - 1].posX + sorted[sorted.length - 1].cutLen - originX;
      const mode = multiStripBoard
        ? stripWid < stockWid - 0.5
          ? 'full-rip-crosscut'
          : 'crosscut-only'
        : chooseShopMode(
            stockLen,
            stockWid,
            stripWid,
            usedLen,
            sorted.length,
            kerf,
            forcedStrategy
          );
      const expanded = expandStripRow(sorted, base, stockLen, stockWid, kerf, mode, step);
      out.push(...expanded.ops);
      step = expanded.nextStep;
    }
  }

  return out;
}

/**
 * Extract all remaining offcuts from a finished plan and classify them (§7).
 */
export function summarizePlanOffcuts(
  plan: CuttingPlan,
  thresholds: OffcutThreshold = { minLength: MIN_USEFUL_OFFCUT_MM, minWidth: MIN_USEFUL_OFFCUT_MM }
): OffcutSummaryItem[] {
  const items: OffcutSummaryItem[] = [];
  const byBoard = new Map<string, Placement[]>();
  for (const p of plan.placements) {
    const list = byBoard.get(p.boardTag) || [];
    list.push(p);
    byBoard.set(p.boardTag, list);
  }

  const pushOffcut = (
    sample: Placement,
    len: number,
    wid: number,
    kind: OffcutSummaryItem['kind']
  ) => {
    if (len <= 0.5 || wid <= 0.5) return;
    const l = Number(len.toFixed(1));
    const w = Number(wid.toFixed(1));
    const aspectRatio = Number((Math.max(l, w) / Math.max(1, Math.min(l, w))).toFixed(2));
    items.push({
      boardTag: sample.boardTag,
      length: l,
      width: w,
      thickness: sample.thickness,
      species: sample.species,
      source: sample.source,
      location: sample.location,
      aspectRatio,
      tier: classifyOffcut(l, w, thresholds),
      kind,
    });
  };

  for (const [, list] of Array.from(byBoard.entries())) {
    const blanks = list.filter((p) => p.opKind === 'blank');
    const rips = list.filter((p) => p.opKind === 'rip');
    const cuts = list.filter((p) => p.opKind === 'crosscut');
    const sample = list[0];

    if (blanks.length > 0) {
      const lastBlank = blanks[blanks.length - 1];
      pushOffcut(sample, lastBlank.remLen, lastBlank.remWid, 'continuous_board');
      // Group rips by blank stripKey and only record the final remaining edge of each blank
      const ripsByBlank = new Map<string, Placement[]>();
      for (const r of rips) {
        const k = r.stripKey || `step-${r.stepIndex}`;
        const arr = ripsByBlank.get(k) || [];
        arr.push(r);
        ripsByBlank.set(k, arr);
      }
      for (const arr of Array.from(ripsByBlank.values())) {
        const lastRipOnBlank = arr[arr.length - 1];
        pushOffcut(sample, lastRipOnBlank.edgeLen, lastRipOnBlank.edgeWid, 'parallel_aside');
      }
    } else if (rips.length > 0) {
      const lastRip = rips[rips.length - 1];
      pushOffcut(sample, lastRip.edgeLen, lastRip.edgeWid, 'parallel_aside');
      // Strip end remnants
      const byStrip = new Map<string, Placement[]>();
      for (const c of cuts) {
        const k = c.stripKey || 'default';
        const arr = byStrip.get(k) || [];
        arr.push(c);
        byStrip.set(k, arr);
      }
      for (const arr of Array.from(byStrip.values())) {
        const sorted = [...arr].sort((a, b) => a.posX - b.posX);
        const last = sorted[sorted.length - 1];
        if (last) pushOffcut(sample, last.remLen, last.remWid, 'strip_end');
      }
    } else if (cuts.length > 0) {
      const sorted = [...cuts].sort((a, b) => a.posX - b.posX);
      const last = sorted[sorted.length - 1];
      if (last) pushOffcut(sample, last.remLen, last.remWid, 'continuous_board');
    }
  }

  return items;
}

function isBoardOffcutLike(b: EngineBoard): boolean {
  if (b.isOffcut) return true;
  const src = (b.source || '').toLowerCase();
  const tag = (b.tagId || '').toUpperCase();
  return src.includes('offcut') || /-OFFCUT|-REM|-ASIDE/.test(tag);
}

/**
 * Priority-based multi-objective plan score (§5 & §8):
 * Priority 1: Physical correctness (enforced before scoring)
 * Priority 2: Complete the job (partsPlaced / unallocated)
 * Priority 3: Intelligent stock allocation (use offcuts, fewer fresh boards, keep unused sheets)
 * Priority 4: Practical sequence (fewer setup ops & total cuts)
 * Priority 5: Preserve useful continuous offcut
 * Priority 6: Minimise skinny scrap
 */
export function scoreCuttingPlan(
  plan: CuttingPlan,
  strategy = 'unknown',
  boardMetaByTag: Record<string, { area: number; isOffcut: boolean }> = {},
  thresholds: OffcutThreshold = { minLength: MIN_USEFUL_OFFCUT_MM, minWidth: MIN_USEFUL_OFFCUT_MM },
  preferOffcutWeight = 1
): PlanScoreBreakdown {
  const finished = plan.placements.filter((p) => isFinishedPlacement(p));
  const setups = plan.placements.filter((p) => !isFinishedPlacement(p));
  const blanks = plan.placements.filter((p) => p.opKind === 'blank');
  const rips = plan.placements.filter((p) => p.opKind === 'rip');

  const offcuts = summarizePlanOffcuts(plan, thresholds);
  const reusableOffcuts = offcuts.filter((o) => o.tier === 'reusable');
  const reusableOffcutCount = reusableOffcuts.length;
  const reusableOffcutArea = reusableOffcuts.reduce((acc, o) => acc + o.length * o.width, 0);
  const scrapCount = offcuts.filter((o) => o.tier === 'scrap').length;

  let longestOffcutLen = 0;
  let longestOffcutWid = 0;
  let skinnyWasteMm = 0;

  if (blanks.length > 0) {
    const lastBlank = blanks[blanks.length - 1];
    longestOffcutLen = lastBlank.remLen;
    longestOffcutWid = lastBlank.remWid;
  } else {
    for (const o of offcuts) {
      if (o.tier === 'scrap') continue;
      if (
        o.length * o.width > longestOffcutLen * longestOffcutWid ||
        (o.kind === 'continuous_board' && o.length > longestOffcutLen)
      ) {
        longestOffcutLen = o.length;
        longestOffcutWid = o.width;
      }
    }
  }

  for (const r of rips) {
    const aside = r.edgeWid || 0;
    if (aside > 0.5 && aside < SKINNY_OFFCUT_MM) skinnyWasteMm += aside;
  }

  const partsPlaced = finished.length;
  const unallocated = plan.unallocated.length;
  const setupOps = setups.length;
  const finishedOps = finished.length;
  const totalOps = plan.placements.length;

  let unusedArea = 0;
  let consumedArea = 0;
  let offcutsUsed = 0;
  let freshBoardsUsed = 0;

  for (const [tag, meta] of Object.entries(boardMetaByTag)) {
    if (plan.usedBoardTags.includes(tag)) {
      consumedArea += meta.area;
      if (meta.isOffcut) offcutsUsed += 1;
      else freshBoardsUsed += 1;
    } else {
      unusedArea += meta.area;
    }
  }
  const boardsUsed = plan.usedBoardTags.length;

  const maxBoardLen = Math.max(0, ...plan.placements.map((p) => p.stockLen || 0));
  const continuousOffcuts = offcuts.filter(
    (o) =>
      o.kind === 'continuous_board' &&
      o.tier !== 'scrap' &&
      o.length >= Math.max(thresholds.minLength, maxBoardLen * 0.35)
  );
  const bestContinuous = continuousOffcuts.sort(
    (a, b) => b.length * b.width - a.length * a.width
  )[0];
  const continuousFullWidthArea = bestContinuous
    ? bestContinuous.length * bestContinuous.width
    : 0;

  const continuousBonus = bestContinuous
    ? Math.min(continuousFullWidthArea, 600_000) * 0.0025 * preferOffcutWeight +
      500 * preferOffcutWeight
    : longestOffcutLen >= thresholds.minLength
      ? Math.min(longestOffcutLen * Math.max(longestOffcutWid, 1), 600_000) *
        0.0012 *
        preferOffcutWeight
      : 0;

  let unnecessaryFullRipPenalty = 0;
  if (blanks.length === 0 && rips.length > 0) {
    for (const r of rips) {
      const stripCuts = finished.filter(
        (c) => (r.stripKey && c.stripKey === r.stripKey) || Math.abs(c.posY - r.posY) < 0.51
      );
      const usedLen = stripCuts.reduce((acc, c) => acc + c.cutLen, 0);
      if (r.cutLen > 500 && usedLen < r.cutLen * 0.45) {
        unnecessaryFullRipPenalty += (r.cutLen - usedLen) * 0.45;
      }
    }
  }

  const total =
    partsPlaced * 100_000 -
    unallocated * 100_000 +
    offcutsUsed * 900 -
    freshBoardsUsed * 350 +
    unusedArea * 0.004 -
    consumedArea * 0.0005 -
    setupOps * 85 -
    totalOps * 15 -
    unnecessaryFullRipPenalty +
    continuousBonus +
    reusableOffcutCount * 90 * preferOffcutWeight -
    skinnyWasteMm * 40 -
    scrapCount * 75;

  return {
    total,
    partsPlaced,
    unallocated,
    setupOps,
    finishedOps,
    totalOps,
    longestOffcutLen,
    longestOffcutWid,
    continuousFullWidthArea,
    reusableOffcutArea,
    reusableOffcutCount,
    scrapCount,
    skinnyWasteMm,
    offcutsUsed,
    freshBoardsUsed,
    boardsUsed,
    consumedArea,
    unusedArea,
    strategy,
  };
}

/**
 * Explicit tiered lexicographic comparator (§5 & QA §1).
 * Returns > 0 if `a` is strictly better than `b`, < 0 if `b` is better, 0 if tied.
 * Ensures lower-priority objectives can NEVER override higher-priority tiers.
 */
export function compareCuttingPlans(
  a: PlanScoreBreakdown,
  b: PlanScoreBreakdown,
  mode: CuttingStrategy = 'auto'
): number {
  // Tier 1: Job completion (produce all required components)
  if (a.partsPlaced !== b.partsPlaced) return a.partsPlaced - b.partsPlaced;
  if (a.unallocated !== b.unallocated) return b.unallocated - a.unallocated;

  // Tier 2: Stock conservation — open fewer fresh boards (use existing offcuts first)
  if (a.freshBoardsUsed !== b.freshBoardsUsed) return b.freshBoardsUsed - a.freshBoardsUsed;

  // Tier 3: Total boards opened
  if (a.boardsUsed !== b.boardsUsed) return b.boardsUsed - a.boardsUsed;

  // Tier 4: Preserve untouched stock (do not open a large sheet when a smaller board fits)
  if (Math.abs(a.consumedArea - b.consumedArea) > 25_000) {
    return b.consumedArea - a.consumedArea;
  }

  // Tier 5: Preserve full-width continuous timber vs fragmenting the full board length,
  // provided it doesn't blow up operation count
  const contDiff = a.continuousFullWidthArea - b.continuousFullWidthArea;
  const contThreshold = mode === 'preserve-offcut' ? 5_000 : 25_000;
  const opsDelta = a.totalOps - b.totalOps;
  if (Math.abs(contDiff) > contThreshold) {
    if (contDiff > 0 && opsDelta <= 3) return 1;
    if (contDiff < 0 && -opsDelta <= 3) return -1;
  }

  // Tier 6: Avoid skinny rip waste (< 25mm slivers)
  if (Math.abs(a.skinnyWasteMm - b.skinnyWasteMm) > 1) {
    return b.skinnyWasteMm - a.skinnyWasteMm;
  }

  // Tier 7: Practical sequence — fewer total operations, then fewer setup operations
  if (a.totalOps !== b.totalOps) return b.totalOps - a.totalOps;
  if (a.setupOps !== b.setupOps) return b.setupOps - a.setupOps;

  // Tier 8: Total reusable offcut area & composite tie-breaker
  if (Math.abs(a.reusableOffcutArea - b.reusableOffcutArea) > 2_000) {
    return a.reusableOffcutArea - b.reusableOffcutArea;
  }
  return a.total - b.total;
}

function nestAcrossBoards(
  boards: EngineBoard[],
  pieces: CutPiece[],
  kerf: number,
  endTrim: number,
  policy: PackPolicy,
  boardOrder: BoardOrder,
  forcedShop?: Exclude<CuttingStrategy, 'auto'>
): RawNest {
  const ordered = [...boards].sort((a, b) => {
    if (boardOrder === 'offcuts-first') {
      const oa = isBoardOffcutLike(a) ? 0 : 1;
      const ob = isBoardOffcutLike(b) ? 0 : 1;
      if (oa !== ob) return oa - ob;
    }
    const areaA = a.length * a.width;
    const areaB = b.length * b.width;
    return boardOrder === 'large-first' ? areaB - areaA : areaA - areaB;
  });

  let queue = [...pieces];
  const placements: Placement[] = [];

  for (const board of ordered) {
    if (queue.length === 0) break;
    if (boardRejectReason(board, queue, endTrim)) continue;

    const forBoard = queue.filter((p) => speciesMatches(p.species, board.species));
    const deferred = queue.filter((p) => !speciesMatches(p.species, board.species));
    if (forBoard.length === 0) continue;

    const packed = packBoard(board, forBoard, kerf, endTrim, placements.length + 1, policy);
    if (packed.placements.length > 0) {
      placements.push(...packed.placements);
    }
    queue = [...deferred, ...packed.remaining];
  }

  return { placements, remaining: queue, policy, boardOrder, forcedShop };
}

function inferEffectiveStrategy(plan: CuttingPlan): Exclude<CuttingStrategy, 'auto'> {
  const hasBlank = plan.placements.some((p) => p.opKind === 'blank');
  const hasRip = plan.placements.some((p) => p.opKind === 'rip');
  if (hasBlank) return 'crosscut-first';
  if (hasRip) return 'rip-first';
  return 'crosscut-first';
}

function buildPlainExplanation(
  plan: CuttingPlan,
  selected: CuttingStrategy,
  effective: Exclude<CuttingStrategy, 'auto'>,
  scored: PlanScoreBreakdown
): string {
  const cuts = plan.placements.filter((p) => isFinishedPlacement(p)).length;
  const blanks = plan.placements.filter((p) => p.opKind === 'blank').length;
  const rips = plan.placements.filter((p) => p.opKind === 'rip').length;
  const boards = plan.usedBoardTags.join(', ') || 'none';

  const seqDesc =
    blanks > 0
      ? `crosscutting ${blanks} short blank${blanks === 1 ? '' : 's'} first, then ripping ${cuts} finished piece${cuts === 1 ? '' : 's'}`
      : rips > 0
        ? `ripping ${rips} strip channel${rips === 1 ? '' : 's'} first, then crosscutting ${cuts} part${cuts === 1 ? '' : 's'}`
        : `making ${cuts} direct full-width crosscut${cuts === 1 ? '' : 's'} with no rip needed`;

  const offcutDesc =
    scored.longestOffcutLen >= MIN_USEFUL_OFFCUT_MM
      ? ` Preserves a ${Math.round(scored.longestOffcutLen)} × ${Math.round(scored.longestOffcutWid)}mm reusable offcut.`
      : '';

  const prefix =
    selected === 'auto'
      ? `Logger chose ${STRATEGY_META[effective].short}: `
      : `${STRATEGY_META[selected].short}: `;

  return `${prefix}${seqDesc} on ${boards} (${plan.placements.length} total shop steps).${offcutDesc}`;
}

function finalizePlan(
  nest: RawNest,
  rejectedBoards: CuttingPlan['rejectedBoards'],
  kerf: number,
  boardMetaByTag: Record<string, { area: number; isOffcut: boolean }>,
  thresholds: OffcutThreshold,
  preferOffcutWeight = 1
): { plan: CuttingPlan; scored: PlanScoreBreakdown } {
  const shop = expandToShopSequence(nest.placements, kerf, nest.forcedShop);
  const usedBoardTags = Array.from(new Set(nest.placements.map((p) => p.boardTag)));
  const strategy = `${nest.policy}/${nest.boardOrder}${nest.forcedShop ? `/${nest.forcedShop}` : ''}`;
  const plan: CuttingPlan = {
    placements: shop,
    unallocated: nest.remaining,
    rejectedBoards,
    usedBoardTags,
    strategy,
  };
  plan.offcuts = summarizePlanOffcuts(plan, thresholds);
  const scored = scoreCuttingPlan(plan, strategy, boardMetaByTag, thresholds, preferOffcutWeight);
  plan.score = scored.total;
  return { plan, scored };
}

function bestPlanForMode(
  mode: Exclude<CuttingStrategy, 'auto'>,
  candidates: EngineBoard[],
  pieces: CutPiece[],
  rejectedBoards: CuttingPlan['rejectedBoards'],
  kerf: number,
  endTrim: number,
  boardMetaByTag: Record<string, { area: number; isOffcut: boolean }>,
  thresholds: OffcutThreshold
): { plan: CuttingPlan; scored: PlanScoreBreakdown } | null {
  const policies: PackPolicy[] =
    mode === 'preserve-offcut'
      ? ['blank-columns', 'preserve-offcut', 'full-width-first', 'balanced']
      : mode === 'rip-first'
        ? ['dense-strip', 'balanced', 'full-width-first']
        : ['blank-columns', 'full-width-first', 'balanced', 'preserve-offcut'];

  const orders: BoardOrder[] = ['offcuts-first', 'small-first', 'large-first'];
  const preferOffcutWeight = mode === 'preserve-offcut' ? 1.8 : 1;

  let best: { plan: CuttingPlan; scored: PlanScoreBreakdown } | null = null;

  for (const policy of policies) {
    for (const boardOrder of orders) {
      const nest = nestAcrossBoards(candidates, pieces, kerf, endTrim, policy, boardOrder, mode);
      const res = finalizePlan(
        nest,
        rejectedBoards,
        kerf,
        boardMetaByTag,
        thresholds,
        preferOffcutWeight
      );
      if (placementsOverlap(res.plan) || placementsOutOfBounds(res.plan)) continue;
      if (!best || compareCuttingPlans(res.scored, best.scored, mode) > 0) {
        best = res;
      }
    }
  }
  return best;
}

/**
 * Build a cutting plan across all 4 user-selectable strategies (§4–§8).
 * Evaluates alternatives and explains when another strategy is materially better.
 */
export function createCuttingPlan(
  boards: EngineBoard[],
  parts: EnginePart[],
  options: PlanOptions = {}
): CuttingPlan {
  const kerf = options.kerfMm ?? DEFAULT_KERF_MM;
  const endTrim = options.endTrimMm ?? DEFAULT_END_TRIM_MM;
  const requestedStrategy: CuttingStrategy = options.strategy ?? 'auto';
  const thresholds: OffcutThreshold = options.offcutThresholds ?? {
    minLength: MIN_USEFUL_OFFCUT_MM,
    minWidth: MIN_USEFUL_OFFCUT_MM,
  };
  const pieces = expandParts(parts);

  const activeBoards = boards.filter((b) => b.status !== 'consumed');
  const rejectedBoards: CuttingPlan['rejectedBoards'] = [];

  for (const board of activeBoards) {
    const reason = boardRejectReason(board, pieces, endTrim);
    if (reason) rejectedBoards.push({ board, reason });
  }

  const candidates = activeBoards.filter((b) => !boardRejectReason(b, pieces, endTrim));

  if (pieces.length === 0 || candidates.length === 0) {
    return {
      placements: [],
      unallocated: pieces,
      rejectedBoards,
      usedBoardTags: [],
      score: pieces.length === 0 ? 0 : -pieces.length * 100_000,
      strategy: 'none',
      selectedStrategy: requestedStrategy,
      effectiveStrategy: 'crosscut-first',
      explanation:
        pieces.length === 0
          ? 'Add parts to generate a cutting plan.'
          : 'No suitable boards in stock match species, thickness, and size.',
      offcuts: [],
    };
  }

  const boardMetaByTag: Record<string, { area: number; isOffcut: boolean }> = {};
  for (const b of candidates) {
    boardMetaByTag[b.tagId || b.id] = {
      area: b.length * b.width,
      isOffcut: isBoardOffcutLike(b),
    };
  }

  // Evaluate concrete modes so we can compare and recommend alternatives
  const concreteModes: Array<Exclude<CuttingStrategy, 'auto'>> = [
    'crosscut-first',
    'rip-first',
    'preserve-offcut',
  ];
  const byMode = new Map<
    Exclude<CuttingStrategy, 'auto'>,
    { plan: CuttingPlan; scored: PlanScoreBreakdown }
  >();

  for (const m of concreteModes) {
    const found = bestPlanForMode(
      m,
      candidates,
      pieces,
      rejectedBoards,
      kerf,
      endTrim,
      boardMetaByTag,
      thresholds
    );
    if (found) byMode.set(m, found);
  }

  // Also run unrestricted auto search (lets each strip/column pick its own natural mode)
  const autoPolicies: PackPolicy[] = [
    'blank-columns',
    'balanced',
    'full-width-first',
    'dense-strip',
    'preserve-offcut',
  ];
  const autoOrders: BoardOrder[] = ['offcuts-first', 'small-first', 'large-first'];
  let bestAuto: { plan: CuttingPlan; scored: PlanScoreBreakdown } | null = null;

  for (const policy of autoPolicies) {
    for (const boardOrder of autoOrders) {
      const nest = nestAcrossBoards(candidates, pieces, kerf, endTrim, policy, boardOrder);
      const res = finalizePlan(nest, rejectedBoards, kerf, boardMetaByTag, thresholds, 1);
      if (placementsOverlap(res.plan) || placementsOutOfBounds(res.plan)) continue;
      if (!bestAuto || compareCuttingPlans(res.scored, bestAuto.scored, 'auto') > 0) {
        bestAuto = res;
      }
    }
  }

  // Also compare concrete modes under lexicographic comparison so auto never misses a better one
  let overallBest = bestAuto;
  let overallBestMode: Exclude<CuttingStrategy, 'auto'> = bestAuto
    ? inferEffectiveStrategy(bestAuto.plan)
    : 'crosscut-first';

  for (const [m, entry] of Array.from(byMode.entries())) {
    const stdScore = scoreCuttingPlan(entry.plan, entry.plan.strategy, boardMetaByTag, thresholds, 1);
    if (!overallBest || compareCuttingPlans(stdScore, overallBest.scored, 'auto') > 0) {
      overallBest = { plan: entry.plan, scored: stdScore };
      overallBestMode = m;
    }
  }

  const chosenEntry =
    requestedStrategy === 'auto' ? overallBest : byMode.get(requestedStrategy) || overallBest;

  if (!chosenEntry) {
    return {
      placements: [],
      unallocated: pieces,
      rejectedBoards,
      usedBoardTags: [],
      score: -pieces.length * 100_000,
      strategy: 'failed',
      selectedStrategy: requestedStrategy,
    };
  }

  const chosenPlan = chosenEntry.plan;
  const chosenStdScore = scoreCuttingPlan(
    chosenPlan,
    chosenPlan.strategy,
    boardMetaByTag,
    thresholds,
    1
  );
  const effective: Exclude<CuttingStrategy, 'auto'> =
    requestedStrategy === 'auto' ? overallBestMode : requestedStrategy;

  chosenPlan.selectedStrategy = requestedStrategy;
  chosenPlan.effectiveStrategy = effective;
  chosenPlan.explanation = buildPlainExplanation(
    chosenPlan,
    requestedStrategy,
    effective,
    chosenStdScore
  );

  // §4: If user selected a fixed strategy but another is materially better, surface it
  if (requestedStrategy !== 'auto' && overallBest) {
    const bestPlan = overallBest.plan;
    const bestScore = overallBest.scored;
    const moreParts = bestScore.partsPlaced > chosenStdScore.partsPlaced;
    const fewerBoards = bestScore.freshBoardsUsed < chosenStdScore.freshBoardsUsed;
    const preservesFullWidthBoard =
      bestScore.continuousFullWidthArea > chosenStdScore.continuousFullWidthArea + 8_000 &&
      bestScore.longestOffcutLen >= MIN_USEFUL_OFFCUT_MM;
    const muchLongerOffcut =
      bestScore.longestOffcutLen * bestScore.longestOffcutWid >
      chosenStdScore.longestOffcutLen * chosenStdScore.longestOffcutWid * 1.1 + 5_000;
    const fewerOpsSameOffcut =
      bestScore.totalOps < chosenStdScore.totalOps &&
      bestScore.continuousFullWidthArea >= chosenStdScore.continuousFullWidthArea - 2_000;

    if (
      compareCuttingPlans(bestScore, chosenStdScore, 'auto') > 0 &&
      (moreParts ||
        fewerBoards ||
        preservesFullWidthBoard ||
        muchLongerOffcut ||
        fewerOpsSameOffcut)
    ) {
      const reasons: string[] = [];
      if (moreParts) {
        reasons.push(`fits ${bestScore.partsPlaced} parts vs ${chosenStdScore.partsPlaced}`);
      }
      if (fewerBoards) {
        reasons.push(
          `uses ${bestScore.freshBoardsUsed} fresh board(s) instead of ${chosenStdScore.freshBoardsUsed}`
        );
      }
      if (preservesFullWidthBoard || muchLongerOffcut) {
        reasons.push(
          `preserves a full-width ${Math.round(bestScore.longestOffcutLen)}×${Math.round(bestScore.longestOffcutWid)}mm continuous offcut instead of ripping the full board`
        );
      }
      if (fewerOpsSameOffcut) {
        reasons.push(`needs ${bestScore.totalOps} shop steps instead of ${chosenStdScore.totalOps}`);
      }
      const altMode = inferEffectiveStrategy(bestPlan);
      chosenPlan.betterAlternative = {
        strategy: altMode,
        label: STRATEGY_META[altMode].short,
        reason: `${STRATEGY_META[altMode].short} ${reasons.join(' and ')}.`,
        plan: {
          ...bestPlan,
          selectedStrategy: altMode,
          effectiveStrategy: altMode,
          explanation: buildPlainExplanation(bestPlan, altMode, altMode, bestScore),
        },
      };
    }
  }

  return chosenPlan;
}

export function placementsOverlap(plan: CuttingPlan): boolean {
  const byBoard = new Map<string, Placement[]>();
  for (const p of plan.placements) {
    if (!isFinishedPlacement(p)) continue;
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
    if (p.opKind === 'rip' || p.opKind === 'blank') {
      return p.cutWid > p.stockWid + 1e-6 || p.cutLen > p.stockLen + 1e-6;
    }
    return (
      p.posX < -1e-6 ||
      p.posY < -1e-6 ||
      p.posX + p.cutLen > p.stockLen + 1e-6 ||
      p.posY + p.cutWid > p.stockWid + 1e-6
    );
  });
}
