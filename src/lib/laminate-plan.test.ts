import { describe, expect, it, beforeEach } from 'vitest';
import { useAppStore, type Board, type PlanLamination } from '@/lib/store';
import { isNestableStock } from '@/lib/inventory-lots';

function board(partial: Partial<Board> & Pick<Board, 'id' | 'tagId'>): Board {
  return {
    species: 'Mahogany',
    source: 'New',
    length: 450,
    width: 100,
    thickness: 20,
    quantity: 1,
    location: 'Rack A',
    createdAt: new Date().toISOString(),
    status: 'active',
    ...partial,
  };
}

describe('laminate allocation + consume', () => {
  beforeEach(() => {
    useAppStore.setState({
      boards: [
        board({ id: 'a', tagId: 'MAH-004', thickness: 20 }),
        board({ id: 'b', tagId: 'MAH-005', thickness: 15 }),
        board({ id: 'c', tagId: 'MAH-006', thickness: 30 }),
      ],
      completedOperations: [],
      cutHistory: [],
      activeProjectName: 'DESKTOP BOX',
      activeCuttingPlan: null,
      cloudRevision: 0,
    });
  });

  it('allocates laminate layers and excludes them from nestable stock', () => {
    const store = useAppStore.getState();
    store.allocateStockByTags(['MAH-004', 'MAH-005']);
    const boards = useAppStore.getState().boards;
    expect(boards.find((b) => b.tagId === 'MAH-004')?.status).toBe('allocated');
    expect(boards.find((b) => b.tagId === 'MAH-005')?.status).toBe('allocated');
    expect(boards.find((b) => b.tagId === 'MAH-006')?.status).toBe('active');
    expect(isNestableStock(boards.find((b) => b.tagId === 'MAH-004')!)).toBe(false);
    expect(isNestableStock(boards.find((b) => b.tagId === 'MAH-006')!)).toBe(true);
  });

  it('releases allocated laminate layers when clearing the plan', () => {
    const lam: PlanLamination = {
      partId: 'top',
      partName: 'Top',
      boardIds: ['a', 'b'],
      boardTags: ['MAH-004', 'MAH-005'],
      totalThickness: 35,
      targetThickness: 30,
      label: 'Combine MAH-004 + MAH-005',
    };
    useAppStore.setState({
      activeCuttingPlan: {
        savedAt: new Date().toISOString(),
        partsFingerprint: 'x',
        kerfMm: 3.2,
        usedBoardTags: ['MAH-004', 'MAH-005'],
        placements: [],
        laminations: [lam],
      },
    });
    useAppStore.getState().allocateStockByTags(['MAH-004', 'MAH-005']);
    useAppStore.getState().clearActiveCuttingPlan();
    const boards = useAppStore.getState().boards;
    expect(boards.find((b) => b.tagId === 'MAH-004')?.status).toBe('active');
    expect(boards.find((b) => b.tagId === 'MAH-005')?.status).toBe('active');
    expect(useAppStore.getState().activeCuttingPlan).toBeNull();
  });

  it('consumes primary + secondary laminate layers on cut confirm', () => {
    useAppStore.getState().allocateStockByTags(['MAH-004', 'MAH-005']);
    useAppStore.getState().processCuttingOperation(
      'DESKTOP BOX-1-MAH-004',
      [
        board({
          id: 'part-1',
          tagId: 'MAH-004-OP1-PART',
          thickness: 30,
          classification: 'finished_piece',
          status: 'active',
        }),
      ],
      {
        takeFromLotTag: 'MAH-004',
        takeFromLotTags: ['MAH-005'],
      }
    );
    const boards = useAppStore.getState().boards;
    expect(boards.find((b) => b.tagId === 'MAH-004')?.status).toBe('consumed');
    expect(boards.find((b) => b.tagId === 'MAH-005')?.status).toBe('consumed');
    expect(boards.find((b) => b.tagId === 'MAH-004-OP1-PART')?.thickness).toBe(30);
    expect(useAppStore.getState().completedOperations).toContain('DESKTOP BOX-1-MAH-004');
  });
});
