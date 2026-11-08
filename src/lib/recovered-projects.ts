import type { SavedProject } from '@/lib/store';

/** Fixed ids used only for Lou's emergency workshop restore (never auto-seed for other users). */
export const RECOVERED_PROJECT_ID_PREFIX = 'recover-';

export function isRecoveredSeedProjectId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.startsWith(RECOVERED_PROJECT_ID_PREFIX);
}

/**
 * Best-effort rebuild of Lou's workshop projects after a cloud wipe.
 * Names / piece counts / min dims from What Can I Build cards;
 * Drinks Tray finished sizes from shop sheets in the same session.
 * Call only from the explicit restore action (admin), never on every empty login.
 */
export function buildRecoveredWorkshopProjects(): SavedProject[] {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const drinksTray: SavedProject = {
    id: 'recover-drinks-tray',
    name: 'Drinks Tray',
    date: today,
    status: 'completed',
    difficulty: 'Beginner',
    description: 'Completed build: Drinks Tray.',
    kerfMm: 3.2,
    parts: [
      {
        id: 'dt-base',
        name: 'Base',
        species: 'Plywood',
        length: 530,
        width: 310,
        thickness: 16,
        quantity: 1,
      },
      {
        id: 'dt-short',
        name: 'Short sides',
        species: 'Pine / Pallet',
        length: 330,
        width: 100,
        thickness: 16,
        quantity: 2,
      },
      {
        id: 'dt-long',
        name: 'Long sides',
        species: 'Pine / Pallet',
        length: 500,
        width: 100,
        thickness: 16,
        quantity: 2,
      },
    ],
  };

  const cuttingBoard: SavedProject = {
    id: 'recover-cutting-board',
    name: 'Cutting Board',
    date: today,
    status: 'completed',
    difficulty: 'Beginner',
    description: 'Completed build: Cutting Board.',
    kerfMm: 3.2,
    parts: [
      {
        id: 'cb-strip',
        name: 'Board strip',
        species: 'Pine / Pallet',
        length: 350,
        width: 50,
        thickness: 16,
        quantity: 6,
      },
    ],
  };

  const cuttingBoardRebuild: SavedProject = {
    ...cuttingBoard,
    id: 'recover-cutting-board-rebuild',
    name: 'Cutting Board (rebuild)',
    description: 'Completed build: Cutting Board (rebuild).',
  };

  /** 2 pcs · Pine / Pallet, from 200×20×16 (What Can I Build card). */
  const simpleTest: SavedProject = {
    id: 'recover-simple-test',
    name: 'Simple Test',
    date: today,
    status: 'completed',
    difficulty: 'Beginner',
    description: 'Completed build: Simple Test.',
    kerfMm: 3.2,
    parts: [
      {
        id: 'st-pieces',
        name: 'Test pieces',
        species: 'Pine / Pallet',
        length: 200,
        width: 20,
        thickness: 16,
        quantity: 2,
      },
    ],
  };

  /** 3 pcs · Plywood, Pine / Pallet, from 500×25×16 (What Can I Build card). */
  const techDrawing: SavedProject = {
    id: 'recover-tech-drawing-board',
    name: 'Tech-Drawing Board',
    date: today,
    status: 'completed',
    difficulty: 'Beginner',
    description: 'Completed build: Tech-Drawing Board.',
    kerfMm: 3.2,
    parts: [
      {
        id: 'td-panel',
        name: 'Panel',
        species: 'Plywood',
        length: 500,
        width: 300,
        thickness: 16,
        quantity: 1,
      },
      {
        id: 'td-rail',
        name: 'Rail',
        species: 'Pine / Pallet',
        length: 500,
        width: 25,
        thickness: 16,
        quantity: 2,
      },
    ],
  };

  return [drinksTray, cuttingBoard, cuttingBoardRebuild, simpleTest, techDrawing];
}
