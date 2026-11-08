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
    const rawOps = Array.isArray(row.completed_cut_ops)
      ? (row.completed_cut_ops as string[])
      : [];
    // Support embedded status/pause metadata inside completed_cut_ops when DB lacks status/pause_reason columns
    const statusSentinel = rawOps.find((op) => typeof op === 'string' && op.startsWith('__status:'));
    const pauseSentinel = rawOps.find((op) => typeof op === 'string' && op.startsWith('__pause:'));
    const completedCutOps = rawOps.filter(
      (op) => typeof op === 'string' && !op.startsWith('__status:') && !op.startsWith('__pause:')
    );
    const statusRaw = String(
      row.status || (statusSentinel ? statusSentinel.slice('__status:'.length) : 'active')
    ).toLowerCase();
    const status =
      statusRaw === 'paused'
        ? ('paused' as const)
        : statusRaw === 'completed'
          ? ('completed' as const)
          : ('active' as const);
    const pauseReason = row.pause_reason
      ? String(row.pause_reason)
      : pauseSentinel
        ? pauseSentinel.slice('__pause:'.length)
        : undefined;
    const cuttingPlan =
      row.cutting_plan && typeof row.cutting_plan === 'object'
        ? (row.cutting_plan as SavedCuttingPlan)
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
      ...(pauseReason ? { pauseReason } : {}),
      ...(row.description ? { description: String(row.description) } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(cuttingPlan ? { cuttingPlan } : {}),
      ...(completedCutOps.length > 0 ? { completedCutOps } : {}),
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

export async function saveBoards(
  userId: string,
  boards: Board[],
  options?: { allowEmptyWipe?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' };

  // Never wipe cloud inventory from an empty local snapshot (same failure mode as projects)
  if (boards.length === 0) {
    if (!options?.allowEmptyWipe) return { ok: true };
    const { error } = await supabase.from('boards').delete().eq('user_id', userId);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  const byId = new Map<string, Board>();
  for (const b of boards) {
    if (!b?.id) continue;
    byId.set(String(b.id), b);
  }
  const unique = Array.from(byId.values());
  const rows = unique.map((b) => boardToRow(userId, b));

  const isConflictTargetMismatch = (msg: string) =>
    /no unique or exclusion constraint matching the ON CONFLICT/i.test(msg);

  const tryUpsert = async () => {
    for (const conflict of ['user_id,id', 'id'] as const) {
      const res = await supabase.from('boards').upsert(rows, { onConflict: conflict });
      if (!res.error) return null;
      if (!isConflictTargetMismatch(res.error.message)) return res.error;
    }
    return { message: 'ON CONFLICT target mismatch' } as { message: string };
  };

  const mergeRows = async () => {
    for (const row of rows) {
      const id = String(row.id);
      const existing = await supabase
        .from('boards')
        .select('id')
        .eq('user_id', userId)
        .eq('id', id)
        .maybeSingle();
      if (existing.error) return existing.error;
      if (existing.data) {
        const { id: _id, user_id: _uid, created_at: _c, ...patch } = row;
        const upd = await supabase.from('boards').update(patch).eq('user_id', userId).eq('id', id);
        if (upd.error) return upd.error;
      } else {
        const ins = await supabase.from('boards').insert(row);
        if (ins.error) return ins.error;
      }
    }
    return null;
  };

  let writeError = await tryUpsert();
  if (writeError && isConflictTargetMismatch(writeError.message)) {
    writeError = await mergeRows();
  }
  if (writeError) return { ok: false, message: writeError.message };

  // Upsert only — never orphan-delete. Explicit deletes go through deleteBoardRows.
  return { ok: true };
}

/** Delete specific boards the user confirmed removing (never bulk/orphan). */
export async function deleteBoardRows(
  userId: string,
  boardIds: string[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' };
  const ids = Array.from(new Set(boardIds.map(String).filter(Boolean)));
  if (ids.length === 0) return { ok: true };
  const { error } = await supabase.from('boards').delete().eq('user_id', userId).in('id', ids);
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

function dedupeProjectsById(projects: SavedProject[]): SavedProject[] {
  const byId = new Map<string, SavedProject>();
  for (const p of projects) {
    if (!p?.id) continue;
    byId.set(String(p.id), p);
  }
  return Array.from(byId.values());
}

function projectStatusSql(status: SavedProject['status'] | undefined): string {
  if (status === 'paused') return 'paused';
  if (status === 'completed') return 'completed';
  return 'active';
}

export async function saveProjects(
  userId: string,
  projects: SavedProject[],
  options?: { allowEmptyWipe?: boolean }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' };

  if (!userId) return { ok: false, message: 'Missing user id for project save.' };

  const unique = dedupeProjectsById(projects);

  // Never wipe the cloud library from an empty local snapshot (recoverable data loss)
  if (unique.length === 0) {
    if (!options?.allowEmptyWipe) return { ok: true };
    const { error } = await supabase.from('saved_projects').delete().eq('user_id', userId);
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }

  // Always stamp the signed-in owner — projects stay personal to that user
  const baseRows = unique.map((p) => ({
    id: p.id,
    user_id: userId,
    name: p.name,
    project_date: p.date,
    parts: p.parts,
  }));

  const encodeOpsWithMeta = (p: SavedProject): string[] => {
    const clean = (p.completedCutOps || []).filter(
      (op) => typeof op === 'string' && !op.startsWith('__status:') && !op.startsWith('__pause:')
    );
    const st = projectStatusSql(p.status);
    const meta: string[] = [`__status:${st}`];
    if (st === 'paused' && p.pauseReason?.trim()) {
      meta.push(`__pause:${p.pauseReason.trim()}`);
    }
    return [...clean, ...meta];
  };

  const withExtras = baseRows.map((row, i) => ({
    ...row,
    kerf_mm: unique[i].kerfMm ?? null,
    status: projectStatusSql(unique[i].status),
    pause_reason: unique[i].pauseReason ?? null,
    description: unique[i].description?.trim() ? unique[i].description.trim() : null,
    difficulty: unique[i].difficulty ?? null,
    cutting_plan: unique[i].cuttingPlan ?? null,
    completed_cut_ops: encodeOpsWithMeta(unique[i]),
  }));

  const withoutStatusPauseCols = baseRows.map((row, i) => ({
    ...row,
    kerf_mm: unique[i].kerfMm ?? null,
    description: unique[i].description?.trim() ? unique[i].description.trim() : null,
    difficulty: unique[i].difficulty ?? null,
    cutting_plan: unique[i].cuttingPlan ?? null,
    completed_cut_ops: encodeOpsWithMeta(unique[i]),
  }));

  const isMissingCol = (msg: string) =>
    /kerf_mm|status|pause_reason|description|difficulty|cutting_plan|completed_cut_ops|schema cache/i.test(
      msg
    );
  const isConflictTargetMismatch = (msg: string) =>
    /no unique or exclusion constraint matching the ON CONFLICT/i.test(msg);

  /**
   * Prefer composite (user_id,id) so one user's project id can never overwrite another's.
   * Fall back to merge-by-(user_id,id) only — never upsert onConflict: 'id' alone.
   */
  const tryUpsert = async (rows: Record<string, unknown>[]) => {
    for (const row of rows) {
      if (String(row.user_id || '') !== userId) {
        return { message: 'Refusing to save project under a different user id.' };
      }
    }
    const res = await supabase.from('saved_projects').upsert(rows, { onConflict: 'user_id,id' });
    if (!res.error) return null;
    if (!isConflictTargetMismatch(res.error.message)) return res.error;
    return { message: 'ON CONFLICT target mismatch', code: '42P10' } as {
      message: string;
      code?: string;
    };
  };

  const mergeRows = async (rows: Record<string, unknown>[]) => {
    for (const row of rows) {
      const id = String(row.id);
      const existing = await supabase
        .from('saved_projects')
        .select('id')
        .eq('user_id', userId)
        .eq('id', id)
        .maybeSingle();
      if (existing.error) return existing.error;
      if (existing.data) {
        const { id: _id, user_id: _uid, ...patch } = row;
        const upd = await supabase
          .from('saved_projects')
          .update(patch)
          .eq('user_id', userId)
          .eq('id', id);
        if (upd.error) return upd.error;
      } else {
        const ins = await supabase.from('saved_projects').insert(row);
        if (ins.error) return ins.error;
      }
    }
    return null;
  };

  const writePayloads: Record<string, unknown>[][] = [
    withExtras,
    withoutStatusPauseCols,
    withoutStatusPauseCols.map((row) => {
      const { cutting_plan: _c, completed_cut_ops: _o, ...rest } = row;
      return rest;
    }),
    withExtras.map((row) => {
      const { cutting_plan: _c, completed_cut_ops: _o, ...rest } = row;
      return rest;
    }),
    baseRows.map((row, i) => ({
      ...row,
      kerf_mm: unique[i].kerfMm ?? null,
      description: unique[i].description?.trim() ? unique[i].description.trim() : null,
      difficulty: unique[i].difficulty ?? null,
    })),
    baseRows.map((row, i) => ({
      ...row,
      kerf_mm: unique[i].kerfMm ?? null,
    })),
    baseRows,
  ];

  let writeError: { message: string } | null = null;
  let savedPayload: Record<string, unknown>[] | null = null;

  for (const payload of writePayloads) {
    writeError = await tryUpsert(payload);
    if (!writeError) {
      savedPayload = payload;
      break;
    }
    if (isConflictTargetMismatch(writeError.message)) {
      writeError = await mergeRows(payload);
      if (!writeError) {
        savedPayload = payload;
        break;
      }
    }
    if (!isMissingCol(writeError.message) && !isConflictTargetMismatch(writeError.message)) {
      return { ok: false, message: writeError.message };
    }
  }

  if (writeError || !savedPayload) {
    return { ok: false, message: writeError?.message || 'Failed to save projects.' };
  }

  // Upsert only — never orphan-delete. Explicit deletes go through deleteProjectRows.
  return { ok: true };
}

/** Delete specific projects the user confirmed removing (never bulk/orphan). */
export async function deleteProjectRows(
  userId: string,
  projectIds: string[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' };
  const ids = Array.from(new Set(projectIds.map(String).filter(Boolean)));
  if (ids.length === 0) return { ok: true };
  const { error } = await supabase
    .from('saved_projects')
    .delete()
    .eq('user_id', userId)
    .in('id', ids);
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
  snapshot: WorkspaceSnapshot,
  options?: {
    allowEmptyWipe?: boolean;
    /** Only IDs the user explicitly confirmed deleting in the UI. */
    deletedBoardIds?: string[];
    deletedProjectIds?: string[];
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const [boards, projects, prefs, locs] = await Promise.all([
    saveBoards(userId, snapshot.boards, options),
    saveProjects(userId, snapshot.savedProjects, options),
    savePreferences(userId, snapshot),
    pushStorageLocations(userId, snapshot.storageLocations),
  ]);

  if (!boards.ok) return boards;
  if (!projects.ok) return projects;
  if (!prefs.ok) return prefs;
  if (!locs.ok) return { ok: false, message: locs.message };

  // Explicit user-confirmed deletes only (never inferred from snapshot diff)
  if (options?.deletedBoardIds?.length) {
    const del = await deleteBoardRows(userId, options.deletedBoardIds);
    if (!del.ok) return del;
  }
  if (options?.deletedProjectIds?.length) {
    const del = await deleteProjectRows(userId, options.deletedProjectIds);
    if (!del.ok) return del;
  }

  // Best-effort daily snapshot in Supabase workspace_backups (if migration applied)
  void saveCloudDailyBackup(userId, snapshot);

  return { ok: true };
}

/**
 * Best-effort daily snapshot in `public.workspace_backups`.
 * Never blocks or fails normal saves if the table isn't created yet.
 */
export async function saveCloudDailyBackup(
  userId: string,
  snapshot: WorkspaceSnapshot
): Promise<void> {
  if (!userId) return;
  if (snapshot.boards.length === 0 && snapshot.savedProjects.length === 0) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const now = new Date();
  const backupDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  try {
    await supabase.from('workspace_backups').upsert(
      {
        user_id: userId,
        backup_date: backupDate,
        board_count: snapshot.boards.length,
        project_count: snapshot.savedProjects.length,
        snapshot,
        updated_at: now.toISOString(),
      },
      { onConflict: 'user_id,backup_date' }
    );

    // Keep only the last 7 cloud daily rows for this user
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 6);
    const cutoffDate = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(
      cutoff.getDate()
    ).padStart(2, '0')}`;
    await supabase
      .from('workspace_backups')
      .delete()
      .eq('user_id', userId)
      .lt('backup_date', cutoffDate);
  } catch {
    /* ignore if table does not exist yet */
  }
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
