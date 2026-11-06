import { create } from 'zustand';
import {
  DEFAULT_KERF_MM,
  type CuttingStrategy,
  type Placement,
} from '@/lib/cutting-engine';
import { createDemoWorkspace } from '@/lib/demo-workspace';
import { buildRecoveredWorkshopProjects } from '@/lib/recovered-projects';
import { escapeTag, resolveUnitsIssued } from '@/lib/inventory-lots';
import {
  DEFAULT_LUMBER_TYPES,
  mergeLumberTypesWithStock,
  normalizeLumberTypes,
} from '@/lib/lumber-types';
import type { UnitSystem } from '@/lib/units';

export { DEFAULT_LUMBER_TYPES } from '@/lib/lumber-types';

export type BoardStatus = 'active' | 'consumed' | 'allocated';
export type BoardClassification = 'finished_piece' | 'reusable_offcut' | 'waste';
export type { UnitSystem, CuttingStrategy };

export interface OffcutSettings {
  minLength: number;
  minWidth: number;
}

export { DEFAULT_KERF_MM };

export interface Board {
  id: string;
  tagId: string;
  species: string;
  source: string;
  length: number;
  width: number;
  thickness: number;
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
  /** Defects noted when logging stock (screw holes, knots, etc.). */
  defects?: string[];
  /** Freeform detail for defects (where on the board, how bad, etc.). */
  defectNotes?: string;
  /**
   * How many unit pieces have already been taken from this quantity lot.
   * Keeps pull tags stable: after PIN-001-1 is used, next is PIN-001-2 (not PIN-001-1 again).
   */
  unitsIssued?: number;
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

export type ProjectStatus = 'active' | 'paused' | 'completed';
export type ProjectDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

/** Snapshot of the nesting plan used for confirmed shop cuts. */
export interface SavedCuttingPlan {
  savedAt: string;
  /** Fingerprint of parts when this plan was built (invalidate if parts change). */
  partsFingerprint: string;
  kerfMm: number;
  strategy?: CuttingStrategy;
  explanation?: string;
  usedBoardTags: string[];
  placements: Placement[];
  unallocated?: Array<{
    id: string;
    name: string;
    species: string;
    length: number;
    width: number;
    thickness: number;
  }>;
}

export interface SavedProject {
  id: string;
  name: string;
  date: string;
  parts: CutPart[];
  /** Blade kerf for this project (mm). Falls back to workshop default when missing. */
  kerfMm?: number;
  /** Paused = waiting for stock; completed = build finished (shown in What Can I Build). */
  status?: ProjectStatus;
  /** Why the project was paused (missing stock notes). */
  pauseReason?: string;
  /** Showcase blurb for What Can I Build (completed builds). */
  description?: string;
  /** Skill level shown on What Can I Build cards. */
  difficulty?: ProjectDifficulty;
  /** Last generated/confirmed cutting sequence for this project. */
  cuttingPlan?: SavedCuttingPlan;
  /** Confirmed cut op keys for this project (`Name-step-boardTag`). */
  completedCutOps?: string[];
}

export function partsFingerprint(parts: CutPart[]): string {
  return [...parts]
    .map(
      (p) =>
        `${p.id}:${p.name}:${p.species}:${p.length}x${p.width}x${p.thickness ?? 0}:q${p.quantity}`
    )
    .sort()
    .join('|');
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  requiredSpecies: string[];
  minLength: number;
  minWidth: number;
  minThickness: number;
  difficulty: ProjectDifficulty;
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

export type WorkspaceData = {
  boards: Board[];
  storageLocations: string[];
  /** Editable lumber / species catalog for Quick Log and project parts */
  lumberTypes: string[];
  savedProjects: SavedProject[];
  activeProjectName: string;
  /** Description / build notes for the open project (shown in Projects & Cuts and What Can I Build). */
  activeProjectDescription?: string;
  activeParts: CutPart[];
  completedOperations: string[];
  offcutSettings: OffcutSettings;
  unitSystem: UnitSystem;
  /** Workshop default saw kerf (mm) — used for new projects */
  defaultKerfMm: number;
  /** Kerf for the project currently open (mm) — change anytime for a different blade */
  activeKerfMm: number;
  /** Preferred cutting strategy (§4) — defaults to 'auto' (Let Logger Decide) */
  activeStrategy?: CuttingStrategy;
  /** Working copy of the open project's saved cutting plan (if any). */
  activeCuttingPlan: SavedCuttingPlan | null;
};

export type CutHistoryEntry = {
  opKey: string;
  /** Boards whose status/qty were changed (lot or previous rem) */
  restorations: Array<{
    boardId: string;
    boardTag: string;
    prevStatus: BoardStatus;
    prevQuantity: number;
    prevUnitsIssued?: number;
  }>;
  createdBoardIds: string[];
};

interface AppState extends WorkspaceData {
  cloudUserId: string | null;
  cloudReady: boolean;
  cloudSaving: boolean;
  authChecked: boolean;
  /** Signed-out preview uses sample data — never sync to cloud. */
  demoPreview: boolean;
  cutHistory: CutHistoryEntry[];
  /** Bumped on every workshop mutation so CloudSync can persist to Supabase */
  cloudRevision: number;
  /**
   * When true, the next cloud save may wipe boards/projects if local lists are empty
   * (only set by intentional Settings → wipe).
   */
  pendingCloudEmptyWipe: boolean;
  /** Board IDs the user explicitly deleted — cloud removes only these. */
  pendingDeletedBoardIds: string[];
  /** Project IDs the user explicitly deleted — cloud removes only these. */
  pendingDeletedProjectIds: string[];
  /**
   * UI signal: Projects & Cuts should expand saved cutting diagrams
   * (e.g. opened a confirmed build from What Can I Build).
   */
  revealSavedCuttingSheets: boolean;
  clearPendingCloudEmptyWipe: () => void;
  clearPendingDeletes: () => void;

  setCloudUserId: (userId: string | null) => void;
  setCloudReady: (ready: boolean) => void;
  setCloudSaving: (saving: boolean) => void;
  setAuthChecked: (checked: boolean) => void;
  hydrateFromCloud: (data: WorkspaceData) => void;
  clearWorkshopMemory: () => void;
  /** Load sample workshop for signed-out UI (not real account data). */
  loadDemoPreview: () => void;
  bumpCloudRevision: () => void;

  addBoard: (board: Board) => void;
  removeBoard: (id: string) => void;
  updateBoard: (board: Board) => void;
  updateStorageLocations: (locations: string[]) => void;
  updateLumberTypes: (types: string[]) => void;
  /** Rename a lumber type and update boards / open parts that use the old label. */
  renameLumberType: (
    from: string,
    to: string
  ) => { ok: true } | { ok: false; message: string };
  updateOffcutSettings: (settings: OffcutSettings) => void;
  setUnitSystem: (system: UnitSystem) => void;
  setDefaultKerfMm: (mm: number) => void;
  setActiveKerfMm: (mm: number) => void;
  setActiveStrategy: (strategy: CuttingStrategy) => void;
  processCuttingOperation: (
    opKey: string,
    newBoards: Board[],
    options?: {
      /** Decrement/consume this inventory lot (first cut on a stock board) */
      takeFromLotTag?: string;
      /** Exact tags to mark consumed (e.g. previous remnant) */
      consumeExactTags?: string[];
    }
  ) => void;
  undoLastCut: () => { ok: true; message: string } | { ok: false; message: string };
  /** Undo every confirmed cut (newest first) — restores stock and removes parts/offcuts from cuts */
  undoAllCuts: () => { ok: true; message: string } | { ok: false; message: string };

  setActiveProjectName: (name: string) => void;
  setActiveProjectDescription: (description: string) => void;
  setActiveParts: (parts: CutPart[]) => void;
  addPartToActiveProject: (part: CutPart) => void;
  updatePartInActiveProject: (part: CutPart) => void;
  removePartFromActiveProject: (id: string) => void;
  /** Persist the current nest as this project's cutting plan (generate / confirm). */
  saveCuttingPlanToActiveProject: (plan: SavedCuttingPlan) => void;
  /** Clear saved plan (e.g. after parts edit or explicit regenerate). */
  clearActiveCuttingPlan: () => void;
  saveCurrentProject: () => void;
  /** Create or select a named project (empty cut list if new). */
  createOrOpenProject: (name: string) => { ok: true; created: boolean } | { ok: false; message: string };
  /**
   * Save the open project as paused (waiting for stock), then clear the workbench.
   * Returns false if the project has no name/parts.
   */
  pauseActiveProject: (
    reason: string
  ) => { ok: true; name: string } | { ok: false; message: string };
  /** Resume a paused project onto the workbench and clear pause status. */
  resumeProject: (id: string) => { ok: true; name: string } | { ok: false; message: string };
  /** Mark finished parts installed (status consumed) in one update. */
  markBoardsInstalled: (boardIds: string[]) => number;
  /**
   * Mark a saved project as a completed build (appears in What Can I Build).
   * Matches by project name (e.g. Inventory “Build complete”).
   */
  markProjectCompleted: (
    projectName: string,
    meta?: { description?: string; difficulty?: ProjectDifficulty }
  ) => { ok: true; id: string; name: string } | { ok: false; message: string };
  /** Update showcase fields for a completed (or any) saved project. */
  updateProjectShowcase: (
    id: string,
    meta: { description?: string; difficulty?: ProjectDifficulty }
  ) => { ok: true } | { ok: false; message: string };
  /**
   * Push the open cut list into savedProjects so What Can I Build lists it
   * (covers projects that were edited but never explicitly Saved).
   */
  syncActiveProjectToLibrary: () => void;
  loadProject: (id: string, options?: { revealSheets?: boolean }) => void;
  /** Open a library project and show its saved cutting diagrams when present. */
  openProjectWithCuttingSheets: (id: string) => {
    ok: true;
    name: string;
    hasPlan: boolean;
  } | { ok: false; message: string };
  clearRevealSavedCuttingSheets: () => void;
  deleteProject: (id: string) => void;
  startNewProject: () => void;
  resetWorkshopData: () => void;
  /**
   * Merge recovered workshop projects (after cloud wipe) into the library.
   * Skips names that already exist. Bumps cloudRevision so CloudSync persists.
   */
  restoreRecoveredProjects: () => { ok: true; added: number; skipped: number };
  /**
   * Non-destructive restore from a daily backup or imported JSON file.
   * Merges missing boards and projects into the current workshop and syncs to cloud.
   */
  mergeBackupIntoWorkshop: (payload: {
    boards?: Board[];
    savedProjects?: SavedProject[];
    storageLocations?: string[];
    lumberTypes?: string[];
  }) => { addedBoards: number; addedProjects: number };
}

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
    description:
      'Heavy-duty workshop mallet laminated from offcuts (glue layers if boards are thinner).',
    requiredSpecies: ['European Oak', 'Pine / Pallet', 'Maple'],
    minLength: 200,
    minWidth: 60,
    // Laminated head — individual boards can be typical pallet/offcut thickness
    minThickness: 18,
    difficulty: 'Beginner',
  },
];

const FRESH_STATE: WorkspaceData = {
  boards: [],
  storageLocations: [...DEFAULT_LOCATIONS],
  lumberTypes: [...DEFAULT_LUMBER_TYPES],
  activeProjectName: 'New Project',
  activeProjectDescription: '',
  activeParts: [],
  savedProjects: [],
  completedOperations: [],
  offcutSettings: {
    minLength: 100,
    minWidth: 100,
  },
  unitSystem: 'metric',
  defaultKerfMm: DEFAULT_KERF_MM,
  activeKerfMm: DEFAULT_KERF_MM,
  activeStrategy: 'auto',
  activeCuttingPlan: null,
};

function projectNameKey(name: string) {
  return name.trim().toLowerCase();
}

function patchSavedProject(
  projects: SavedProject[],
  name: string,
  patch: Partial<SavedProject>
): SavedProject[] {
  const key = projectNameKey(name);
  const idx = projects.findIndex((p) => projectNameKey(p.name) === key);
  if (idx < 0) return projects;
  return projects.map((p, i) => (i === idx ? { ...p, ...patch } : p));
}

function preservedProjectStatus(existing?: SavedProject): ProjectStatus {
  if (existing?.status === 'paused') return 'paused';
  if (existing?.status === 'completed') return 'completed';
  return 'active';
}

/** Drop saved nest + confirmed cut keys when the cut list changes. */
function invalidatePlanForPartsChange(state: {
  activeProjectName: string;
  completedOperations: string[];
  savedProjects: SavedProject[];
  cloudRevision: number;
}) {
  const prefix = `${state.activeProjectName.trim()}-`;
  return {
    activeCuttingPlan: null as SavedCuttingPlan | null,
    completedOperations: state.completedOperations.filter((op) => !op.startsWith(prefix)),
    savedProjects: patchSavedProject(state.savedProjects, state.activeProjectName, {
      cuttingPlan: undefined,
      completedCutOps: [],
    }),
    cloudRevision: state.cloudRevision + 1,
  };
}

export const useAppStore = create<AppState>()((set, get) => ({
  ...FRESH_STATE,
  cloudUserId: null,
  cloudReady: false,
  cloudSaving: false,
  authChecked: false,
  demoPreview: false,
  cutHistory: [],
  cloudRevision: 0,
  pendingCloudEmptyWipe: false,
  pendingDeletedBoardIds: [],
  pendingDeletedProjectIds: [],
  revealSavedCuttingSheets: false,

  setCloudUserId: (userId) => set({ cloudUserId: userId }),
  setCloudReady: (ready) => set({ cloudReady: ready }),
  setCloudSaving: (saving) => set({ cloudSaving: saving }),
  setAuthChecked: (checked) => set({ authChecked: checked }),

  hydrateFromCloud: (data) => {
    // Only seed recovered projects if the cloud library is completely empty (0 projects).
    // Never auto-resurrect a project the user intentionally deleted.
    const cloudProjects = data.savedProjects || [];
    const recovered =
      cloudProjects.length === 0 ? buildRecoveredWorkshopProjects() : [];
    const savedProjects = cloudProjects.length > 0 ? cloudProjects : recovered;
    const activeMatch = savedProjects.find(
      (p) => projectNameKey(p.name) === projectNameKey(data.activeProjectName || '')
    );
    set({
      ...data,
      savedProjects,
      activeProjectDescription:
        data.activeProjectDescription ?? activeMatch?.description ?? '',
      lumberTypes: mergeLumberTypesWithStock(
        data.lumberTypes,
        (data.boards || []).map((b) => b.species)
      ),
      defaultKerfMm: data.defaultKerfMm ?? DEFAULT_KERF_MM,
      activeKerfMm: data.activeKerfMm ?? data.defaultKerfMm ?? DEFAULT_KERF_MM,
      activeCuttingPlan: data.activeCuttingPlan ?? null,
      cloudReady: true,
      demoPreview: false,
      cutHistory: [],
      cloudRevision: recovered.length > 0 ? 1 : 0,
    });
  },

  clearWorkshopMemory: () =>
    set({
      ...FRESH_STATE,
      cloudUserId: null,
      cloudReady: false,
      cloudSaving: false,
      authChecked: true,
      demoPreview: false,
      cutHistory: [],
      cloudRevision: 0,
      revealSavedCuttingSheets: false,
    }),

  loadDemoPreview: () => {
    const demo = createDemoWorkspace();
    set({
      ...demo,
      cloudUserId: null,
      cloudReady: true,
      cloudSaving: false,
      authChecked: true,
      demoPreview: true,
      cutHistory: [],
      cloudRevision: 0,
      revealSavedCuttingSheets: false,
    });
  },

  bumpCloudRevision: () => set((s) => ({ cloudRevision: s.cloudRevision + 1 })),
  clearPendingCloudEmptyWipe: () => set({ pendingCloudEmptyWipe: false }),
  clearPendingDeletes: () => set({ pendingDeletedBoardIds: [], pendingDeletedProjectIds: [] }),

  addBoard: (board) =>
    set((state) => ({
      boards: [board, ...state.boards],
      cloudRevision: state.cloudRevision + 1,
    })),

  removeBoard: (id) =>
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== id),
      pendingDeletedBoardIds: state.pendingDeletedBoardIds.includes(id)
        ? state.pendingDeletedBoardIds
        : [...state.pendingDeletedBoardIds, id],
      cloudRevision: state.cloudRevision + 1,
    })),

  updateBoard: (board) =>
    set((state) => ({
      boards: state.boards.map((b) => (b.id === board.id ? board : b)),
      cloudRevision: state.cloudRevision + 1,
    })),

  updateStorageLocations: (locations) =>
    set((state) => ({
      storageLocations: locations,
      cloudRevision: state.cloudRevision + 1,
    })),

  updateLumberTypes: (types) =>
    set((state) => ({
      lumberTypes: normalizeLumberTypes(types),
      cloudRevision: state.cloudRevision + 1,
    })),

  renameLumberType: (from, to) => {
    const oldName = String(from || '').trim();
    const newName = String(to || '').trim().replace(/\s+/g, ' ');
    if (!oldName) return { ok: false, message: 'Nothing to rename.' };
    if (!newName) return { ok: false, message: 'Enter a lumber type name.' };
    if (oldName.toLowerCase() === newName.toLowerCase() && oldName !== newName) {
      // Casing-only change — still apply
    } else if (oldName.toLowerCase() === newName.toLowerCase()) {
      return { ok: true };
    }

    const state = get();
    const clash = state.lumberTypes.some(
      (t) => t.toLowerCase() === newName.toLowerCase() && t.toLowerCase() !== oldName.toLowerCase()
    );
    if (clash) return { ok: false, message: 'That lumber type already exists.' };

    set((s) => ({
      lumberTypes: normalizeLumberTypes(
        s.lumberTypes.map((t) => (t.toLowerCase() === oldName.toLowerCase() ? newName : t))
      ),
      boards: s.boards.map((b) =>
        b.species.toLowerCase() === oldName.toLowerCase() ? { ...b, species: newName } : b
      ),
      activeParts: s.activeParts.map((p) =>
        p.species.toLowerCase() === oldName.toLowerCase() ? { ...p, species: newName } : p
      ),
      savedProjects: s.savedProjects.map((proj) => ({
        ...proj,
        parts: proj.parts.map((p) =>
          p.species.toLowerCase() === oldName.toLowerCase() ? { ...p, species: newName } : p
        ),
      })),
      cloudRevision: s.cloudRevision + 1,
    }));
    return { ok: true };
  },

  updateOffcutSettings: (settings) =>
    set((state) => ({
      offcutSettings: settings,
      cloudRevision: state.cloudRevision + 1,
    })),

  setUnitSystem: (system) =>
    set((state) => ({
      unitSystem: system,
      cloudRevision: state.cloudRevision + 1,
    })),

  setDefaultKerfMm: (mm) =>
    set((state) => {
      const kerf = Math.max(0, Number(mm) || 0);
      return {
        defaultKerfMm: kerf,
        cloudRevision: state.cloudRevision + 1,
      };
    }),

  setActiveKerfMm: (mm) =>
    set((state) => ({
      activeKerfMm: Math.max(0, Number(mm) || 0),
      cloudRevision: state.cloudRevision + 1,
    })),

  setActiveStrategy: (strategy) =>
    set(() => ({
      activeStrategy: strategy,
    })),

  processCuttingOperation: (opKey, newBoards, options) => {
    set((state) => {
      if (state.completedOperations.includes(opKey)) return state;

      const takeFromLotTag = options?.takeFromLotTag;
      const consumeExactTags = new Set(options?.consumeExactTags || []);
      const restorations: CutHistoryEntry['restorations'] = [];

      const findLot = (tag: string) => {
        const baseTag = tag.replace(/-\d+$/, '');
        return (
          state.boards.find(
            (b) =>
              b.tagId === tag ||
              b.id === tag ||
              b.tagId === baseTag ||
              tag.startsWith(`${b.id}#`) ||
              (tag.startsWith(`${b.tagId}-`) && !tag.includes('-OP'))
          ) || null
        );
      };

      const updatedBoards = state.boards.map((b) => {
        let next = b;

        if (takeFromLotTag) {
          const lot = findLot(takeFromLotTag);
          if (lot && b.id === lot.id) {
            restorations.push({
              boardId: b.id,
              boardTag: b.tagId,
              prevStatus: b.status,
              prevQuantity: b.quantity || 1,
              prevUnitsIssued: b.unitsIssued || 0,
            });
            const qty = Math.max(1, b.quantity || 1);
            const inferred = resolveUnitsIssued(b, state.boards);
            const unitMatch = takeFromLotTag.match(
              new RegExp(`^${escapeTag(b.tagId)}-(\\d+)(?:$|-)`)
            );
            const takenUnit = unitMatch ? Number(unitMatch[1]) : inferred + 1;
            const nextIssued = Math.max(inferred, takenUnit);
            next =
              qty > 1
                ? { ...b, quantity: qty - 1, status: 'active', unitsIssued: nextIssued }
                : { ...b, status: 'consumed', quantity: 0, unitsIssued: nextIssued };
          }
        }

        if (consumeExactTags.has(b.tagId)) {
          if (!restorations.some((r) => r.boardId === b.id)) {
            restorations.push({
              boardId: b.id,
              boardTag: b.tagId,
              prevStatus: b.status,
              prevQuantity: b.quantity || 1,
              prevUnitsIssued: b.unitsIssued || 0,
            });
          }
          next = { ...next, status: 'consumed' };
        }

        return next;
      });

      const historyEntry: CutHistoryEntry = {
        opKey,
        restorations,
        createdBoardIds: newBoards.map((b) => b.id),
      };

      const nextCompleted = [...state.completedOperations, opKey];
      const projPrefix = `${state.activeProjectName.trim()}-`;
      const projOps = nextCompleted.filter((op) => op.startsWith(projPrefix));

      return {
        boards: [...newBoards, ...updatedBoards],
        completedOperations: nextCompleted,
        cutHistory: [...state.cutHistory, historyEntry],
        savedProjects: patchSavedProject(state.savedProjects, state.activeProjectName, {
          completedCutOps: projOps,
          cuttingPlan: state.activeCuttingPlan || undefined,
        }),
        cloudRevision: state.cloudRevision + 1,
      };
    });
  },

  undoLastCut: () => {
    const state = get();
    if (state.cutHistory.length === 0) {
      return { ok: false, message: 'Nothing to undo, no cuts confirmed yet.' };
    }

    const entry = state.cutHistory[state.cutHistory.length - 1];
    const createdSet = new Set(entry.createdBoardIds);
    const restoreMap = new Map(entry.restorations.map((r) => [r.boardId, r]));
    const nextCompleted = state.completedOperations.filter((k) => k !== entry.opKey);
    const projPrefix = `${state.activeProjectName.trim()}-`;
    const projOps = nextCompleted.filter((op) => op.startsWith(projPrefix));

    set({
      boards: state.boards
        .filter((b) => !createdSet.has(b.id))
        .map((b) => {
          const prev = restoreMap.get(b.id);
          if (!prev) return b;
          return {
            ...b,
            status: prev.prevStatus,
            quantity: prev.prevQuantity,
            unitsIssued: prev.prevUnitsIssued ?? b.unitsIssued,
          };
        }),
      completedOperations: nextCompleted,
      cutHistory: state.cutHistory.slice(0, -1),
      savedProjects: patchSavedProject(state.savedProjects, state.activeProjectName, {
        completedCutOps: projOps,
      }),
      cloudRevision: state.cloudRevision + 1,
    });

    const restored = entry.restorations.map((r) => r.boardTag).join(', ') || 'stock';
    return {
      ok: true,
      message: `Undid last cut. Restored: ${restored}.`,
    };
  },

  undoAllCuts: () => {
    const total = get().cutHistory.length;
    if (total === 0) {
      return { ok: false, message: 'Nothing to undo, no cuts confirmed yet.' };
    }

    let undone = 0;
    while (get().cutHistory.length > 0) {
      const result = get().undoLastCut();
      if (!result.ok) break;
      undone += 1;
    }

    return {
      ok: true,
      message: `Undid ${undone} cut${undone === 1 ? '' : 's'}, stock restored, finished pieces and cut offcuts removed.`,
    };
  },

  setActiveProjectName: (name) =>
    set((state) => {
      const match = state.savedProjects.find(
        (p) => projectNameKey(p.name) === projectNameKey(name)
      );
      return {
        activeProjectName: name,
        activeProjectDescription: match
          ? match.description ?? state.activeProjectDescription
          : state.activeProjectDescription,
        cloudRevision: state.cloudRevision + 1,
      };
    }),

  setActiveProjectDescription: (description) =>
    set((state) => ({
      activeProjectDescription: description,
      savedProjects: patchSavedProject(state.savedProjects, state.activeProjectName, {
        description: description.trim() || undefined,
      }),
      cloudRevision: state.cloudRevision + 1,
    })),

  setActiveParts: (parts) =>
    set((state) => {
      const invalidated = invalidatePlanForPartsChange(state);
      return {
        activeParts: parts,
        ...invalidated,
        // Keep the library copy in sync so What Can I Build sees the cut list
        savedProjects: patchSavedProject(invalidated.savedProjects, state.activeProjectName, {
          parts,
          difficulty: state.savedProjects.find(
            (p) => projectNameKey(p.name) === projectNameKey(state.activeProjectName)
          )?.difficulty || 'Beginner',
        }),
      };
    }),

  addPartToActiveProject: (part) =>
    set((state) => {
      const activeParts = [...state.activeParts, part];
      const invalidated = invalidatePlanForPartsChange(state);
      const existing = state.savedProjects.find(
        (p) => projectNameKey(p.name) === projectNameKey(state.activeProjectName)
      );
      return {
        activeParts,
        ...invalidated,
        savedProjects: patchSavedProject(invalidated.savedProjects, state.activeProjectName, {
          parts: activeParts,
          difficulty: existing?.difficulty || 'Beginner',
          description: existing?.description,
        }),
      };
    }),

  updatePartInActiveProject: (part) =>
    set((state) => {
      const activeParts = state.activeParts.map((p) => (p.id === part.id ? part : p));
      const invalidated = invalidatePlanForPartsChange(state);
      const existing = state.savedProjects.find(
        (p) => projectNameKey(p.name) === projectNameKey(state.activeProjectName)
      );
      return {
        activeParts,
        ...invalidated,
        savedProjects: patchSavedProject(invalidated.savedProjects, state.activeProjectName, {
          parts: activeParts,
          difficulty: existing?.difficulty || 'Beginner',
          description: existing?.description,
        }),
      };
    }),

  removePartFromActiveProject: (id) =>
    set((state) => {
      const activeParts = state.activeParts.filter((p) => p.id !== id);
      const invalidated = invalidatePlanForPartsChange(state);
      const existing = state.savedProjects.find(
        (p) => projectNameKey(p.name) === projectNameKey(state.activeProjectName)
      );
      return {
        activeParts,
        ...invalidated,
        savedProjects: patchSavedProject(invalidated.savedProjects, state.activeProjectName, {
          parts: activeParts,
          difficulty: existing?.difficulty || 'Beginner',
          description: existing?.description,
        }),
      };
    }),

  saveCuttingPlanToActiveProject: (plan) => {
    const {
      activeProjectName,
      activeProjectDescription,
      activeParts,
      activeKerfMm,
      savedProjects,
      completedOperations,
      cloudRevision,
    } = get();
    const name = activeProjectName.trim();
    if (!name || name.toLowerCase() === 'new project' || activeParts.length === 0) {
      set({ activeCuttingPlan: plan, cloudRevision: cloudRevision + 1 });
      return;
    }

    const prefix = `${name}-`;
    const completedCutOps = completedOperations.filter((op) => op.startsWith(prefix));
    const existingIdx = savedProjects.findIndex((p) => projectNameKey(p.name) === projectNameKey(name));
    const existing = existingIdx >= 0 ? savedProjects[existingIdx] : undefined;
    const descTrim = activeProjectDescription?.trim();

    const projectData: SavedProject = {
      id: existing?.id ?? Date.now().toString(),
      name,
      date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      parts: activeParts,
      kerfMm: activeKerfMm,
      status: preservedProjectStatus(existing),
      pauseReason: existing?.status === 'paused' ? existing.pauseReason : undefined,
      description: descTrim ? descTrim : existing?.description,
      difficulty: existing?.difficulty,
      cuttingPlan: plan,
      completedCutOps,
    };

    const nextSaved =
      existingIdx >= 0
        ? savedProjects.map((p, i) => (i === existingIdx ? projectData : p))
        : [projectData, ...savedProjects];

    set({
      savedProjects: nextSaved,
      activeCuttingPlan: plan,
      cloudRevision: cloudRevision + 1,
    });
  },

  clearActiveCuttingPlan: () =>
    set((state) => ({
      ...invalidatePlanForPartsChange(state),
    })),

  saveCurrentProject: () => {
    const {
      activeProjectName,
      activeProjectDescription,
      activeParts,
      activeKerfMm,
      savedProjects,
      activeCuttingPlan,
      completedOperations,
      cloudRevision,
    } = get();
    if (!activeProjectName.trim() || activeParts.length === 0) return;

    const existingIdx = savedProjects.findIndex(
      (p) => p.name.toLowerCase() === activeProjectName.trim().toLowerCase()
    );

    const existing = existingIdx >= 0 ? savedProjects[existingIdx] : undefined;
    const name = activeProjectName.trim();
    const descTrim = activeProjectDescription?.trim();
    const prefix = `${name}-`;
    const completedCutOps = completedOperations.filter((op) => op.startsWith(prefix));
    const projectData: SavedProject = {
      id: existing?.id ?? Date.now().toString(),
      name,
      date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      parts: activeParts,
      kerfMm: activeKerfMm,
      status: preservedProjectStatus(existing),
      pauseReason: existing?.status === 'paused' ? existing.pauseReason : undefined,
      description: descTrim !== undefined ? (descTrim || undefined) : existing?.description,
      difficulty: existing?.difficulty,
      cuttingPlan: activeCuttingPlan || undefined,
      completedCutOps,
    };

    const nextSaved =
      existingIdx >= 0
        ? savedProjects.map((p, i) => (i === existingIdx ? projectData : p))
        : [projectData, ...savedProjects];

    // Keep the project open after save so you can generate cuts / continue working.
    set({
      savedProjects: nextSaved,
      activeProjectName: projectData.name,
      activeParts,
      activeKerfMm,
      activeCuttingPlan: activeCuttingPlan || null,
      cloudRevision: cloudRevision + 1,
    });
  },

  pauseActiveProject: (reason) => {
    const {
      activeProjectName,
      activeProjectDescription,
      activeParts,
      activeKerfMm,
      savedProjects,
      activeCuttingPlan,
      completedOperations,
      defaultKerfMm,
      cloudRevision,
    } = get();
    const name = activeProjectName.trim();
    if (!name || name.toLowerCase() === 'new project') {
      return { ok: false, message: 'Name the project before pausing it.' };
    }
    if (activeParts.length === 0) {
      return { ok: false, message: 'Add at least one part before pausing.' };
    }

    const existingIdx = savedProjects.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
    const existing = existingIdx >= 0 ? savedProjects[existingIdx] : undefined;
    const descTrim = activeProjectDescription?.trim();
    const prefix = `${name}-`;
    const projectData: SavedProject = {
      id: existing?.id ?? Date.now().toString(),
      name,
      date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      parts: activeParts,
      kerfMm: activeKerfMm,
      status: 'paused',
      pauseReason: reason.trim() || 'Waiting for matching stock.',
      description: descTrim ? descTrim : existing?.description,
      difficulty: existing?.difficulty,
      // Drop frozen nest — Resume must re-run against whatever stock is logged later
      cuttingPlan: undefined,
      completedCutOps: [],
    };

    const nextSaved =
      existingIdx >= 0
        ? savedProjects.map((p, i) => (i === existingIdx ? projectData : p))
        : [projectData, ...savedProjects];

    const withoutProjOps = completedOperations.filter((op) => !op.startsWith(prefix));

    set({
      savedProjects: nextSaved,
      activeProjectName: 'New Project',
      activeProjectDescription: '',
      activeParts: [],
      activeKerfMm: defaultKerfMm,
      activeCuttingPlan: null,
      completedOperations: withoutProjOps,
      cloudRevision: cloudRevision + 1,
    });
    return { ok: true, name };
  },

  resumeProject: (id) => {
    const { savedProjects, completedOperations, defaultKerfMm, cloudRevision } = get();
    const proj = savedProjects.find((p) => p.id === id);
    if (!proj) return { ok: false, message: 'Project not found.' };

    // Paused projects were waiting on stock. Drop the frozen plan/cut marks so Generate
    // nests against current inventory (including boards logged while paused).
    const wasPaused = proj.status === 'paused';
    const prefix = `${proj.name}-`;
    const withoutProj = completedOperations.filter((op) => !op.startsWith(prefix));
    const restoredOps = wasPaused
      ? withoutProj
      : [...withoutProj, ...(proj.completedCutOps || [])];

    const nextSaved = savedProjects.map((p) =>
      p.id === id
        ? {
            ...p,
            status: 'active' as const,
            pauseReason: undefined,
            ...(wasPaused
              ? { cuttingPlan: undefined, completedCutOps: [] as string[] }
              : {}),
          }
        : p
    );

    set({
      savedProjects: nextSaved,
      activeProjectName: proj.name,
      activeProjectDescription: proj.description || '',
      activeParts: proj.parts,
      activeKerfMm:
        proj.kerfMm != null && Number.isFinite(proj.kerfMm)
          ? Math.max(0, Number(proj.kerfMm))
          : defaultKerfMm,
      activeCuttingPlan: wasPaused ? null : proj.cuttingPlan || null,
      completedOperations: restoredOps,
      cloudRevision: cloudRevision + 1,
    });
    return { ok: true, name: proj.name };
  },

  createOrOpenProject: (rawName) => {
    const name = rawName.trim();
    if (!name || name.toLowerCase() === 'new project') {
      return { ok: false, message: 'Enter a real project name (e.g. Box, Cutting Board).' };
    }
    const { savedProjects, completedOperations, defaultKerfMm, cloudRevision } = get();
    const existing = savedProjects.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      const prefix = `${existing.name}-`;
      const withoutProj = completedOperations.filter((op) => !op.startsWith(prefix));
      set({
        activeProjectName: existing.name,
        activeProjectDescription: existing.description || '',
        activeParts: existing.parts,
        activeKerfMm:
          existing.kerfMm != null && Number.isFinite(existing.kerfMm)
            ? Math.max(0, Number(existing.kerfMm))
            : defaultKerfMm,
        activeCuttingPlan: existing.cuttingPlan || null,
        completedOperations: [...withoutProj, ...(existing.completedCutOps || [])],
        cloudRevision: cloudRevision + 1,
      });
      return { ok: true, created: false };
    }
    const projectData: SavedProject = {
      id: Date.now().toString(),
      name,
      date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      parts: [],
      kerfMm: defaultKerfMm,
    };
    set({
      savedProjects: [projectData, ...savedProjects],
      activeProjectName: name,
      activeProjectDescription: '',
      activeParts: [],
      activeKerfMm: defaultKerfMm,
      activeCuttingPlan: null,
      cloudRevision: cloudRevision + 1,
    });
    return { ok: true, created: true };
  },

  markBoardsInstalled: (boardIds) => {
    const idSet = new Set(boardIds.filter(Boolean));
    if (idSet.size === 0) return 0;
    const count = get().boards.filter((b) => idSet.has(b.id)).length;
    if (count === 0) return 0;
    set((state) => ({
      boards: state.boards.map((b) =>
        idSet.has(b.id) ? { ...b, status: 'consumed' as BoardStatus, quantity: 0 } : b
      ),
      cloudRevision: state.cloudRevision + 1,
    }));
    return count;
  },

  markProjectCompleted: (projectName, meta) => {
    const name = projectName.trim();
    if (!name || name.toLowerCase() === 'new project') {
      return { ok: false, message: 'Name the project before marking it complete.' };
    }
    const { savedProjects, cloudRevision } = get();
    const idx = savedProjects.findIndex((p) => projectNameKey(p.name) === projectNameKey(name));
    if (idx < 0) {
      return {
        ok: false,
        message: `No saved project named "${name}". Save it under Projects & Cuts first.`,
      };
    }
    const existing = savedProjects[idx];
    const next: SavedProject = {
      ...existing,
      status: 'completed',
      pauseReason: undefined,
      description:
        meta?.description !== undefined
          ? meta.description.trim()
          : existing.description || `Completed build: ${existing.name}.`,
      difficulty: meta?.difficulty || existing.difficulty || 'Beginner',
      date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    };
    set({
      savedProjects: savedProjects.map((p, i) => (i === idx ? next : p)),
      cloudRevision: cloudRevision + 1,
    });
    return { ok: true, id: next.id, name: next.name };
  },

  updateProjectShowcase: (id, meta) => {
    const { savedProjects, activeProjectName, cloudRevision } = get();
    const idx = savedProjects.findIndex((p) => p.id === id);
    if (idx < 0) return { ok: false, message: 'Project not found.' };
    const existing = savedProjects[idx];
    const next: SavedProject = {
      ...existing,
      ...(meta.description !== undefined ? { description: meta.description.trim() } : {}),
      ...(meta.difficulty !== undefined ? { difficulty: meta.difficulty } : {}),
    };
    const isActive = projectNameKey(existing.name) === projectNameKey(activeProjectName);
    set({
      savedProjects: savedProjects.map((p, i) => (i === idx ? next : p)),
      ...(isActive && meta.description !== undefined
        ? { activeProjectDescription: meta.description.trim() }
        : {}),
      cloudRevision: cloudRevision + 1,
    });
    return { ok: true };
  },

  syncActiveProjectToLibrary: () => {
    const {
      activeProjectName,
      activeProjectDescription,
      activeParts,
      activeKerfMm,
      activeCuttingPlan,
      savedProjects,
      completedOperations,
      cloudRevision,
    } = get();
    const name = activeProjectName.trim();
    if (!name || name.toLowerCase() === 'new project' || activeParts.length === 0) return;

    const existingIdx = savedProjects.findIndex(
      (p) => projectNameKey(p.name) === projectNameKey(name)
    );
    const existing = existingIdx >= 0 ? savedProjects[existingIdx] : undefined;
    const descTrim = activeProjectDescription?.trim();
    const prefix = `${name}-`;
    const fromOps = completedOperations.filter((op) => op.startsWith(prefix));
    const projectData: SavedProject = {
      id: existing?.id ?? Date.now().toString(),
      name,
      date:
        existing?.date ||
        new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      parts: activeParts,
      kerfMm: activeKerfMm,
      status: preservedProjectStatus(existing),
      pauseReason: existing?.status === 'paused' ? existing.pauseReason : undefined,
      description: descTrim ? descTrim : existing?.description,
      difficulty: existing?.difficulty || 'Beginner',
      // Workbench plan is source of truth — never resurrect a cleared nest from the library copy
      cuttingPlan: activeCuttingPlan || undefined,
      completedCutOps: fromOps,
    };

    // Skip bump if nothing meaningful changed (avoid save loops)
    if (
      existing &&
      existing.parts.length === projectData.parts.length &&
      partsFingerprint(existing.parts) === partsFingerprint(projectData.parts) &&
      (existing.completedCutOps?.length || 0) === (projectData.completedCutOps?.length || 0) &&
      existing.difficulty === projectData.difficulty &&
      (existing.description || '') === (projectData.description || '') &&
      existing.status === projectData.status &&
      Boolean(existing.cuttingPlan?.placements?.length) ===
        Boolean(projectData.cuttingPlan?.placements?.length)
    ) {
      return;
    }

    const nextSaved =
      existingIdx >= 0
        ? savedProjects.map((p, i) => (i === existingIdx ? projectData : p))
        : [projectData, ...savedProjects];

    set({
      savedProjects: nextSaved,
      cloudRevision: cloudRevision + 1,
    });
  },

  loadProject: (id, options) => {
    const state = get();
    const proj = state.savedProjects.find((p) => p.id === id);
    if (!proj) return;
    const prefix = `${proj.name}-`;
    const withoutProj = state.completedOperations.filter((op) => !op.startsWith(prefix));
    const plan = proj.cuttingPlan || null;
    const partsFp = partsFingerprint(proj.parts);
    const planMatchesParts =
      Boolean(plan?.placements?.length) &&
      (!plan?.partsFingerprint || plan.partsFingerprint === partsFp);
    // Drop nests that belong to an older cut list (species / size edits)
    const activeCuttingPlan = planMatchesParts
      ? { ...plan!, partsFingerprint: partsFp }
      : null;
    set({
      activeProjectName: proj.name,
      activeProjectDescription: proj.description || '',
      activeParts: proj.parts,
      activeKerfMm:
        proj.kerfMm != null && Number.isFinite(proj.kerfMm)
          ? Math.max(0, Number(proj.kerfMm))
          : state.defaultKerfMm,
      activeCuttingPlan,
      completedOperations: [...withoutProj, ...(proj.completedCutOps || [])],
      revealSavedCuttingSheets: Boolean(options?.revealSheets && proj.parts.length > 0),
      cloudRevision: state.cloudRevision + 1,
    });
  },

  openProjectWithCuttingSheets: (id) => {
    const proj = get().savedProjects.find((p) => p.id === id);
    if (!proj) return { ok: false, message: 'Project not found.' };
    const hasPlan = Boolean(proj.cuttingPlan?.placements?.length);
    get().loadProject(id, { revealSheets: true });
    const restored = Boolean(get().activeCuttingPlan?.placements?.length);
    // Always expand cut sheets when the project has parts (restore plan or nest fresh)
    if (get().activeParts.length > 0) {
      set({ revealSavedCuttingSheets: true });
    }
    return {
      ok: true,
      name: proj.name,
      hasPlan: hasPlan || restored,
    };
  },

  clearRevealSavedCuttingSheets: () => set({ revealSavedCuttingSheets: false }),

  deleteProject: (id) => {
    set((state) => {
      const target = state.savedProjects.find((p) => p.id === id);
      const isDeletingActive =
        target && projectNameKey(target.name) === projectNameKey(state.activeProjectName);
      const prefix = target ? `${target.name.trim()}-` : '';
      return {
        savedProjects: state.savedProjects.filter((p) => p.id !== id),
        pendingDeletedProjectIds: state.pendingDeletedProjectIds.includes(id)
          ? state.pendingDeletedProjectIds
          : [...state.pendingDeletedProjectIds, id],
        ...(isDeletingActive
          ? {
              activeProjectName: 'New Project',
              activeProjectDescription: '',
              activeParts: [],
              activeKerfMm: state.defaultKerfMm,
              activeCuttingPlan: null,
              revealSavedCuttingSheets: false,
            }
          : {}),
        ...(prefix
          ? {
              completedOperations: state.completedOperations.filter(
                (op) => !op.startsWith(prefix)
              ),
            }
          : {}),
        cloudRevision: state.cloudRevision + 1,
      };
    });
  },

  startNewProject: () => {
    set((state) => ({
      activeProjectName: 'New Project',
      activeProjectDescription: '',
      activeParts: [],
      activeKerfMm: state.defaultKerfMm,
      activeCuttingPlan: null,
      revealSavedCuttingSheets: false,
      cloudRevision: state.cloudRevision + 1,
    }));
  },

  resetWorkshopData: () =>
    set((state) => ({
      ...FRESH_STATE,
      // Keep shop prefs; wipe boards / projects / cut progress
      storageLocations: state.storageLocations.length
        ? state.storageLocations
        : [...DEFAULT_LOCATIONS],
      lumberTypes: state.lumberTypes.length
        ? state.lumberTypes
        : [...DEFAULT_LUMBER_TYPES],
      offcutSettings: state.offcutSettings,
      unitSystem: state.unitSystem,
      defaultKerfMm: state.defaultKerfMm,
      activeKerfMm: state.defaultKerfMm,
      cloudUserId: state.cloudUserId,
      cloudReady: state.cloudReady,
      cloudSaving: false,
      cutHistory: [],
      pendingCloudEmptyWipe: true,
      cloudRevision: state.cloudRevision + 1,
    })),

  restoreRecoveredProjects: () => {
    const recovered = buildRecoveredWorkshopProjects();
    const { savedProjects, cloudRevision } = get();
    const existingNames = new Set(savedProjects.map((p) => projectNameKey(p.name)));
    const existingIds = new Set(savedProjects.map((p) => String(p.id)));
    const toAdd = recovered.filter(
      (p) => !existingNames.has(projectNameKey(p.name)) && !existingIds.has(String(p.id))
    );
    const skipped = recovered.length - toAdd.length;
    if (toAdd.length === 0) {
      return { ok: true as const, added: 0, skipped };
    }
    set({
      savedProjects: [...toAdd, ...savedProjects],
      cloudRevision: cloudRevision + 1,
    });
    return { ok: true as const, added: toAdd.length, skipped };
  },

  mergeBackupIntoWorkshop: (payload) => {
    const state = get();
    const incomingBoards = Array.isArray(payload.boards) ? payload.boards : [];
    const incomingProjects = Array.isArray(payload.savedProjects) ? payload.savedProjects : [];

    const existingBoardIds = new Set(state.boards.map((b) => String(b.id)));
    const existingBoardTags = new Set(state.boards.map((b) => (b.tagId || '').toUpperCase()));
    const boardsToAdd = incomingBoards.filter(
      (b) =>
        b &&
        b.id &&
        !existingBoardIds.has(String(b.id)) &&
        !existingBoardTags.has((b.tagId || '').toUpperCase())
    );

    const existingProjIds = new Set(state.savedProjects.map((p) => String(p.id)));
    const existingProjNames = new Set(state.savedProjects.map((p) => projectNameKey(p.name)));
    const projectsToAdd = incomingProjects.filter(
      (p) =>
        p &&
        p.id &&
        !existingProjIds.has(String(p.id)) &&
        !existingProjNames.has(projectNameKey(p.name))
    );

    const mergedLocations = Array.from(
      new Set([...(state.storageLocations || []), ...(payload.storageLocations || [])])
    ).filter(Boolean);

    const mergedBoards = [...boardsToAdd, ...state.boards];
    const mergedProjects = [...projectsToAdd, ...state.savedProjects];
    const mergedLumberTypes = mergeLumberTypesWithStock(
      [...(state.lumberTypes || []), ...(payload.lumberTypes || [])],
      mergedBoards.map((b) => b.species)
    );

    if (
      boardsToAdd.length === 0 &&
      projectsToAdd.length === 0 &&
      mergedLocations.length === state.storageLocations.length
    ) {
      return { addedBoards: 0, addedProjects: 0 };
    }

    set({
      boards: mergedBoards,
      savedProjects: mergedProjects,
      storageLocations: mergedLocations.length ? mergedLocations : [...DEFAULT_LOCATIONS],
      lumberTypes: mergedLumberTypes,
      cloudRevision: state.cloudRevision + 1,
    });

    return { addedBoards: boardsToAdd.length, addedProjects: projectsToAdd.length };
  },
}));
