import { describe, expect, it } from 'vitest';
import {
  boardRejectReason,
  chooseShopMode,
  classifyOffcut,
  compareCuttingPlans,
  createCuttingPlan,
  diagnoseUnallocated,
  expandParts,
  isFinishedPlacement,
  preferBlankFirst,
  placementsOutOfBounds,
  placementsOverlap,
  scoreCuttingPlan,
  speciesMatches,
  summarizePlanOffcuts,
  type EngineBoard,
  type EnginePart,
} from './cutting-engine';
import { createLegacyCuttingPlan } from './cutting-engine.legacy';

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

function finished(plan: ReturnType<typeof createCuttingPlan>) {
  return plan.placements.filter((p) => isFinishedPlacement(p));
}

function ops(plan: ReturnType<typeof createCuttingPlan>) {
  return plan.placements.map((p) => `${p.opKind}:${Math.round(p.cutLen)}x${Math.round(p.cutWid)}`);
}

describe('speciesMatches', () => {
  it('matches pine aliases, wildcard Any wood, and ignores source semantics', () => {
    expect(speciesMatches('Pine', 'Pine / Pallet')).toBe(true);
    expect(speciesMatches('Pine / Pallet', 'Pine')).toBe(true);
    expect(speciesMatches('Any wood', 'Walnut')).toBe(true);
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

describe('chooseShopMode & offcut classification', () => {
  it('uses crosscut-only when strip fills board width', () => {
    expect(chooseShopMode(2000, 200, 200, 403.2, 2, 3.2)).toBe('crosscut-only');
  });

  it('prefers blank-rip when a short narrow strip leaves a long continuous board', () => {
    expect(chooseShopMode(2000, 85, 20, 403.2, 2, 3.2)).toBe('blank-rip-crosscut');
  });

  it('prefers full-length rip when the strip run fills most of the board', () => {
    expect(preferBlankFirst(2000, 1800, 3.2)).toBe(false);
    expect(chooseShopMode(2000, 85, 50, 1800, 6, 3.2)).toBe('full-rip-crosscut');
  });

  it('classifies offcuts into reusable, potentially_reusable, and scrap (§7)', () => {
    const t = { minLength: 100, minWidth: 100 };
    expect(classifyOffcut(1500, 200, t)).toBe('reusable');
    expect(classifyOffcut(80, 60, t)).toBe('potentially_reusable');
    expect(classifyOffcut(1800, 12, t)).toBe('scrap'); // skinny strip waste
  });
});

describe('createCuttingPlan — PIN-439 & core regressions', () => {
  it('1. nests all six pieces on PIN-439 and rejects narrow pine + walnut', () => {
    const plan = createCuttingPlan([NARROW_PINE, WALNUT, PIN_439], JEWEL_LIKE_PARTS);
    const parts = finished(plan);

    expect(parts).toHaveLength(6);
    expect(plan.unallocated).toHaveLength(0);
    expect(plan.usedBoardTags).toEqual(['PIN-439']);
    expect(plan.rejectedBoards.map((r) => r.board.tagId).sort()).toEqual(['PIN-010', 'WAL-007']);
    expect(placementsOverlap(plan)).toBe(false);
    expect(placementsOutOfBounds(plan)).toBe(false);
    expect(plan.placements.some((p) => p.opKind === 'rip')).toBe(true);
  });

  it('2. rotates pieces when needed', () => {
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
    const cuts = finished(plan);
    expect(cuts).toHaveLength(1);
    expect(cuts[0].rotated).toBe(true);
  });

  it('3. respects constrainGrain (no rotation when grain locked)', () => {
    const board: EngineBoard = {
      id: 'rot',
      tagId: 'GRAIN-1',
      species: 'Pine',
      length: 220,
      width: 260,
      thickness: 18,
      status: 'active',
    };
    const parts: EnginePart[] = [
      {
        id: 'p',
        name: 'Grain Locked Panel',
        species: 'Pine',
        length: 250,
        width: 200,
        thickness: 18,
        quantity: 1,
        constrainGrain: true,
      },
    ];
    const plan = createCuttingPlan([board], parts);
    expect(finished(plan)).toHaveLength(0);
    expect(plan.unallocated).toHaveLength(1);
  });

  it('4. allocates across multiple boards when one is insufficient', () => {
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
    expect(finished(plan)).toHaveLength(2);
    expect(plan.usedBoardTags.sort()).toEqual(['P1', 'P2']);
    expect(plan.unallocated).toHaveLength(0);
  });

  it('5. applies kerf so pieces do not share the same edge without gap', () => {
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
    const cuts = finished(plan);
    expect(cuts).toHaveLength(2);
    const sorted = [...cuts].sort((a, b) => a.posX - b.posX);
    const gap = sorted[1].posX - (sorted[0].posX + sorted[0].cutLen);
    expect(gap).toBeGreaterThanOrEqual(3.2 - 1e-6);
  });

  it('6. rips long edge once then crosscuts equal strip parts when board is mostly filled', () => {
    const board: EngineBoard = {
      id: 'strip',
      tagId: 'PIN-131-1',
      species: 'Pine / Pallet',
      length: 2000,
      width: 85,
      thickness: 12,
      status: 'active',
    };
    const parts: EnginePart[] = [
      {
        id: 'p',
        name: 'Cutting Board Top',
        species: 'Pine / Pallet',
        length: 300,
        width: 50,
        thickness: 12,
        quantity: 6,
      },
    ];
    const plan = createCuttingPlan([board], parts, { kerfMm: 3.2 });
    expect(plan.placements.some((p) => p.opKind === 'rip')).toBe(true);
    expect(plan.placements.some((p) => p.opKind === 'blank')).toBe(false);
    const rip = plan.placements.find((p) => p.opKind === 'rip')!;
    expect(rip.cutWid).toBe(50);
    expect(rip.cutLen).toBe(2000);
    expect(finished(plan)).toHaveLength(6);
    expect(placementsOverlap(plan)).toBe(false);
  });

  it('7. blank-first: first cut is one part length off the board — never a full-length rip', () => {
    const board: EngineBoard = {
      id: 'b',
      tagId: 'PIN-001-1',
      species: 'Pine / Pallet',
      length: 2000,
      width: 85,
      thickness: 12,
      status: 'active',
    };
    const parts: EnginePart[] = [
      {
        id: 'p',
        name: 'Top Pieces',
        species: 'Pine / Pallet',
        length: 200,
        width: 20,
        thickness: 12,
        quantity: 2,
      },
    ];
    const plan = createCuttingPlan([board], parts, { kerfMm: 3.2 });
    expect(plan.unallocated).toHaveLength(0);

    expect(plan.placements[0].opKind).toBe('blank');
    const blank = plan.placements[0];
    expect(blank.cutLen).toBe(200);
    expect(blank.cutWid).toBe(85);
    expect(blank.stockLen).toBe(2000);
    expect(blank.remLen).toBeCloseTo(1796.8, 5);

    const rip = plan.placements.find((p) => p.opKind === 'rip')!;
    expect(rip.cutLen).toBe(200);
    expect(rip.cutWid).toBe(20);
    expect(rip.stockLen).toBe(200);
    expect(rip.edgeWid).toBeCloseTo(61.8, 5);

    const cuts = finished(plan);
    expect(cuts).toHaveLength(2);
    expect(cuts.every((p) => p.cutLen === 200 && p.cutWid === 20)).toBe(true);
    expect(plan.placements.filter((p) => p.opKind === 'rip').every((p) => p.cutLen < 500)).toBe(true);
    expect(placementsOverlap(plan)).toBe(false);
    expect(placementsOutOfBounds(plan)).toBe(false);
  });

  it('8. respects end trimming', () => {
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
    expect(finished(noTrim)).toHaveLength(1);
    expect(trimmed.placements).toHaveLength(0);
    expect(trimmed.unallocated).toHaveLength(1);
  });

  it('9. returns unallocated parts when no stock fits', () => {
    const plan = createCuttingPlan([NARROW_PINE, WALNUT], JEWEL_LIKE_PARTS);
    expect(plan.placements).toHaveLength(0);
    expect(plan.unallocated).toHaveLength(6);
  });

  it('9b. diagnoses plywood part when only pine stock exists', () => {
    const reason = diagnoseUnallocated(
      {
        id: 'top-1',
        name: 'Top (1/1)',
        species: 'Plywood',
        length: 800,
        width: 500,
        thickness: 18,
      },
      [NARROW_PINE]
    );
    expect(reason.toLowerCase()).toContain('plywood');
    expect(reason.toLowerCase()).toMatch(/no plywood|too small/);
  });

  it('10. recalculates when cut list changes', () => {
    const one = createCuttingPlan([PIN_439], [
      { id: 'a', name: 'A', species: 'Pine', length: 300, width: 250, thickness: 18, quantity: 1 },
    ]);
    const two = createCuttingPlan([PIN_439], JEWEL_LIKE_PARTS);
    expect(finished(one)).toHaveLength(1);
    expect(finished(two)).toHaveLength(6);
  });

  it('11. packs shared widths into strip channels (clean rectangular remnants)', () => {
    const board: EngineBoard = {
      id: 'box',
      tagId: 'PLY-434',
      species: 'Plywood',
      length: 1200,
      width: 600,
      thickness: 16,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'a', name: 'Sides F&B', species: 'Plywood', length: 300, width: 200, thickness: 16, quantity: 2 },
      { id: 'b', name: 'Top & Bottom', species: 'Plywood', length: 300, width: 250, thickness: 16, quantity: 2 },
    ];
    const plan = createCuttingPlan([board], parts, { kerfMm: 3.2 });
    const cuts = finished(plan);
    expect(cuts).toHaveLength(4);
    expect(placementsOverlap(plan)).toBe(false);
    const byWid = new Map<number, number[]>();
    for (const c of cuts) {
      const ys = byWid.get(c.cutWid) || [];
      ys.push(c.posY);
      byWid.set(c.cutWid, ys);
    }
    for (const ys of Array.from(byWid.values())) {
      const uniq = new Set(ys.map((y) => Math.round(y * 10) / 10));
      expect(uniq.size).toBe(1);
    }
  });

  it('12. handles empty inventory', () => {
    const plan = createCuttingPlan([], JEWEL_LIKE_PARTS);
    expect(plan.placements).toHaveLength(0);
    expect(plan.unallocated).toHaveLength(6);
  });

  it('13. keeps walnut parts on walnut stock when mixed project', () => {
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

describe('Master Spec §6–§12: intelligent shop sequences & A/B vs legacy', () => {
  it('14. SPEC §6 REGRESSION: 2000×200 board + 2× 200×200 → two direct crosscuts, ~1593.6×200 continuous offcut', () => {
    const board: EngineBoard = {
      id: 'b',
      tagId: 'LONG-1',
      species: 'Pine',
      length: 2000,
      width: 200,
      thickness: 18,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'p', name: 'Rail', species: 'Pine', length: 200, width: 200, thickness: 18, quantity: 2 },
    ];
    const plan = createCuttingPlan([board], parts, { kerfMm: 3.2 });

    expect(finished(plan)).toHaveLength(2);
    expect(plan.placements.some((p) => p.opKind === 'blank')).toBe(false);
    expect(plan.placements.some((p) => p.opKind === 'rip')).toBe(false);
    expect(ops(plan)).toEqual(['crosscut:200x200', 'crosscut:200x200']);
    const sorted = [...finished(plan)].sort((a, b) => a.posX - b.posX);
    expect(sorted[0].posX).toBe(0);
    expect(sorted[1].posX).toBeCloseTo(200 + 3.2, 5);
    expect(sorted[1].remLen).toBeCloseTo(2000 - 400 - 6.4, 5);
  });

  it('15. A/B vs legacy: 2000×85 board + 2× 200×20 avoids legacy 403.2mm multi-part intermediate blank', () => {
    const board: EngineBoard = {
      id: 'b',
      tagId: 'PIN-001-1',
      species: 'Pine / Pallet',
      length: 2000,
      width: 85,
      thickness: 12,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'p', name: 'Top Plate', species: 'Pine / Pallet', length: 200, width: 20, thickness: 12, quantity: 2 },
    ];
    const legacy = createLegacyCuttingPlan([board], parts, { kerfMm: 3.2 });
    const improved = createCuttingPlan([board], parts, { kerfMm: 3.2 });

    // Legacy created a combined 403.2mm blank first and then split it into two 200mm parts
    expect(legacy.placements[0].opKind).toBe('blank');
    expect(legacy.placements[0].cutLen).toBeCloseTo(403.2, 5);

    // Improved cuts a 200mm blank first (exact part length — no multi-part intermediate blank)
    expect(improved.placements[0].opKind).toBe('blank');
    expect(improved.placements[0].cutLen).toBe(200);
    expect(improved.placements[0].remLen).toBeCloseTo(1796.8, 5);
  });

  it('16. A/B vs legacy: lookahead fits 5 mixed parts on 2400×310 where legacy stranded 2 parts', () => {
    const board: EngineBoard = {
      id: 'mix',
      tagId: 'MIX-1',
      species: 'Pine',
      length: 2400,
      width: 310,
      thickness: 18,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'a', name: 'A', species: 'Pine', length: 400, width: 200, thickness: 18, quantity: 2 },
      { id: 'b', name: 'B', species: 'Pine', length: 250, width: 100, thickness: 18, quantity: 3 },
    ];
    const legacy = createLegacyCuttingPlan([board], parts, { kerfMm: 3.2 });
    const improved = createCuttingPlan([board], parts, { kerfMm: 3.2 });

    expect(legacy.unallocated.length).toBe(2);
    expect(improved.unallocated).toHaveLength(0);
    expect(finished(improved)).toHaveLength(5);
    expect(placementsOverlap(improved)).toBe(false);
    expect(placementsOutOfBounds(improved)).toBe(false);
  });

  it('17. box side 180×200 qty2 on 200-wide stock: two crosscuts, no rip', () => {
    const board: EngineBoard = {
      id: 'b',
      tagId: 'STOCK',
      species: 'Pine',
      length: 2000,
      width: 200,
      thickness: 18,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'p', name: 'box side', species: 'Pine', length: 180, width: 200, thickness: 18, quantity: 2 },
    ];
    const plan = createCuttingPlan([board], parts, { kerfMm: 3.2 });
    expect(ops(plan)).toEqual(['crosscut:180x200', 'crosscut:180x200']);
  });

  it('18. prefers using a fitting offcut-sized board over a much larger sheet when both work', () => {
    const offcut: EngineBoard = {
      id: 'off',
      tagId: 'PIN-001-OP1-OFFCUT',
      species: 'Pine',
      source: 'Offcut',
      length: 420,
      width: 200,
      thickness: 18,
      status: 'active',
      isOffcut: true,
    };
    const sheet: EngineBoard = {
      id: 'sheet',
      tagId: 'SHEET-1',
      species: 'Pine',
      length: 2400,
      width: 1200,
      thickness: 18,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'p', name: 'Panel', species: 'Pine', length: 400, width: 200, thickness: 18, quantity: 1 },
    ];
    const plan = createCuttingPlan([sheet, offcut], parts, { kerfMm: 3.2 });
    expect(finished(plan)).toHaveLength(1);
    expect(plan.usedBoardTags).toEqual(['PIN-001-OP1-OFFCUT']);
  });

  it('19. kerf-sensitive: three 200mm parts need enough length for two kerfs', () => {
    const tooShort: EngineBoard = {
      id: 's',
      tagId: 'SHORT',
      species: 'Pine',
      length: 600,
      width: 200,
      thickness: 18,
      status: 'active',
    };
    const justRight: EngineBoard = {
      id: 'ok',
      tagId: 'OK',
      species: 'Pine',
      length: 610,
      width: 200,
      thickness: 18,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'p', name: 'Block', species: 'Pine', length: 200, width: 200, thickness: 18, quantity: 3 },
    ];
    expect(createCuttingPlan([tooShort], parts, { kerfMm: 3.2 }).unallocated.length).toBeGreaterThan(0);
    const ok = createCuttingPlan([justRight], parts, { kerfMm: 3.2 });
    expect(ok.unallocated).toHaveLength(0);
    expect(finished(ok)).toHaveLength(3);
  });

  it('20. strategy = rip-first forces full-length rip on narrow parts and suggests Crosscut First when better', () => {
    const board: EngineBoard = {
      id: 'b',
      tagId: 'PIN-001-1',
      species: 'Pine / Pallet',
      length: 2000,
      width: 85,
      thickness: 12,
      status: 'active',
    };
    const parts: EnginePart[] = [
      {
        id: 'p',
        name: 'Top Pieces',
        species: 'Pine / Pallet',
        length: 200,
        width: 20,
        thickness: 12,
        quantity: 2,
      },
    ];
    const ripPlan = createCuttingPlan([board], parts, {
      kerfMm: 3.2,
      strategy: 'rip-first',
    });

    expect(ripPlan.selectedStrategy).toBe('rip-first');
    expect(ripPlan.placements[0].opKind).toBe('rip');
    expect(ripPlan.placements[0].cutLen).toBe(2000);
    // Should surface Crosscut First as a better alternative that preserves the 85mm-wide board
    expect(ripPlan.betterAlternative).toBeTruthy();
    expect(ripPlan.betterAlternative?.strategy).toBe('crosscut-first');
  });

  it('21. strategy = crosscut-first cuts short blanks before ripping on narrow parts', () => {
    const board: EngineBoard = {
      id: 'n',
      tagId: 'N',
      species: 'Pine',
      length: 2000,
      width: 100,
      thickness: 18,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'p', name: 'Slat', species: 'Pine', length: 150, width: 40, thickness: 18, quantity: 2 },
    ];
    const plan = createCuttingPlan([board], parts, {
      kerfMm: 3.2,
      strategy: 'crosscut-first',
    });
    expect(plan.placements[0].opKind).toBe('blank');
    expect(plan.placements[0].cutLen).toBe(150);
    const rip = plan.placements.find((p) => p.opKind === 'rip')!;
    expect(rip.cutLen).toBe(150);
    expect(rip.stockLen).toBe(150);
    expect(finished(plan)).toHaveLength(2);
  });

  it('22. strategy = preserve-offcut keeps maximum continuous full-width board and classifies offcuts', () => {
    const board: EngineBoard = {
      id: 'b',
      tagId: 'OAK-1',
      species: 'Oak',
      length: 2400,
      width: 220,
      thickness: 22,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'p', name: 'Cleat', species: 'Oak', length: 300, width: 70, thickness: 22, quantity: 2 },
    ];
    const plan = createCuttingPlan([board], parts, {
      kerfMm: 3.2,
      strategy: 'preserve-offcut',
    });
    expect(plan.unallocated).toHaveLength(0);
    const offcuts = summarizePlanOffcuts(plan);
    const continuous = offcuts.find((o) => o.kind === 'continuous_board');
    expect(continuous).toBeTruthy();
    expect(continuous!.length).toBeGreaterThan(1700);
    expect(continuous!.width).toBe(220);
    expect(continuous!.tier).toBe('reusable');
  });

  it('23. deterministic: identical inputs always produce identical plans and scores', () => {
    const p1 = createCuttingPlan([PIN_439, WALNUT], JEWEL_LIKE_PARTS, { kerfMm: 3.2 });
    const p2 = createCuttingPlan([PIN_439, WALNUT], JEWEL_LIKE_PARTS, { kerfMm: 3.2 });
    expect(p1.score).toBe(p2.score);
    expect(ops(p1)).toEqual(ops(p2));
  });

  it('24. scores continuous full-width leftover higher than skinny rip waste', () => {
    const board: EngineBoard = {
      id: 'b',
      tagId: 'B',
      species: 'Pine',
      length: 2000,
      width: 200,
      thickness: 18,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'p', name: 'Plate', species: 'Pine', length: 200, width: 180, thickness: 18, quantity: 2 },
    ];
    const plan = createCuttingPlan([board], parts, { kerfMm: 3.2 });
    const scored = scoreCuttingPlan(plan, plan.strategy || 'test');
    expect(scored.setupOps).toBe(0);
    expect(scored.longestOffcutLen).toBeGreaterThan(1500);
    expect(scored.longestOffcutWid).toBe(200);
    expect(scored.skinnyWasteMm).toBe(0);
    expect(plan.explanation).toMatch(/direct full-width crosscut/i);
  });

  it('25. QA §4: blank-grouped 2× 200×20 on 2000×85 cuts ONE 200×85 blank and rips twice (3 real steps, zero 0mm ghost trims)', () => {
    const board: EngineBoard = {
      id: 'b',
      tagId: 'PIN-001-1',
      species: 'Pine / Pallet',
      length: 2000,
      width: 85,
      thickness: 12,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'p', name: 'Top Pieces', species: 'Pine / Pallet', length: 200, width: 20, thickness: 12, quantity: 2 },
    ];
    const plan = createCuttingPlan([board], parts, { kerfMm: 3.2 });

    // Exactly 3 physical steps: 1 blank (200x85) + 2 rips (200x20 from 200x85, then 200x20 from 200x61.8)
    expect(plan.placements).toHaveLength(3);
    expect(plan.placements[0].opKind).toBe('blank');
    expect(plan.placements[0].cutLen).toBe(200);
    expect(plan.placements[0].remLen).toBeCloseTo(1796.8, 5);

    expect(plan.placements[1].opKind).toBe('rip');
    expect(plan.placements[1].producesFinishedPart).toBe(true);
    expect(plan.placements[1].stockLen).toBe(200);
    expect(plan.placements[1].stockWid).toBe(85);
    expect(plan.placements[1].edgeWid).toBeCloseTo(61.8, 5);

    expect(plan.placements[2].opKind).toBe('rip');
    expect(plan.placements[2].producesFinishedPart).toBe(true);
    expect(plan.placements[2].stockLen).toBe(200);
    expect(plan.placements[2].stockWid).toBeCloseTo(61.8, 5);
    expect(plan.placements[2].edgeWid).toBeCloseTo(38.6, 5);

    // No impossible 0mm-remainder crosscut step exists
    expect(plan.placements.some((p) => p.opKind === 'crosscut' && p.remLen === 0)).toBe(false);
  });

  it('26. QA §1: lexicographic compareCuttingPlans guarantees completion & board conservation never lose to offcut bonuses', () => {
    const base: ReturnType<typeof scoreCuttingPlan> = {
      total: 0,
      partsPlaced: 4,
      unallocated: 0,
      setupOps: 1,
      finishedOps: 4,
      totalOps: 5,
      longestOffcutLen: 500,
      longestOffcutWid: 200,
      continuousFullWidthArea: 100_000,
      reusableOffcutArea: 100_000,
      reusableOffcutCount: 1,
      scrapCount: 0,
      skinnyWasteMm: 0,
      offcutsUsed: 0,
      freshBoardsUsed: 1,
      boardsUsed: 1,
      consumedArea: 400_000,
      unusedArea: 0,
      strategy: 'a',
    };
    const incompleteHugeOffcut = {
      ...base,
      partsPlaced: 3,
      unallocated: 1,
      continuousFullWidthArea: 5_000_000,
      total: 9_999_999,
    };
    // Tier 1: 4 parts placed strictly beats 3 parts placed regardless of offcut size or raw total
    expect(compareCuttingPlans(base, incompleteHugeOffcut)).toBeGreaterThan(0);

    // Tier 2: Using 0 fresh boards (1 existing offcut) strictly beats opening 1 fresh board
    const usesExistingOffcut = { ...base, freshBoardsUsed: 0, offcutsUsed: 1 };
    expect(compareCuttingPlans(usesExistingOffcut, base)).toBeGreaterThan(0);
  });

  it('27. QA §2: when user selects Crosscut First on a full-board strip job, recommends Rip First with fewer cuts', () => {
    const board: EngineBoard = {
      id: 'strip',
      tagId: 'PIN-131-1',
      species: 'Pine / Pallet',
      length: 2000,
      width: 85,
      thickness: 12,
      status: 'active',
    };
    const parts: EnginePart[] = [
      {
        id: 'p',
        name: 'Cutting Board Top',
        species: 'Pine / Pallet',
        length: 300,
        width: 50,
        thickness: 12,
        quantity: 6,
      },
    ];
    // 6x300 = 1816mm on 2000mm board → Crosscut First takes 12 steps (6 blanks + 6 rips),
    // so Timber Vault recommends switching to Rip First (1 rip + 6 crosscuts = 7 steps)!
    const plan = createCuttingPlan([board], parts, {
      kerfMm: 3.2,
      strategy: 'crosscut-first',
    });
    expect(finished(plan)).toHaveLength(6);
    expect(plan.placements[0].opKind).toBe('blank');
    expect(plan.betterAlternative).toBeTruthy();
    expect(plan.betterAlternative?.strategy).toBe('rip-first');
    expect(plan.betterAlternative?.plan.placements).toHaveLength(7);
    expect(plan.betterAlternative?.plan.placements[0].opKind).toBe('rip');
  });

  it('28. QA §3: offcut intelligence classifies slender slivers vs stocky blocks and preserves material attributes', () => {
    const thresholds = { minLength: 300, minWidth: 60 };
    // 1800 × 65mm is well above both thresholds and reasonable aspect ratio (~27.7) → reusable
    expect(classifyOffcut(1800, 65, thresholds)).toBe('reusable');
    // 2800 × 62mm has extreme aspect ratio (>40) and barely clears minWidth → potentially_reusable
    expect(classifyOffcut(2800, 62, thresholds)).toBe('potentially_reusable');
    // 240 × 180mm is shorter than 300mm but stocky (area 43,200 >= 18,000) → potentially_reusable
    expect(classifyOffcut(240, 180, thresholds)).toBe('potentially_reusable');
    // 1500 × 18mm is skinny rip waste (<25mm) → scrap
    expect(classifyOffcut(1500, 18, thresholds)).toBe('scrap');

    // Verify summarizePlanOffcuts preserves species, thickness, source, location, and aspectRatio
    const board: EngineBoard = {
      id: 'b1',
      tagId: 'OAK-99',
      species: 'Oak',
      source: 'Reclaimed Barn',
      location: 'Rack B2',
      length: 2000,
      width: 200,
      thickness: 24,
      status: 'active',
    };
    const plan = createCuttingPlan(
      [board],
      [{ id: 'p', name: 'Shelf', species: 'Oak', length: 500, width: 200, thickness: 24, quantity: 1 }],
      { kerfMm: 3.2, offcutThresholds: thresholds }
    );
    expect(plan.offcuts).toHaveLength(1);
    const off = plan.offcuts![0];
    expect(off.boardTag).toBe('OAK-99');
    expect(off.length).toBeCloseTo(1496.8, 1);
    expect(off.width).toBe(200);
    expect(off.thickness).toBe(24);
    expect(off.species).toBe('Oak');
    expect(off.source).toBe('Reclaimed Barn');
    expect(off.location).toBe('Rack B2');
    expect(off.tier).toBe('reusable');
    expect(off.aspectRatio).toBeCloseTo(1496.8 / 200, 1);
  });

  it('29. QA §3: reusable offcut from Job 1 can be fed into Job 2 and is prioritised over opening a new board', () => {
    const freshBoard1: EngineBoard = {
      id: 'b1',
      tagId: 'PIN-001',
      species: 'Pine',
      length: 2000,
      width: 200,
      thickness: 18,
      status: 'active',
    };
    const freshBoard2: EngineBoard = {
      id: 'b2',
      tagId: 'PIN-002',
      species: 'Pine',
      length: 2000,
      width: 200,
      thickness: 18,
      status: 'active',
    };
    // Job 1 cuts 2x 400x200 from PIN-001 → leaves 1193.6 x 200 offcut
    const job1 = createCuttingPlan(
      [freshBoard1],
      [{ id: 'j1', name: 'Side', species: 'Pine', length: 400, width: 200, thickness: 18, quantity: 2 }],
      { kerfMm: 3.2 }
    );
    const savedOffcut = job1.offcuts![0];
    expect(savedOffcut.length).toBeCloseTo(1193.6, 1);

    // Job 2 needs 1x 600x200 — inventory has PIN-002 (2000x200 fresh) and PIN-001-OP2-OFFCUT (1193.6x200)
    const offcutBoard: EngineBoard = {
      id: 'off-1',
      tagId: 'PIN-001-OP2-OFFCUT',
      species: savedOffcut.species,
      source: 'Offcut',
      length: savedOffcut.length,
      width: savedOffcut.width,
      thickness: savedOffcut.thickness,
      status: 'active',
      isOffcut: true,
    };
    const job2 = createCuttingPlan(
      [freshBoard2, offcutBoard],
      [{ id: 'j2', name: 'Shelf', species: 'Pine', length: 600, width: 200, thickness: 18, quantity: 1 }],
      { kerfMm: 3.2 }
    );
    expect(job2.usedBoardTags).toEqual(['PIN-001-OP2-OFFCUT']);
    expect(job2.offcuts![0].length).toBeCloseTo(1193.6 - 600 - 3.2, 1);
  });

  it('30. QA §5: varying kerf (1.6mm thin-kerf vs 4.8mm heavy blade) changes feasibility and offcut length accurately', () => {
    const board: EngineBoard = {
      id: 'k',
      tagId: 'KERF-TEST',
      species: 'Pine',
      length: 1005,
      width: 150,
      thickness: 18,
      status: 'active',
    };
    const parts: EnginePart[] = [
      { id: 'p', name: ' Seg', species: 'Pine', length: 250, width: 150, thickness: 18, quantity: 4 },
    ];
    // 4 × 250 = 1000mm; 3 kerfs between 4 pieces:
    // With 1.6mm kerf: 1000 + 3*1.6 = 1004.8mm <= 1005mm → all 4 fit!
    // With 4.8mm kerf: 1000 + 3*4.8 = 1014.4mm > 1005mm → only 3 fit, 1 unallocated!
    const thinKerf = createCuttingPlan([board], parts, { kerfMm: 1.6 });
    const heavyKerf = createCuttingPlan([board], parts, { kerfMm: 4.8 });

    expect(thinKerf.unallocated).toHaveLength(0);
    expect(finished(thinKerf)).toHaveLength(4);
    expect(heavyKerf.unallocated).toHaveLength(1);
    expect(finished(heavyKerf)).toHaveLength(3);
  });
});
