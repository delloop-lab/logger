import Dexie, { Table } from 'dexie';
import { Board, ProjectTemplate, Alert } from '@/types';

export class TimberVaultDB extends Dexie {
  boards!: Table<Board, string>;
  projectTemplates!: Table<ProjectTemplate, string>;
  alerts!: Table<Alert, string>;

  constructor() {
    super('TimberVaultDB');
    this.version(1).stores({
      boards: 'id, tagId, species, source, location, acquiredDate',
      projectTemplates: 'id, name, difficulty',
      alerts: 'id, type, resolved, createdAt'
    });
  }
}

export const db = new TimberVaultDB();

export async function initializeDB() {
  const count = await db.projectTemplates.count();
  if (count === 0) {
    await db.projectTemplates.bulkAdd([
      {
        id: 'p1',
        name: 'End-Grain Cutting Board',
        description: 'Classic butcher block cutting board utilizing mixed hardwood scraps.',
        requiredSpecies: ['European Oak', 'Walnut', 'Mahogany'],
        minDimensions: { length: 300, width: 50, thickness: 30 },
        difficulty: 'Intermediate'
      },
      {
        id: 'p2',
        name: 'Minimalist Coaster Set',
        description: 'Set of 4 square coasters with chamfered edges.',
        requiredSpecies: ['European Oak', 'Walnut'],
        minDimensions: { length: 100, width: 100, thickness: 12 },
        difficulty: 'Beginner'
      },
      {
        id: 'p3',
        name: 'Shop Mallet',
        description: 'Heavy-duty workshop mallet from laminated offcuts.',
        requiredSpecies: ['European Oak', 'Pine/Pallet'],
        minDimensions: { length: 200, width: 60, thickness: 40 },
        difficulty: 'Beginner'
      }
    ]);
  }
}

export async function generateTagId(species: string, source: string): Promise<string> {
  const prefix = species.substring(0, 3).toUpperCase();
  const count = await db.boards.count();
  const num = (count + 1).toString().padStart(3, '0');
  return `${prefix}-${num}`;
}
