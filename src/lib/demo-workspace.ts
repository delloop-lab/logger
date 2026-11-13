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

function demoBoard(
  partial: Omit<Board, 'createdAt' | 'status'> &
    Partial<Pick<Board, 'createdAt' | 'status' | 'classification' | 'notes'>>
): Board {
  return {
    createdAt: new Date().toISOString(),
    status: 'active',
    ...partial,
  };
}

/** Sample workshop shown while signed out (never persisted to cloud). */
export function createDemoWorkspace(): WorkspaceData {
  // 20 full stock pieces + 23 reusable offcuts = 43 available stock
  const boards: Board[] = [
    demoBoard({
      id: 'demo-board-1',
      tagId: 'PIN-101',
      species: 'Pine / Pallet',
      source: 'Pallet',
      length: 1200,
      width: 100,
      thickness: 18,
      quantity: 8,
      location: 'Rack 1',
      notes: 'Demo stock',
    }),
    demoBoard({
      id: 'demo-board-2',
      tagId: 'PIN-102',
      species: 'Pine / Pallet',
      source: 'Pallet',
      length: 900,
      width: 90,
      thickness: 18,
      quantity: 5,
      location: 'Rack 1',
      notes: 'Demo stock',
    }),
    demoBoard({
      id: 'demo-board-3',
      tagId: 'OAK-201',
      species: 'European Oak',
      source: 'Purchased',
      length: 600,
      width: 120,
      thickness: 20,
      quantity: 4,
      location: 'Rack 2',
      notes: 'Demo stock',
    }),
    demoBoard({
      id: 'demo-board-4',
      tagId: 'PLY-301',
      species: 'Plywood',
      source: 'Purchased',
      length: 1220,
      width: 610,
      thickness: 12,
      quantity: 3,
      location: 'Rack 3',
      notes: 'Demo stock',
    }),
    // 23 reusable offcuts
    demoBoard({
      id: 'demo-offcut-1',
      tagId: 'PIN-101-OC1',
      species: 'Pine / Pallet',
      source: 'Offcut',
      length: 420,
      width: 95,
      thickness: 18,
      quantity: 6,
      location: 'Offcut Bin',
      classification: 'reusable_offcut',
      notes: 'Demo offcut',
    }),
    demoBoard({
      id: 'demo-offcut-2',
      tagId: 'PIN-102-OC1',
      species: 'Pine / Pallet',
      source: 'Offcut',
      length: 280,
      width: 85,
      thickness: 18,
      quantity: 5,
      location: 'Offcut Bin',
      classification: 'reusable_offcut',
      notes: 'Demo offcut',
    }),
    demoBoard({
      id: 'demo-offcut-3',
      tagId: 'OAK-201-OC1',
      species: 'European Oak',
      source: 'Offcut',
      length: 310,
      width: 110,
      thickness: 20,
      quantity: 4,
      location: 'Small Rack',
      classification: 'reusable_offcut',
      notes: 'Demo offcut',
    }),
    demoBoard({
      id: 'demo-offcut-4',
      tagId: 'PLY-301-OC1',
      species: 'Plywood',
      source: 'Offcut',
      length: 450,
      width: 200,
      thickness: 12,
      quantity: 5,
      location: 'Under Cabinet',
      classification: 'reusable_offcut',
      notes: 'Demo offcut',
    }),
    demoBoard({
      id: 'demo-offcut-5',
      tagId: 'MAP-401-OC1',
      species: 'Maple',
      source: 'Offcut',
      length: 250,
      width: 70,
      thickness: 19,
      quantity: 3,
      location: 'Offcut Bin',
      classification: 'reusable_offcut',
      notes: 'Demo offcut',
    }),
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
    lumberTypes: [
      'Pine / Pallet',
      'Plywood',
      'Walnut',
      'European Oak',
      'Maple',
      'Mahogany',
    ],
    suppliers: ['Bunnings', 'Local timber yard'],
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
