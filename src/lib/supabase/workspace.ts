import { getSupabase } from '@/lib/supabase/client';
import {
  DEFAULT_KERF_MM,
  DEFAULT_LOCATIONS,
  DEFAULT_LUMBER_TYPES,
  type Board,
  type CutPart,
  type OffcutSettings,
  type SavedCuttingPlan,
  type SavedProject,
  type UnitSystem,
} from '@/lib/store';
import { normalizeDefects } from '@/lib/defects';
import { mergeLumberTypesWithStock, normalizeLumberTypes } from '@/lib/lumber-types';
import {
  pullStorageLocations,
  pushStorageLocations,
} from '@/lib/supabase/storageLocations';

export type WorkspaceSnapshot = {
  boards: Board[];
  storageLocations: string[];
  lumberTypes: string[];
  savedProjects: SavedProject[];
  activeProjectName: string;
  activeParts: CutPart[];
  completedOperations: string[];
  offcutSettings: OffcutSettings;
  unitSystem: UnitSystem;
  defaultKerfMm: number;
  activeKerfMm: number;
  activeCuttingPlan: SavedCuttingPlan | null;
};

export type WorkspaceResult =
  | { ok: true; data: WorkspaceSnapshot; message: string }
  | { ok: false; message: string };

function rowToBoard(row: Record<string, unknown>): Board {
  return {
    id: String(row.id),
    tagId: String(row.tag_id),
    species: String(row.species),
    source: String(row.source || ''),
    length: Number(row.length_mm),
    width: Number(row.width_mm),
    thickness: Number(row.thickness_mm),
    quantity: Math.max(1, Number(row.quantity) || 1),
    location: String(row.location || 'Workbench'),
    createdAt: String(row.created_at || new Date().toISOString()),
    status: (row.status as Board['status']) || 'active',
    classification: (row.classification as Board['classification']) || undefined,
    parentBoardId: row.parent_board_id ? String(row.parent_board_id) : undefined,
    originProject: row.origin_project ? String(row.origin_project) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    defects: normalizeDefects(row.defects),
    defectNotes: row.defect_notes ? String(row.defect_notes) : undefined,
    unitsIssued: Math.max(0, Number(row.units_issued) || 0),
  };
}

function boardToRow(userId: string, board: Board) {
  return {
    id: board.id,
    user_id: userId,
    tag_id: board.tagId,
    species: board.species,
    source: board.source,
    length_mm: board.length,
    width_mm: board.width,
    thickness_mm: board.thickness,
    quantity: board.quantity || 1,
    location: board.location,
    status: board.status,
    classification: board.classification ?? null,
    parent_board_id: board.parentBoardId ?? null,
    origin_project: board.originProject ?? null,
    notes: board.notes ?? null,
    defects: normalizeDefects(board.defects),
    defect_notes: board.defectNotes?.trim() ? board.defectNotes.trim() : null,
    units_issued: Math.max(0, Number(board.unitsIssued) || 0),
    created_at: board.createdAt || new Date().toISOString(),
  };
}

export async function loadWorkspace(userId: string): Promise<WorkspaceResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' };

  const [locs, boardsRes, projectsRes, prefsRes] = await Promise.all([
    pullStorageLocations(userId),
    supabase.from('boards').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('saved_projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  if (!locs.ok) return { ok: false, message: locs.message };
  if (boardsRes.error) return { ok: false, message: boardsRes.error.message };
  if (projectsRes.error) return { ok: false, message: projectsRes.error.message };
  if (prefsRes.error) return { ok: false, message: prefsRes.error.message };

  const prefs = prefsRes.data;
  if (!prefs) {
    await supabase.from('user_preferences').upsert({ user_id: userId, unit_system: 'metric' });
  }

  const defaultKerfMm = Math.max(
    0,
    Number(prefs?.default_kerf_mm ?? DEFAULT_KERF_MM) || DEFAULT_KERF_MM
  );
  const activeKerfMm = Math.max(
    0,
    Number(prefs?.active_kerf_mm ?? defaultKerfMm) || defaultKerfMm
  );

  const savedProjects: SavedProject[] = (projectsRes.data || []).map((row) => {
    const rowKerf = row.kerf_mm;
    const statusRaw = String(row.status || 'active').toLowerCase();
    const status =
      statusRaw === 'paused'
        ? ('paused' as const)
        : statusRaw === 'completed'
          ? ('completed' as const)
          : ('active' as const);
    const cuttingPlan =
      row.cutting_plan && typeof row.cutting_plan === 'object'
        ? (row.cutting_plan as SavedCuttingPlan)
        : undefined;
    const completedCutOps = Array.isArray(row.completed_cut_ops)
      ? (row.completed_cut_ops as string[])
      : undefined;
    const difficultyRaw = String(row.difficulty || '').trim();
    const difficulty =
      difficultyRaw === 'Beginner' ||
      difficultyRaw === 'Intermediate' ||
      difficultyRaw === 'Advanced' ||
      difficultyRaw === 'Expert'
        ? difficultyRaw
        : undefined;
    return {
      id: String(row.id),
      name: String(row.name),
      date: String(row.project_date || ''),
      parts: Array.isArray(row.parts) ? (row.parts as CutPart[]) : [],
      ...(rowKerf != null && Number.isFinite(Number(rowKerf))
        ? { kerfMm: Math.max(0, Number(rowKerf)) }
        : {}),
      status,
      ...(row.pause_reason ? { pauseReason: String(row.pause_reason) } : {}),
      ...(row.description ? { description: String(row.description) } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(cuttingPlan ? { cuttingPlan } : {}),
      ...(completedCutOps ? { completedCutOps } : {}),
    };
  });

  const activeProjectName = String(prefs?.active_project_name || 'New Project');
  const activeSaved = savedProjects.find(
    (p) => p.name.toLowerCase() === activeProjectName.trim().toLowerCase()
  );

  const boards = (boardsRes.data || []).map((row) => rowToBoard(row as Record<string, unknown>));
  const lumberTypes = mergeLumberTypesWithStock(
    Array.isArray(prefs?.lumber_types) ? prefs.lumber_types : [...DEFAULT_LUMBER_TYPES],
    boards.map((b) => b.species)
  );

  return {
    ok: true,
    message: 'Loaded workshop from Supabase.',
    data: {
      boards,
      storageLocations: locs.locations.length ? locs.locations : [...DEFAULT_LOCATIONS],
      lumberTypes,
      savedProjects,
      activeProjectName,
      activeParts: Array.isArray(prefs?.active_parts) ? (prefs.active_parts as CutPart[]) : [],
      completedOperations: Array.isArray(prefs?.completed_operations)
        ? (prefs.completed_operations as string[])
        : [],
      offcutSettings: {
        minLength: Number(prefs?.offcut_min_length ?? 100),
        minWidth: Number(prefs?.offcut_min_width ?? 100),
      },
      unitSystem: prefs?.unit_system === 'imperial' ? 'imperial' : 'metric',
      defaultKerfMm,
      activeKerfMm,
      activeCuttingPlan: activeSaved?.cuttingPlan || null,
    },
  };
}

export async function saveBoards(userId: string, boards: Board[]): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' };

  const { error: delError } = await supabase.from('boards').delete().eq('user_id', userId);
  if (delError) return { ok: false, message: delError.message };

  if (boards.length === 0) return { ok: true };

  const { error } = await supabase.from('boards').insert(boards.map((b) => boardToRow(userId, b)));
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function saveProjects(
  userId: string,
  projects: SavedProject[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' };

  const { error: delError } = await supabase.from('saved_projects').delete().eq('user_id', userId);
  if (delError) return { ok: false, message: delError.message };

  if (projects.length === 0) return { ok: true };

  const baseRows = projects.map((p) => ({
    id: p.id,
    user_id: userId,
    name: p.name,
    project_date: p.date,
    parts: p.parts,
  }));

  // Prefer kerf + pause + cutting plan + showcase columns when they exist; fall back if schema is behind
  const withExtras = baseRows.map((row, i) => ({
    ...row,
    kerf_mm: projects[i].kerfMm ?? null,
    status:
      projects[i].status === 'paused'
        ? 'paused'
        : projects[i].status === 'completed'
          ? 'completed'
          : 'active',
    pause_reason: projects[i].pauseReason ?? null,
    description: projects[i].description ?? null,
    difficulty: projects[i].difficulty ?? null,
    cutting_plan: projects[i].cuttingPlan ?? null,
    completed_cut_ops: projects[i].completedCutOps ?? [],
  }));

  const first = await supabase.from('saved_projects').insert(withExtras);
  if (!first.error) return { ok: true };

  const missingCols =
    /kerf_mm|status|pause_reason|description|difficulty|cutting_plan|completed_cut_ops|schema cache/i.test(
      first.error.message
    );
  if (!missingCols) return { ok: false, message: first.error.message };

  // Prefer keeping cutting plans even if newer showcase columns are missing
  const withPlan = baseRows.map((row, i) => ({
    ...row,
    kerf_mm: projects[i].kerfMm ?? null,
    status:
      projects[i].status === 'paused'
        ? 'paused'
        : projects[i].status === 'completed'
          ? 'completed'
          : 'active',
    pause_reason: projects[i].pauseReason ?? null,
    cutting_plan: projects[i].cuttingPlan ?? null,
    completed_cut_ops: projects[i].completedCutOps ?? [],
  }));
  const planAttempt = await supabase.from('saved_projects').insert(withPlan);
  if (!planAttempt.error) return { ok: true };

  const withKerfOnly = baseRows.map((row, i) => ({
    ...row,
    kerf_mm: projects[i].kerfMm ?? null,
  }));
  const second = await supabase.from('saved_projects').insert(withKerfOnly);
  if (!second.error) return { ok: true };

  const { error } = await supabase.from('saved_projects').insert(baseRows);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function savePreferences(
  userId: string,
  snapshot: Pick<
    WorkspaceSnapshot,
    | 'unitSystem'
    | 'offcutSettings'
    | 'activeProjectName'
    | 'activeParts'
    | 'completedOperations'
    | 'defaultKerfMm'
    | 'activeKerfMm'
    | 'lumberTypes'
  >
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' };

  const lumberTypes = normalizeLumberTypes(
    snapshot.lumberTypes?.length ? snapshot.lumberTypes : [...DEFAULT_LUMBER_TYPES]
  );

  const basePrefs = {
    user_id: userId,
    unit_system: snapshot.unitSystem,
    offcut_min_length: snapshot.offcutSettings.minLength,
    offcut_min_width: snapshot.offcutSettings.minWidth,
    active_project_name: snapshot.activeProjectName,
    active_parts: snapshot.activeParts,
    completed_operations: snapshot.completedOperations,
    updated_at: new Date().toISOString(),
  };

  const withKerfAndLumber = {
    ...basePrefs,
    default_kerf_mm: snapshot.defaultKerfMm,
    active_kerf_mm: snapshot.activeKerfMm,
    lumber_types: lumberTypes,
  };

  const first = await supabase
    .from('user_preferences')
    .upsert(withKerfAndLumber, { onConflict: 'user_id' });
  if (!first.error) return { ok: true };

  const msg = first.error.message || '';
  const missingLumber = /lumber_types/i.test(msg) || /schema cache/i.test(msg);
  if (missingLumber) {
    const withKerfOnly = {
      ...basePrefs,
      default_kerf_mm: snapshot.defaultKerfMm,
      active_kerf_mm: snapshot.activeKerfMm,
    };
    const second = await supabase
      .from('user_preferences')
      .upsert(withKerfOnly, { onConflict: 'user_id' });
    if (!second.error) return { ok: true };

    const missingKerf =
      /kerf_mm|default_kerf|active_kerf/i.test(second.error.message) ||
      /schema cache/i.test(second.error.message);
    if (!missingKerf) return { ok: false, message: second.error.message };

    const { error } = await supabase
      .from('user_preferences')
      .upsert(basePrefs, { onConflict: 'user_id' });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  const missingKerf =
    /kerf_mm|default_kerf|active_kerf/i.test(msg) || /schema cache/i.test(msg);
  if (!missingKerf) return { ok: false, message: msg };

  const { error } = await supabase
    .from('user_preferences')
    .upsert(basePrefs, { onConflict: 'user_id' });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function saveWorkspace(
  userId: string,
  snapshot: WorkspaceSnapshot
): Promise<{ ok: true } | { ok: false; message: string }> {
  const [boards, projects, prefs, locs] = await Promise.all([
    saveBoards(userId, snapshot.boards),
    saveProjects(userId, snapshot.savedProjects),
    savePreferences(userId, snapshot),
    pushStorageLocations(userId, snapshot.storageLocations),
  ]);

  if (!boards.ok) return boards;
  if (!projects.ok) return projects;
  if (!prefs.ok) return prefs;
  if (!locs.ok) return { ok: false, message: locs.message };
  return { ok: true };
}

/** Wipe leftover browser inventory keys — workshop data lives in Supabase only. */
export function clearLegacyLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem('timbervault_v2');
    window.localStorage.removeItem('timbervault');
  } catch {
    /* ignore */
  }
}
