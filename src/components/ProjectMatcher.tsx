'use client';

import React, { useMemo, useState } from 'react';
import {
  useAppStore,
  PROJECT_TEMPLATES,
  type CutPart,
  type ProjectDifficulty,
  type ProjectTemplate,
  type SavedProject,
} from '@/lib/store';
import { speciesMatches } from '@/lib/cutting-engine';
import { Sparkles, ArrowRight, Trophy, Pencil, Check, X, FolderOpen, Trash2 } from 'lucide-react';
import { notify, toast } from '@/lib/notify';
import { formatDim, formatDimsLWT, type UnitSystem } from '@/lib/units';

interface ProjectMatcherProps {
  onOpenCutList: () => void;
}

type StockFit = 'READY' | 'ALMOST' | 'NEED STOCK';

const DIFFICULTIES: ProjectDifficulty[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
];

function fitStatus(matchCount: number): StockFit {
  if (matchCount >= 2) return 'READY';
  if (matchCount === 1) return 'ALMOST';
  return 'NEED STOCK';
}

function fitTone(status: StockFit) {
  if (status === 'READY') return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50';
  if (status === 'ALMOST') return 'bg-orange-950/40 text-orange-400 border-orange-800/50';
  return 'bg-gray-800 text-gray-400 border-gray-700';
}

function boardFitsPart(
  board: { species: string; length: number; width: number; thickness: number },
  part: Pick<CutPart, 'species' | 'length' | 'width' | 'thickness'>
) {
  if (!speciesMatches(part.species, board.species)) return false;
  const needT = part.thickness ?? 0;
  const thickOk = needT <= 0 || board.thickness + 0.1 >= needT;
  if (!thickOk) return false;
  const direct = board.length + 0.1 >= part.length && board.width + 0.1 >= part.width;
  const rotated = board.length + 0.1 >= part.width && board.width + 0.1 >= part.length;
  return direct || rotated;
}

function boardFitsTemplate(
  board: { species: string; length: number; width: number; thickness: number; status?: string },
  template: ProjectTemplate
) {
  const speciesOk = template.requiredSpecies.some((req) => speciesMatches(req, board.species));
  if (!speciesOk) return false;
  const fitsDirect =
    board.length + 0.1 >= template.minLength &&
    board.width + 0.1 >= template.minWidth &&
    board.thickness + 0.1 >= template.minThickness;
  const fitsRotated =
    board.length + 0.1 >= template.minWidth &&
    board.width + 0.1 >= template.minLength &&
    board.thickness + 0.1 >= template.minThickness;
  return fitsDirect || fitsRotated;
}

/** Explain why available stock is not counting for this template. */
function explainTemplateStockGap(
  template: ProjectTemplate,
  boards: Array<{
    species: string;
    length: number;
    width: number;
    thickness: number;
    status?: string;
  }>,
  unitSystem: UnitSystem
): string | null {
  const active = boards.filter((b) => (b.status || 'active') === 'active');
  if (active.length === 0) return 'Inventory has no available boards.';

  const speciesHit = active.filter((b) =>
    template.requiredSpecies.some((req) => speciesMatches(req, b.species))
  );
  if (speciesHit.length === 0) {
    return `No ${template.requiredSpecies.join(' / ')} in Available stock.`;
  }

  const thickEnough = speciesHit.filter((b) => b.thickness + 0.1 >= template.minThickness);
  if (thickEnough.length === 0) {
    const thickest = Math.max(...speciesHit.map((b) => b.thickness));
    return `Species match, but thickest is ${formatDim(thickest, unitSystem)} (need ≥ ${formatDim(template.minThickness, unitSystem)}).`;
  }

  const faceOk = thickEnough.filter((b) => {
    const direct = b.length + 0.1 >= template.minLength && b.width + 0.1 >= template.minWidth;
    const rotated = b.length + 0.1 >= template.minWidth && b.width + 0.1 >= template.minLength;
    return direct || rotated;
  });
  if (faceOk.length === 0) {
    return `Species/thickness OK, but none reach ${formatDim(template.minLength, unitSystem)} × ${formatDim(template.minWidth, unitSystem)}.`;
  }
  return null;
}

function projectRequirements(parts: CutPart[]) {
  const species = Array.from(new Set(parts.map((p) => p.species)));
  const minLength = parts.length ? Math.min(...parts.map((p) => p.length)) : 0;
  const minWidth = parts.length ? Math.min(...parts.map((p) => p.width)) : 0;
  const minThickness = parts.length
    ? Math.min(...parts.map((p) => p.thickness ?? 0).filter((t) => t > 0), Infinity)
    : 0;
  return {
    species,
    minLength,
    minWidth,
    minThickness: Number.isFinite(minThickness) ? minThickness : 0,
    pieceCount: parts.reduce((acc, p) => acc + p.quantity, 0),
  };
}

function hasConfirmedWork(project: SavedProject, completedOperations: string[]) {
  if ((project.completedCutOps?.length || 0) > 0) return true;
  if (project.cuttingPlan?.placements?.length) return true;
  const prefix = `${project.name}-`;
  return completedOperations.some((op) => op.startsWith(prefix));
}

export default function ProjectMatcher({ onOpenCutList }: ProjectMatcherProps) {
  const boards = useAppStore((s) => s.boards);
  const unitSystem = useAppStore((s) => s.unitSystem);
  const savedProjects = useAppStore((s) => s.savedProjects);
  const completedOperations = useAppStore((s) => s.completedOperations);
  const setActiveProjectName = useAppStore((s) => s.setActiveProjectName);
  const setActiveParts = useAppStore((s) => s.setActiveParts);
  const setActiveKerfMm = useAppStore((s) => s.setActiveKerfMm);
  const clearActiveCuttingPlan = useAppStore((s) => s.clearActiveCuttingPlan);
  const updateProjectShowcase = useAppStore((s) => s.updateProjectShowcase);
  const markProjectCompleted = useAppStore((s) => s.markProjectCompleted);
  const syncActiveProjectToLibrary = useAppStore((s) => s.syncActiveProjectToLibrary);
  const openProjectWithCuttingSheets = useAppStore((s) => s.openProjectWithCuttingSheets);
  const restoreRecoveredProjects = useAppStore((s) => s.restoreRecoveredProjects);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const defaultKerfMm = useAppStore((s) => s.defaultKerfMm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<ProjectDifficulty>('Beginner');

  // Ensure the open workbench project is listed (e.g. Simple Test Project after cuts)
  React.useEffect(() => {
    syncActiveProjectToLibrary();
  }, [syncActiveProjectToLibrary, savedProjects.length, completedOperations.length]);

  const handleDeleteProjectCard = async (project: SavedProject) => {
    const ok = await notify.confirm({
      title: 'Delete project?',
      message: `Delete "${project.name}" from your saved projects? This cannot be undone.`,
      confirmLabel: 'Delete project',
      danger: true,
    });
    if (!ok) return;
    deleteProject(project.id);
    if (editingId === project.id) setEditingId(null);
    toast.error(`Deleted project "${project.name}".`);
  };

  const activeBoards = boards.filter((b) => b.status === 'active');

  /**
   * Every saved project with a cut list appears here (including Simple Test Project).
   * Confirmed-cut / completed builds are sorted first.
   */
  const workshopProjects = useMemo(() => {
    const list = savedProjects.filter((p) => p.parts.length > 0 && p.status !== 'paused');
    return [...list].sort((a, b) => {
      const aDone = a.status === 'completed' ? 2 : hasConfirmedWork(a, completedOperations) ? 1 : 0;
      const bDone = b.status === 'completed' ? 2 : hasConfirmedWork(b, completedOperations) ? 1 : 0;
      if (bDone !== aDone) return bDone - aDone;
      return a.name.localeCompare(b.name);
    });
  }, [savedProjects, completedOperations]);

  const assessedTemplates = PROJECT_TEMPLATES.map((template) => {
    const matches = activeBoards.filter((board) => boardFitsTemplate(board, template));
    const gapReason =
      matches.length === 0 ? explainTemplateStockGap(template, boards, unitSystem) : null;
    return { template, matches, status: fitStatus(matches.length), gapReason };
  });

  const assessedProjects = workshopProjects.map((project) => {
    const req = projectRequirements(project.parts);
    const matches = activeBoards.filter((board) =>
      project.parts.some((part) => boardFitsPart(board, part))
    );
    return {
      project,
      req,
      matches,
      status: fitStatus(matches.length),
      confirmed: hasConfirmedWork(project, completedOperations),
    };
  });

  const startFromTemplate = (templateId: string) => {
    const item = assessedTemplates.find((a) => a.template.id === templateId);
    if (!item || item.matches.length === 0) {
      toast.error('Not enough matching stock for this template yet.');
      return;
    }

    const { template, matches } = item;
    clearActiveCuttingPlan();
    setActiveProjectName(template.name);
    setActiveKerfMm(defaultKerfMm);
    setActiveParts([
      {
        id: `${template.id}-part`,
        name: template.name,
        species: matches[0].species,
        length: template.minLength,
        width: template.minWidth,
        thickness: template.minThickness,
        quantity: Math.min(matches.length, 4),
      },
    ]);
    toast.success(`Started project from template: ${template.name}`);
    onOpenCutList();
  };

  const openProject = (project: SavedProject) => {
    const result = openProjectWithCuttingSheets(project.id);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(
      result.hasPlan
        ? `Opened "${result.name}" with saved cutting diagrams.`
        : `Opened "${result.name}". Opening cut sheets from current stock…`
    );
    onOpenCutList();
  };

  const buildAgain = (project: SavedProject) => {
    clearActiveCuttingPlan();
    setActiveProjectName(`${project.name} (rebuild)`);
    setActiveKerfMm(
      project.kerfMm != null && Number.isFinite(project.kerfMm)
        ? Math.max(0, Number(project.kerfMm))
        : defaultKerfMm
    );
    setActiveParts(
      project.parts.map((p) => ({
        ...p,
        id: `${p.id}-rebuild-${Date.now()}`,
      }))
    );
    toast.success(`Started rebuild cut list from "${project.name}"`);
    onOpenCutList();
  };

  const beginEdit = (project: SavedProject) => {
    setEditingId(project.id);
    setEditDescription(project.description || '');
    setEditDifficulty(project.difficulty || 'Beginner');
  };

  const saveEdit = (id: string) => {
    const result = updateProjectShowcase(id, {
      description: editDescription,
      difficulty: editDifficulty,
    });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setEditingId(null);
    toast.success('Updated project card.');
  };

  const markComplete = (project: SavedProject) => {
    const result = markProjectCompleted(project.name, {
      description: editDescription || project.description || `Completed build: ${project.name}.`,
      difficulty: editDifficulty || project.difficulty || 'Beginner',
    });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`"${result.name}" marked completed.`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-3 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-500" /> What Can I Build?{' '}
          <span className="text-xs font-semibold text-orange-300/90">(in development)</span>
        </h2>
        <p className="text-xs text-gray-400">
          Your saved projects first, then starter ideas matched to available stock.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap px-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-orange-500" /> Your projects ({assessedProjects.length})
          </h3>
          {assessedProjects.length < 5 && (
            <button
              type="button"
              onClick={() => {
                const result = restoreRecoveredProjects();
                if (result.added === 0) {
                  toast.success('All 5 workshop projects are already in the library.');
                  return;
                }
                toast.success(
                  `Restored ${result.added} missing project${result.added === 1 ? '' : 's'}.`
                );
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white cursor-pointer"
            >
              Restore missing workshop projects
            </button>
          )}
        </div>

        {assessedProjects.length === 0 ? (
          <div className="bg-[#1e2228] border border-dashed border-gray-700 p-8 rounded-2xl text-center text-sm text-gray-400 space-y-4">
            <p>
              No saved projects yet. Create one under Projects &amp; Cuts (name it, add parts, Save
              project), then it shows up here with skill level and description.
            </p>
            <button
              type="button"
              onClick={() => {
                const result = restoreRecoveredProjects();
                if (result.added === 0) {
                  toast.success('Workshop projects are already in the library.');
                  return;
                }
                toast.success(
                  `Restored ${result.added} project${result.added === 1 ? '' : 's'} (Drinks Tray, Cutting Board, Simple Test, Tech-Drawing Board).`
                );
              }}
              className="mx-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white cursor-pointer"
            >
              Restore workshop projects
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assessedProjects.map(({ project, req, matches, status, confirmed }) => {
              const editing = editingId === project.id;
              const isCompleted = project.status === 'completed';
              return (
                <div
                  key={project.id}
                  className="bg-[#1e2228] border border-orange-900/40 p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      {editing ? (
                        <select
                          value={editDifficulty}
                          onChange={(e) =>
                            setEditDifficulty(e.target.value as ProjectDifficulty)
                          }
                          className="text-[10px] font-mono bg-gray-900 text-gray-200 border border-gray-700 rounded-lg px-2 py-1 cursor-pointer"
                        >
                          {DIFFICULTIES.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[10px] font-mono bg-gray-800 text-gray-300 px-2 py-1 rounded-lg">
                          {project.difficulty || 'Beginner'}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        {isCompleted && (
                          <span
                            className="text-[10px] font-bold px-2 py-1 rounded-lg border bg-emerald-950/40 text-emerald-300 border-emerald-800/50"
                            title="You marked this as a finished build"
                          >
                            COMPLETED
                          </span>
                        )}
                        {!isCompleted && confirmed && (
                          <span
                            className="text-[10px] font-bold px-2 py-1 rounded-lg border bg-sky-950/40 text-sky-300 border-sky-800/50"
                            title="Cutting plan or confirmed shop cuts exist — not the same as marking the build complete"
                          >
                            CUTS IN PROGRESS
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${fitTone(status)}`}
                        >
                          {status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteProjectCard(project)}
                          className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-red-950/70 text-gray-400 hover:text-red-300 border border-gray-700/80 hover:border-red-800/60 cursor-pointer transition-colors"
                          title={`Delete ${project.name}`}
                          aria-label={`Delete ${project.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-base font-bold text-white">{project.name}</h3>
                    {editing ? (
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        placeholder="Short description of the build…"
                        className="w-full bg-[#121417] border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-orange-500 resize-y"
                      />
                    ) : (
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {project.description || 'No description yet, tap Edit to add one.'}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-500 font-mono">
                      {req.pieceCount} pcs · {req.species.join(', ') || 'mixed'}
                      {req.minLength > 0
                        ? `, from ${formatDimsLWT(req.minLength, req.minWidth, req.minThickness, unitSystem)}`
                        : ''}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Matching boards now: <strong className="text-white">{matches.length}</strong>
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {editing ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(project.id)}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 bg-gray-800 hover:bg-gray-700 text-gray-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => beginEdit(project)}
                        className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit level &amp; description
                      </button>
                    )}
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => markComplete(project)}
                        className="w-full py-2 rounded-xl text-[11px] font-semibold bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-800/40 text-emerald-200 cursor-pointer"
                      >
                        Mark as completed build
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openProject(project)}
                      className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />{' '}
                      {project.cuttingPlan?.placements?.length || confirmed
                        ? 'Open with cutting diagrams'
                        : 'Open project'}
                    </button>
                    <button
                      type="button"
                      disabled={matches.length === 0}
                      onClick={() => buildAgain(project)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        matches.length === 0
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-orange-600 hover:bg-orange-500 text-white cursor-pointer'
                      }`}
                    >
                      Build again <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white px-1">Starter templates</h3>
        {activeBoards.length === 0 && (
          <div className="bg-[#1e2228] border border-dashed border-gray-700 p-8 rounded-2xl text-center text-sm text-gray-400">
            Inventory is empty. Log boards in Quick Log, then return here for starter ideas.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {assessedTemplates.map(({ template, matches, status, gapReason }) => (
            <div
              key={template.id}
              className="bg-[#1e2228] border border-gray-800 p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono bg-gray-800 text-gray-300 px-2 py-1 rounded-lg">
                    {template.difficulty}
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${fitTone(status)}`}>
                    {status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{template.name}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{template.description}</p>
                <p className="text-[11px] text-gray-500 font-mono">
                  Needs: {template.requiredSpecies.join(', ')}, min{' '}
                  {formatDimsLWT(
                    template.minLength,
                    template.minWidth,
                    template.minThickness,
                    unitSystem
                  )}
                </p>
                <p className="text-[11px] text-gray-400">
                  Matching boards: <strong className="text-white">{matches.length}</strong>
                </p>
                {gapReason && (
                  <p className="text-[11px] text-amber-300/90 leading-snug">{gapReason}</p>
                )}
              </div>

              <button
                type="button"
                disabled={matches.length === 0}
                onClick={() => startFromTemplate(template.id)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  matches.length === 0
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-600 hover:bg-orange-500 text-white cursor-pointer'
                }`}
              >
                Start cut list <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
