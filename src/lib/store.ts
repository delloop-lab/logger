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

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  requiredSpecies: string[];
  minLength: number;
  minWidth: number;
  minThickness: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
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

  addBoard: (board: Board) => void;
  removeBoard: (id: string) => void;
  updateBoard: (board: Board) => void;
  updateStorageLocations: (locations: string[]) => void;
  updateOffcutSettings: (settings: OffcutSettings) => void;
  processCuttingOperation: (
    opKey: string,
    parentBoardTagId: string,
    newBoards: Board[]
  ) => void;

  setActiveProjectName: (name: string) => void;
  setActiveParts: (parts: CutPart[]) => void;
  addPartToActiveProject: (part: CutPart) => void;
  removePartFromActiveProject: (id: string) => void;
  saveCurrentProject: () => void;
  loadProject: (id: string) => void;
  deleteProject: (id: string) => void;
  startNewProject: () => void;
  resetWorkshopData: () => void;
}

/** Fresh workshop defaults — no demo boards, no Jewel Case, no sample projects */
export const DEFAULT_LOCATIONS = [
  'Workbench',
  'Rack 1',
  'Rack 2',
  'Rack 3',
  'Small Rack',
  'Under Cabinet',
  'Offcut Bin',
];

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tpl-cutting-board',
    name: 'End-Grain Cutting Board',
    description: 'Classic butcher-block style board from mixed hardwood scraps.',
    requiredSpecies: ['European Oak', 'Walnut', 'Maple'],
    minLength: 300,
    minWidth: 50,
    minThickness: 30,
    difficulty: 'Intermediate',
  },
  {
    id: 'tpl-coasters',
    name: 'Minimalist Coaster Set',
    description: 'Set of four square coasters with chamfered edges.',
    requiredSpecies: ['European Oak', 'Walnut', 'Maple'],
    minLength: 100,
    minWidth: 100,
    minThickness: 12,
    difficulty: 'Beginner',
  },
  {
    id: 'tpl-mallet',
    name: 'Shop Mallet',
    description: 'Heavy-duty workshop mallet laminated from offcuts.',
    requiredSpecies: ['European Oak', 'Pine / Pallet', 'Maple'],
    minLength: 200,
    minWidth: 60,
    minThickness: 40,
    difficulty: 'Beginner',
  },
];

const FRESH_STATE = {
  boards: [] as Board[],
  storageLocations: [...DEFAULT_LOCATIONS],
  activeProjectName: 'New Project',
  activeParts: [] as CutPart[],
  savedProjects: [] as SavedProject[],
  completedOperations: [] as string[],
  offcutSettings: {
    minLength: 100,
    minWidth: 100,
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...FRESH_STATE,

      addBoard: (board) => set((state) => ({ boards: [board, ...state.boards] })),

      removeBoard: (id) =>
        set((state) => ({ boards: state.boards.filter((b) => b.id !== id) })),

      updateBoard: (board) =>
        set((state) => ({
          boards: state.boards.map((b) => (b.id === board.id ? board : b)),
        })),

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
          date: new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
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
        set((state) => ({
          savedProjects: state.savedProjects.filter((p) => p.id !== id),
        }));
      },

      startNewProject: () => {
        set({ activeProjectName: 'New Project', activeParts: [] });
      },

      resetWorkshopData: () => set({ ...FRESH_STATE }),
    }),
    {
      name: 'timbervault_v2',
      version: 1,
    }
  )
);
