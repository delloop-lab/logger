import { describe, expect, it } from 'vitest';
import {
  boardRejectReason,
  createCuttingPlan,
  expandParts,
  placementsOutOfBounds,
  placementsOverlap,
  speciesMatches,
  type EngineBoard,
  type EnginePart,
} from './cutting-engine';

const JEWEL_LIKE_PARTS: EnginePart[] = [
  { id: 'a', name: 'Sides L&R', species: 'Pine', length: 250, width: 200, thickness: 18, quantity: 2 },
  { id: 'b', name: 'Sides F&B', species: 'Pine', length: 300, width: 200, thickness: 18, quantity: 2 },
  { id: 'c', name: 'Top & Bottom', species: 'Pine', length: 300, width: 250, thickness: 18, quantity: 2 },
];

const PIN_439: EngineBoard = {
  id: 'b-439',
  tagId: 'PIN-439',
  species: 'Pine',
  source: 'Salvaged',
  length: 1200,
  width: 600,
  thickness: 18,
  status: 'active',
};

const NARROW_PINE: EngineBoard = {
  id: 'b-narrow',
  tagId: 'PIN-010',
  species: 'Pine / Pallet',
  source: 'Pallet',
  length: 450,
  width: 75,
  thickness: 18,
  status: 'active',
};

const WALNUT: EngineBoard = {
  id: 'b-wal',
  tagId: 'WAL-007',
  species: 'Walnut',
  source: 'Salvaged',
  length: 600,
  width: 100,
  thickness: 20,
  status: 'active',
};

describe('speciesMatches', () => {
  it('matches pine aliases and ignores source semantics', () => {
    expect(speciesMatches('Pine', 'Pine / Pallet')).toBe(true);
    expect(speciesMatches('Pine / Pallet', 'Pine')).toBe(true);
    expect(speciesMatches('Walnut', 'Pine')).toBe(false);
  });
});

describe('board rejection', () => {
  it('rejects boards that are too short', () => {
    const short: EngineBoard = { ...NARROW_PINE, length: 100, width: 400, tagId: 'SHORT' };
    expect(boardRejectReason(short, expandParts(JEWEL_LIKE_PARTS))).toMatch(/short|narrow/i);
  });

  it('rejects boards that are too narrow', () => {
    expect(boardRejectReason(NARROW_PINE, expandParts(JEWEL_LIKE_PARTS))).toMatch(/short|narrow/i);
  });

  it('rejects boards that are too thin', () => {
    const thin: EngineBoard = { ...PIN_439, thickness: 12, tagId: 'THIN' };
    expect(boardRejectReason(thin, expandParts(JEWEL_LIKE_PARTS))).toMatch(/thin/i);
  });

  it('rejects wrong species', () => {
    expect(boardRejectReason(WALNUT, expandParts(JEWEL_LIKE_PARTS))).toMatch(/species/i);
  });

  it('accepts salvaged source when species is correct', () => {
    expect(boardRejectReason(PIN_439, expandParts(JEWEL_LIKE_PARTS))).toBeNull();
  });
});

describe('createCuttingPlan — PIN-439 regression', () => {
  it('nests all six pieces on PIN-439 and rejects narrow pine + walnut', () => {
    const plan = createCuttingPlan([NARROW_PINE, WALNUT, PIN_439], JEWEL_LIKE_PARTS);

    expect(plan.placements).toHaveLength(6);
    expect(plan.unallocated).toHaveLength(0);
    expect(plan.usedBoardTags).toEqual(['PIN-439']);
    expect(plan.rejectedBoards.map((r) => r.board.tagId).sort()).toEqual(['PIN-010', 'WAL-007']);
    expect(placementsOverlap(plan)).toBe(false);
    expect(placementsOutOfBounds(plan)).toBe(false);
  });

  it('rotates pieces when needed', () => {
    const board: EngineBoard = {
      id: 'rot',
      tagId: 'ROT-1',
      species: 'Pine',
      length: 220,
      width: 260,
      thickness: 18,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'p', name: 'Panel', species: 'Pine', length: 250, width: 200, thickness: 18, quantity: 1 },
    ];
    const plan = createCuttingPlan([board], parts);
    expect(plan.placements).toHaveLength(1);
    expect(plan.placements[0].rotated).toBe(true);
  });

  it('allocates across multiple boards when one is insufficient', () => {
    const b1: EngineBoard = {
      id: '1',
      tagId: 'P1',
      species: 'Pine',
      length: 320,
      width: 260,
      thickness: 18,
      status: 'active',
    };
    const b2: EngineBoard = {
      id: '2',
      tagId: 'P2',
      species: 'Pine',
      length: 320,
      width: 260,
      thickness: 18,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'p', name: 'Panel', species: 'Pine', length: 300, width: 250, thickness: 18, quantity: 2 },
    ];
    const plan = createCuttingPlan([b1, b2], parts);
    expect(plan.placements).toHaveLength(2);
    expect(plan.usedBoardTags.sort()).toEqual(['P1', 'P2']);
    expect(plan.unallocated).toHaveLength(0);
  });

  it('applies kerf so pieces do not share the same edge without gap', () => {
    const board: EngineBoard = {
      id: 'k',
      tagId: 'KERF',
      species: 'Pine',
      length: 610,
      width: 210,
      thickness: 18,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'p', name: 'Strip', species: 'Pine', length: 300, width: 200, thickness: 18, quantity: 2 },
    ];
    const plan = createCuttingPlan([board], parts, { kerfMm: 3.2 });
    expect(plan.placements).toHaveLength(2);
    const sorted = [...plan.placements].sort((a, b) => a.posX - b.posX);
    const gap = sorted[1].posX - (sorted[0].posX + sorted[0].cutLen);
    expect(gap).toBeGreaterThanOrEqual(3.2 - 1e-6);
  });

  it('respects end trimming', () => {
    const board: EngineBoard = {
      id: 't',
      tagId: 'TRIM',
      species: 'Pine',
      length: 320,
      width: 220,
      thickness: 18,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'p', name: 'Panel', species: 'Pine', length: 300, width: 200, thickness: 18, quantity: 1 },
    ];
    const noTrim = createCuttingPlan([board], parts, { endTrimMm: 0 });
    const trimmed = createCuttingPlan([board], parts, { endTrimMm: 15 });
    expect(noTrim.placements).toHaveLength(1);
    expect(trimmed.placements).toHaveLength(0);
    expect(trimmed.unallocated).toHaveLength(1);
  });

  it('returns unallocated parts when no stock fits', () => {
    const plan = createCuttingPlan([NARROW_PINE, WALNUT], JEWEL_LIKE_PARTS);
    expect(plan.placements).toHaveLength(0);
    expect(plan.unallocated).toHaveLength(6);
  });

  it('recalculates when cut list changes', () => {
    const one = createCuttingPlan([PIN_439], [
      { id: 'a', name: 'A', species: 'Pine', length: 300, width: 250, thickness: 18, quantity: 1 },
    ]);
    const two = createCuttingPlan([PIN_439], JEWEL_LIKE_PARTS);
    expect(one.placements).toHaveLength(1);
    expect(two.placements).toHaveLength(6);
  });

  it('handles empty inventory', () => {
    const plan = createCuttingPlan([], JEWEL_LIKE_PARTS);
    expect(plan.placements).toHaveLength(0);
    expect(plan.unallocated).toHaveLength(6);
  });

  it('keeps walnut parts on walnut stock when mixed project', () => {
    const parts: EnginePart[] = [
      { id: 'pine', name: 'Panel', species: 'Pine', length: 300, width: 250, thickness: 18, quantity: 1 },
      { id: 'wal', name: 'Rail', species: 'Walnut', length: 500, width: 80, thickness: 20, quantity: 1 },
    ];
    const plan = createCuttingPlan([PIN_439, WALNUT], parts);
    expect(plan.unallocated).toHaveLength(0);
    expect(plan.placements.find((p) => p.partName.includes('Panel'))?.boardTag).toBe('PIN-439');
    expect(plan.placements.find((p) => p.partName.includes('Rail'))?.boardTag).toBe('WAL-007');
  });
});
