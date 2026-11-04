import type { Board, CutPart, SavedProject, WorkspaceData } from '@/lib/store';

const DEMO_KERF_MM = 3.2;

const DEMO_LOCATIONS = [
  'Workbench',
  'Rack 1',
  'Rack 2',
  'Rack 3',
  'Small Rack',
  'Under Cabinet',
  'Offcut Bin',
];

/** Sample workshop shown while signed out (never persisted to cloud). */
export function createDemoWorkspace(): WorkspaceData {
  const boards: Board[] = [
    {
      id: 'demo-board-1',
      tagId: 'PIN-101-1',
      species: 'Pine / Pallet',
      source: 'Pallet',
      length: 1200,
      width: 100,
      thickness: 18,
      quantity: 1,
      location: 'Rack 1',
      createdAt: new Date().toISOString(),
      status: 'active',
      notes: 'Demo stock',
    },
    {
      id: 'demo-board-2',
      tagId: 'PIN-102-1',
      species: 'Pine / Pallet',
      source: 'Pallet',
      length: 900,
      width: 90,
      thickness: 18,
      quantity: 1,
      location: 'Rack 1',
      createdAt: new Date().toISOString(),
      status: 'active',
    },
    {
      id: 'demo-board-3',
      tagId: 'OAK-201-1',
      species: 'European Oak',
      source: 'Purchased',
      length: 600,
      width: 120,
      thickness: 20,
      quantity: 1,
      location: 'Rack 2',
      createdAt: new Date().toISOString(),
      status: 'active',
    },
  ];

  const parts: CutPart[] = [
    {
      id: 'demo-part-1',
      name: 'Side',
      species: 'Pine / Pallet',
      length: 350,
      width: 80,
      thickness: 18,
      quantity: 2,
    },
    {
      id: 'demo-part-2',
      name: 'Top',
      species: 'Pine / Pallet',
      length: 400,
      width: 90,
      thickness: 18,
      quantity: 1,
    },
  ];

  const savedProjects: SavedProject[] = [
    {
      id: 'demo-project-1',
      name: 'Demo Box',
      date: '01 Jan 2026',
      parts,
      kerfMm: DEMO_KERF_MM,
      status: 'active',
      description: 'Sample project for the signed-out preview.',
      difficulty: 'Beginner',
    },
  ];

  return {
    boards,
    storageLocations: [...DEMO_LOCATIONS],
    savedProjects,
    activeProjectName: 'New Project',
    activeParts: [],
    completedOperations: [],
    offcutSettings: { minLength: 100, minWidth: 100 },
    unitSystem: 'metric',
    defaultKerfMm: DEMO_KERF_MM,
    activeKerfMm: DEMO_KERF_MM,
    activeStrategy: 'auto',
    activeCuttingPlan: null,
  };
}
