import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type BoardStatus = 'active' | 'consumed' | 'allocated';
export type BoardClassification = 'finished_piece' | 'reusable_offcut' | 'waste';

export interface OffcutSettings {
  minLength: number;
  minWidth: number;
}

export interface Board {
  id: string;
  tagId: string;
  species: string;
  source: string;
  length: number;
  width: number;
  thickness: number;
  /** Optional nested dimensions used by some cut-confirmation writers */
  dimensions?: {
    length: number;
    width: number;
    thickness: number;
  };
  quantity: number;
  location: string;
  createdAt: string;
  status: BoardStatus;
  classification?: BoardClassification;
  parentBoardId?: string;
  originProject?: string;
  notes?: string;
}

export interface CutPart {
  id: string;
  name: string;
  species: string;
  length: number;
  width: number;
  thickness?: number;
  quantity: number;
}

export interface SavedProject {
  id: string;
  name: string;
  date: string;
  parts: CutPart[];
}

export interface ConfirmationPayload {
  opKey: string;
  parentBoardTagId: string;
  producedPart: {
    name: string;
    length: number;
    width: number;
  };
  offcut: {
    length: number;
    width: number;
  };
  species: string;
  source: string;
  location: string;
  thickness: number;
}

interface AppState {
  boards: Board[];
  storageLocations: string[];
  savedProjects: SavedProject[];
  activeProjectName: string;
  activeParts: CutPart[];
  completedOperations: string[];
  offcutSettings: OffcutSettings;

  // Inventory actions
  addBoard: (board: Board) => void;
  removeBoard: (id: string) => void;
  updateStorageLocations: (locations: string[]) => void;
  updateOffcutSettings: (settings: OffcutSettings) => void;
  processCuttingOperation: (
    opKey: string,
    parentBoardTagId: string,
    newBoards: Board[]
  ) => void;

  // Project management actions
  setActiveProjectName: (name: string) => void;
  setActiveParts: (parts: CutPart[]) => void;
  addPartToActiveProject: (part: CutPart) => void;
  removePartFromActiveProject: (id: string) => void;
  saveCurrentProject: () => void;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
  startNewProject: () => void;
}

const DEFAULT_BOARDS: Board[] = [
  { id: 'b-012', tagId: 'PIN-012', species: 'Pine / Pallet', source: 'Pallet', length: 450, width: 75, thickness: 18, quantity: 1, location: 'Workbench', status: 'active', classification: 'reusable_offcut', createdAt: new Date().toISOString() },
  { id: 'b-005', tagId: 'PIN-005', species: 'Pine / Pallet', source: 'Pallet', length: 450, width: 75, thickness: 18, quantity: 1, location: 'Workbench', status: 'active', classification: 'reusable_offcut', createdAt: new Date().toISOString() },
  { id: 'b-004', tagId: 'PIN-004', species: 'Pine / Pallet', source: 'Pallet', length: 450, width: 75, thickness: 18, quantity: 1, location: 'Workbench', status: 'active', classification: 'reusable_offcut', createdAt: new Date().toISOString() },
  { id: 'b-002', tagId: 'PIN-002', species: 'Pine / Pallet', source: 'Pallet', length: 450, width: 75, thickness: 18, quantity: 1, location: 'Workbench', status: 'active', classification: 'reusable_offcut', createdAt: new Date().toISOString() },
  { id: 'b-003', tagId: 'PIN-003', species: 'Pine / Pallet', source: 'Pallet', length: 450, width: 75, thickness: 18, quantity: 1, location: 'Workbench', status: 'active', classification: 'reusable_offcut', createdAt: new Date().toISOString() },
  { id: 'b-001', tagId: 'PIN-001', species: 'Pine / Pallet', source: 'Pallet', length: 450, width: 75, thickness: 18, quantity: 1, location: 'Workbench', status: 'active', classification: 'reusable_offcut', createdAt: new Date().toISOString() },
  { id: 'b-007', tagId: 'WAL-007', species: 'Walnut', source: 'Salvaged', length: 600, width: 100, thickness: 20, quantity: 1, location: 'Small Rack', status: 'active', classification: 'reusable_offcut', createdAt: new Date().toISOString() },
];

const DEFAULT_LOCATIONS = ['Workbench', 'Rack 1', 'Rack 2', 'Rack 3', 'Small Rack', 'Under Cabinet'];

const DEFAULT_PROJECT_PARTS: CutPart[] = [
  { id: '1', name: 'Cutting Board', species: 'Pine / Pallet', length: 350, width: 50, quantity: 6 },
  { id: '2', name: 'Rails', species: 'Walnut', length: 300, width: 25, quantity: 2 },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      boards: DEFAULT_BOARDS,
      storageLocations: DEFAULT_LOCATIONS,
      activeProjectName: 'Cutting Board',
      activeParts: DEFAULT_PROJECT_PARTS,
      savedProjects: [
        {
          id: 'proj-default-1',
          name: 'Cutting Board',
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          parts: DEFAULT_PROJECT_PARTS,
        },
      ],
      completedOperations: [],
      offcutSettings: {
        minLength: 100,
        minWidth: 100,
      },

      addBoard: (board) => set((state) => ({ boards: [board, ...state.boards] })),
      removeBoard: (id) => set((state) => ({ boards: state.boards.filter((b) => b.id !== id) })),
      updateStorageLocations: (locations) => set({ storageLocations: locations }),
      updateOffcutSettings: (settings) => set({ offcutSettings: settings }),

      processCuttingOperation: (opKey, parentBoardTagId, newBoards) => {
        set((state) => {
          if (state.completedOperations.includes(opKey)) return state;

          const updatedBoards = state.boards.map((b) => {
            if (b.tagId === parentBoardTagId || b.id === parentBoardTagId) {
              return { ...b, status: 'consumed' as const };
            }
            return b;
          });

          return {
            boards: [...newBoards, ...updatedBoards],
            completedOperations: [...state.completedOperations, opKey],
          };
        });
      },

      setActiveProjectName: (name) => set({ activeProjectName: name }),
      setActiveParts: (parts) => set({ activeParts: parts }),
      
      addPartToActiveProject: (part) =>
        set((state) => ({ activeParts: [...state.activeParts, part] })),

      removePartFromActiveProject: (id) =>
        set((state) => ({ activeParts: state.activeParts.filter((p) => p.id !== id) })),

      saveCurrentProject: () => {
        const { activeProjectName, activeParts, savedProjects } = get();
        if (!activeProjectName.trim() || activeParts.length === 0) return;

        const existingIdx = savedProjects.findIndex(
          (p) => p.name.toLowerCase() === activeProjectName.trim().toLowerCase()
        );

        const projectData: SavedProject = {
          id: existingIdx >= 0 ? savedProjects[existingIdx].id : Date.now().toString(),
          name: activeProjectName.trim(),
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          parts: activeParts,
        };

        if (existingIdx >= 0) {
          const updated = [...savedProjects];
          updated[existingIdx] = projectData;
          set({ savedProjects: updated });
        } else {
          set({ savedProjects: [projectData, ...savedProjects] });
        }
      },

      loadProject: (id) => {
        const proj = get().savedProjects.find((p) => p.id === id);
        if (proj) {
          set({ activeProjectName: proj.name, activeParts: proj.parts });
        }
      },

      deleteProject: (id) => {
        set((state) => ({ savedProjects: state.savedProjects.filter((p) => p.id !== id) }));
      },

      startNewProject: () => {
        set({ activeProjectName: 'New Project / Build', activeParts: [] });
      },
    }),
    {
      name: 'timbervault_storage',
    }
  )
);