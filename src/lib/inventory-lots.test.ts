import { describe, expect, it } from 'vitest';
import type { Board } from '@/lib/store';
import { expandLotsToStock, resolveUnitsIssued } from '@/lib/inventory-lots';

const lot = (over: Partial<Board> = {}): Board => ({
  id: 'lot-1',
  tagId: 'PIN-001',
  species: 'Pine / Pallet',
  source: 'Pallet',
  length: 2000,
  width: 85,
  thickness: 16,
  quantity: 9,
  location: 'Against Wall',
  createdAt: new Date().toISOString(),
  status: 'active',
  ...over,
});

describe('expandLotsToStock stable unit tags', () => {
  it('numbers fresh multi-qty lots from 1', () => {
    const tags = expandLotsToStock([lot()]).map((s) => s.tagId);
    expect(tags[0]).toBe('PIN-001-1');
    expect(tags[1]).toBe('PIN-001-2');
    expect(tags).toHaveLength(9);
  });

  it('does not reuse PIN-001-1 after Simple Test already cut that unit', () => {
    const boards: Board[] = [
      lot({ quantity: 8, unitsIssued: 0 }),
      {
        id: 'part-1',
        tagId: 'PIN-001-1-OP3-PART',
        species: 'Pine / Pallet',
        source: 'Pallet',
        length: 200,
        width: 20,
        thickness: 16,
        quantity: 1,
        location: 'Against Wall',
        createdAt: new Date().toISOString(),
        status: 'active',
        classification: 'finished_piece',
        originProject: 'Simple Test',
      },
      {
        id: 'aside-1',
        tagId: 'PIN-001-1-OP1-ASIDE',
        species: 'Pine / Pallet',
        source: 'Pallet',
        length: 1796.8,
        width: 85,
        thickness: 16,
        quantity: 1,
        location: 'Against Wall',
        createdAt: new Date().toISOString(),
        status: 'active',
        classification: 'reusable_offcut',
        originProject: 'Simple Test',
      },
    ];

    expect(resolveUnitsIssued(boards[0], boards)).toBe(1);

    const tags = expandLotsToStock(boards).map((s) => s.tagId);
    expect(tags[0]).toBe('PIN-001-2');
    expect(tags).not.toContain('PIN-001-1');
    expect(tags).toHaveLength(8);
  });

  it('respects stored unitsIssued even without child tags', () => {
    const tags = expandLotsToStock([lot({ quantity: 7, unitsIssued: 2 })]).map((s) => s.tagId);
    expect(tags[0]).toBe('PIN-001-3');
    expect(tags).toHaveLength(7);
  });
});
