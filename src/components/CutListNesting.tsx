'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore, CutPart, DEFAULT_LUMBER_TYPES } from '@/lib/store';
import { displayToMm, formatDim, mmToDisplay, unitLabel } from '@/lib/units';
import {
  STRATEGY_META,
  diagnoseUnallocated,
  speciesMatches,
  type CuttingStrategy,
} from '@/lib/cutting-engine';
import {
  Scissors,
  Layers,
  CheckCircle2,
  PlusCircle,
  Trash2,
  FolderPlus,
  RotateCcw,
  Folder,
  ArrowRight,
  Save,
  PauseCircle,
  Play,
  Pencil,
  X,
} from 'lucide-react';
import CutListDrawing from '@/components/CutListDrawing';
import SpeciesSelect from '@/components/SpeciesSelect';
import { notify, toast } from '@/lib/notify';

async function offerStockGapChoice(stockGaps: string[]): Promise<'pause' | 'generate' | 'cancel'> {
  const action = await notify.choice({
    title: 'Stock missing for this project',
    message: `${stockGaps.join('\n\n')}\n\nPause this project while you purchase the correct stock, or generate sheets only for parts that fit now.`,
    actions: [
      { id: 'pause', label: 'Pause project (buy stock later)', primary: true },
      { id: 'generate', label: 'Generate what fits now' },
      { id: 'cancel', label: 'Cancel' },
    ],
  });
  if (action === 'pause' || action === 'generate') return action;
  return 'cancel';
}

export default function CutListNesting() {
  const store = useAppStore();
  const boards = store?.boards || [];
  const savedProjects = store?.savedProjects || [];
  const activeProjectName = store?.activeProjectName || 'New Project';
  const activeParts = store?.activeParts || [];
  const unitSystem = store.unitSystem;
  const u = unitLabel(unitSystem);
  const defaultKerfMm = store.defaultKerfMm;
  const activeKerfMm = store.activeKerfMm;
  const setActiveKerfMm = store.setActiveKerfMm;
  const activeStrategy: CuttingStrategy = store.activeStrategy || 'auto';
  const setActiveStrategy = store.setActiveStrategy;

  const [partName, setPartName] = useState('');
  const [woodSpecies, setWoodSpecies] = useState(
    () => store.lumberTypes?.[0] || DEFAULT_LUMBER_TYPES[0]
  );
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [thickness, setThickness] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [formError, setFormError] = useState<string | null>(null);
  const [editingPartId, setEditingPartId] = useState<string | null>(null);

  const [isGenerated, setIsGenerated] = useState(false);
  const [allowThinStock, setAllowThinStock] = useState(false);
  const sheetsAnchorRef = React.useRef<HTMLDivElement | null>(null);

  const revealSavedCuttingSheets = store.revealSavedCuttingSheets;
  const clearRevealSavedCuttingSheets = store.clearRevealSavedCuttingSheets;
  const activeCuttingPlan = store.activeCuttingPlan;

  // Restore / open shop sheets when a plan exists, or when What Can I Build asks to reveal
  useEffect(() => {
    const hasPlan = Boolean(activeCuttingPlan?.placements?.length);
    if (hasPlan && activeParts.length > 0) {
      setIsGenerated(true);
    }
    if (revealSavedCuttingSheets && activeParts.length > 0) {
      // Show sheets even if plan was missing — CutListDrawing nests and saves a new plan
      setIsGenerated(true);
      const t = window.setTimeout(() => {
        sheetsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document
          .getElementById('timbervault-cut-sheets')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        clearRevealSavedCuttingSheets();
      }, 200);
      return () => window.clearTimeout(t);
    }
  }, [
    activeCuttingPlan,
    revealSavedCuttingSheets,
    clearRevealSavedCuttingSheets,
    activeParts.length,
    activeProjectName,
  ]);

  const resetPartForm = () => {
    setPartName('');
    setLength('');
    setWidth('');
    setThickness('');
    setQuantity('1');
    setFormError(null);
    setEditingPartId(null);
  };

  const fillPartForm = (p: CutPart) => {
    setEditingPartId(p.id);
    setPartName(p.name);
    setWoodSpecies(p.species);
    setLength(String(mmToDisplay(p.length, unitSystem)));
    setWidth(String(mmToDisplay(p.width, unitSystem)));
    setThickness(p.thickness != null ? String(mmToDisplay(p.thickness, unitSystem)) : '');
    setQuantity(String(p.quantity));
    setFormError(null);
  };

  /** Warn only when confirmed cuts would be lost; otherwise proceed with a toast. */
  const warnIfPlanExists = async (actionLabel: string): Promise<boolean> => {
    if (!store.activeCuttingPlan) return true;
    const prefix = `${activeProjectName.trim()}-`;
    const hasCuts = (store.completedOperations || []).some((op) => op.startsWith(prefix));
    if (!hasCuts) {
      toast.success(`${actionLabel}: saved cutting plan will be cleared.`);
      return true;
    }
    return notify.confirm({
      title: 'Warning: confirmed cuts will be cleared',
      message: `${actionLabel} clears the saved cutting plan and confirmed cut progress for this project. You will need to generate sheets again.`,
      confirmLabel: 'Continue',
      danger: true,
    });
  };

  const handleStartNewProject = () => {
    store.startNewProject();
    setIsGenerated(false);
    setAllowThinStock(false);
    resetPartForm();
    toast.success('Started a new project. Name it, add parts, then Save project.');
  };

  const handleSaveCurrentProject = () => {
    const savedName = activeProjectName.trim();
    if (!savedName || savedName.toLowerCase() === 'new project') {
      toast.error('Give this project a name first (e.g. Box, Cutting Board).');
      return;
    }
    if (activeParts.length === 0) {
      toast.error('Add at least one part before saving.');
      return;
    }
    store.saveCurrentProject();
    resetPartForm();
    toast.success(`Saved project "${savedName}". Still open, generate cuts when ready.`);
  };

  const handleLoadProject = (id: string, name: string) => {
    const result = store.openProjectWithCuttingSheets(id);
    resetPartForm();
    setAllowThinStock(false);
    const partsNow = useAppStore.getState().activeParts.length;
    const hasPlan = result.ok && result.hasPlan;
    setIsGenerated(partsNow > 0);
    toast.success(
      hasPlan
        ? `Opened "${name}" with saved cutting plan.`
        : partsNow > 0
          ? `Opened "${name}". Building cut sheets from current stock…`
          : `Loaded cut list: "${name}"`
    );
  };

  const handleResumeProject = (id: string, name: string) => {
    const proj = savedProjects.find((p) => p.id === id);
    const result = store.resumeProject(id);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    resetPartForm();
    setAllowThinStock(false);
    const hasPlan = Boolean(proj?.cuttingPlan?.placements?.length);
    setIsGenerated(hasPlan);
    toast.success(
      hasPlan
        ? `Resumed "${name}" with saved cutting plan.`
        : `Resumed "${name}". Check stock, then generate again.`
    );
  };

  const handlePauseForStock = (reason: string) => {
    const result = store.pauseActiveProject(reason);
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }
    setIsGenerated(false);
    setAllowThinStock(false);
    resetPartForm();
    toast.success(
      `Paused "${result.name}". Buy the missing stock, then Resume from Open a saved project.`
    );
    return true;
  };

  const handleDeleteSavedProject = async (id: string, name: string) => {
    const ok = await notify.confirm({
      title: 'Delete cut list?',
      message: `Delete cut list "${name}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    store.deleteProject(id);
    toast.error(`Deleted cut list: "${name}"`);
  };

  const parsePartForm = (): CutPart | null => {
    const l = displayToMm(parseFloat(length), unitSystem);
    const w = displayToMm(parseFloat(width), unitSystem);
    const tRaw = thickness.trim() === '' ? NaN : displayToMm(parseFloat(thickness), unitSystem);
    const qty = parseInt(quantity, 10);

    if (!partName.trim()) {
      setFormError('Enter a part name.');
      return null;
    }
    if (isNaN(l) || l <= 0) {
      setFormError(`Enter a valid length in ${u}.`);
      return null;
    }
    if (isNaN(w) || w <= 0) {
      setFormError(`Enter a valid width in ${u}.`);
      return null;
    }
    if (thickness.trim() !== '' && (isNaN(tRaw) || tRaw <= 0)) {
      setFormError(`Enter a valid thickness in ${u}, or leave blank.`);
      return null;
    }
    if (isNaN(qty) || qty <= 0) {
      setFormError('Enter a quantity of at least 1.');
      return null;
    }

    return {
      id: editingPartId || Date.now().toString(),
      name: partName.trim(),
      species: woodSpecies,
      length: l,
      width: w,
      quantity: qty,
      ...(thickness.trim() !== '' ? { thickness: tRaw } : {}),
    };
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    const part = parsePartForm();
    if (!part) return;

    if (store.activeCuttingPlan) {
      const ok = await warnIfPlanExists(editingPartId ? 'Updating this part' : 'Adding a part');
      if (!ok) return;
    }

    if (editingPartId) {
      store.updatePartInActiveProject(part);
      toast.success(`Updated ${part.name}.`);
    } else {
      store.addPartToActiveProject(part);
      toast.success(`Added ${part.name} to cut list!`);
    }
    resetPartForm();
    setIsGenerated(false);
  };

  const handleEditPart = (p: CutPart) => {
    fillPartForm(p);
  };

  const handleDeletePart = async (id: string) => {
    if (store.activeCuttingPlan) {
      const ok = await warnIfPlanExists('Removing a part');
      if (!ok) return;
    }
    store.removePartFromActiveProject(id);
    if (editingPartId === id) resetPartForm();
    setIsGenerated(false);
    toast.error('Removed part from cut list.');
  };

  const thicknessWarnings = (): string[] => {
    const activeStock = boards.filter((b) => b.status === 'active');
    const warnings: string[] = [];

    for (const part of activeParts) {
      const stock = activeStock.filter((b) => speciesMatches(part.species, b.species));
      if (stock.length === 0) continue;

      const maxStockT = Math.max(...stock.map((b) => Number(b.thickness) || 0));
      const minStockT = Math.min(...stock.map((b) => Number(b.thickness) || 0));
      const needT = part.thickness;

      if (needT != null && needT > 0) {
        if (maxStockT + 0.1 < needT) {
          warnings.push(
            `${part.name}: needs ${formatDim(needT, unitSystem)} thick, but thickest ${part.species} stock is ${formatDim(maxStockT, unitSystem)}.`
          );
        } else if (Math.abs(maxStockT - needT) > 0.5 && minStockT + 0.1 < needT) {
          warnings.push(
            `${part.name}: needs ${formatDim(needT, unitSystem)}; some ${part.species} stock is only ${formatDim(minStockT, unitSystem)}.`
          );
        } else if (Math.abs(maxStockT - needT) > 0.5) {
          warnings.push(
            `${part.name}: needs ${formatDim(needT, unitSystem)}, stock on hand is ${formatDim(maxStockT, unitSystem)}.`
          );
        }
      } else if (maxStockT > 0) {
        warnings.push(
          `${part.name}: no thickness set; ${part.species} stock is ${formatDim(minStockT, unitSystem)}${
            minStockT !== maxStockT ? ` to ${formatDim(maxStockT, unitSystem)}` : ''
          }.`
        );
      }
    }

    return warnings;
  };

  const runGenerate = (proceedThin: boolean) => {
    // Fresh nest from current stock; CutListDrawing persists the new plan
    store.clearActiveCuttingPlan();
    setAllowThinStock(proceedThin);
    setIsGenerated(true);
    toast.success('Generated optimized cutting instructions & drawings!');
  };

  const handleGenerateInstructions = async () => {
    if (activeParts.length === 0) return;

    if (store.activeCuttingPlan) {
      const prefix = `${activeProjectName.trim()}-`;
      const hasCuts = (store.completedOperations || []).some((op) => op.startsWith(prefix));
      if (hasCuts) {
        const ok = await notify.confirm({
          title: 'Warning: regenerate clears confirmed cuts',
          message:
            'This replaces the saved cutting plan and clears confirmed cut progress for this project.',
          confirmLabel: 'Regenerate',
          danger: true,
        });
        if (!ok) return;
      }
    }

    const activeStock = boards.filter((b) => b.status === 'active');
    const stockGaps = activeParts.flatMap((p) => {
      const piece = {
        id: p.id,
        name: p.name,
        species: p.species,
        length: p.length,
        width: p.width,
        thickness: p.thickness ?? 0,
      };
      const reason = diagnoseUnallocated(piece, activeStock);
      const noStock =
        reason.startsWith('No ') ||
        reason.includes('too small') ||
        reason.includes('too thin');
      return noStock
        ? [
            `• ${p.name} (${p.species}) ${formatDim(p.length, unitSystem)} × ${formatDim(p.width, unitSystem)}${
              p.thickness ? ` × ${formatDim(p.thickness, unitSystem)}` : ''
            }\n  ${reason}`,
          ]
        : [];
    });

    if (stockGaps.length > 0) {
      const choice = await offerStockGapChoice(stockGaps);
      if (choice === 'cancel') return;
      if (choice === 'pause') {
        handlePauseForStock(stockGaps.join('\n\n'));
        return;
      }
      // choice === 'generate' → continue
    }

    const warnings = thicknessWarnings();
    if (warnings.length > 0) {
      const ok = await notify.confirm({
        title: 'Thickness check',
        message: `${warnings.map((w) => `• ${w}`).join('\n')}\n\nGenerate instructions anyway?`,
        confirmLabel: 'Generate anyway',
      });
      if (!ok) return;
      runGenerate(true);
      return;
    }

    runGenerate(false);
  };

  const totalBoardsRequired = activeParts.reduce((acc, p) => acc + p.quantity, 0);
  const projectNamed =
    Boolean(activeProjectName.trim()) &&
    activeProjectName.trim().toLowerCase() !== 'new project';

  const handleAddPartGuarded = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectNamed) {
      setFormError('Name the project in step 1 first (e.g. Box).');
      toast.error('Name the project first, then add parts.');
      return;
    }
    void handleAddPart(e);
  };

  return (
    <div className="space-y-6">
      <div className="no-print space-y-5">
        <div className="bg-[#1e2228] border border-gray-800 p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Scissors className="w-5 h-5 text-orange-500" /> Projects &amp; cuts
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              1, Name project, 2, Add parts, 3, Save &amp; generate sheets
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs bg-gray-800 text-orange-400 font-mono px-3 py-1.5 rounded-xl border border-gray-700">
              Stock: <strong className="text-white">{boards.length}</strong>
            </span>
            <button
              type="button"
              onClick={handleStartNewProject}
              className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" /> New project
            </button>
          </div>
        </div>

        {/* Saved projects library */}
        <div className="bg-[#1e2228] border border-gray-800 p-5 rounded-2xl space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Folder className="w-4 h-4 text-orange-500" /> Open a saved project
            </h4>
            <span className="text-[11px] text-gray-500 font-mono">{savedProjects.length}</span>
          </div>
          {savedProjects.length === 0 ? (
            <p className="text-xs text-gray-500 font-mono py-2">
              None yet. Name a project below, add parts, then Save project.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedProjects.map((proj) => {
                const count = proj.parts.reduce((acc, p) => acc + p.quantity, 0);
                const isActive = proj.name.toLowerCase() === activeProjectName.toLowerCase();
                const isPaused = proj.status === 'paused';
                const isCompleted = proj.status === 'completed';
                return (
                  <div
                    key={proj.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between font-mono text-xs gap-2 ${
                      isPaused
                        ? 'bg-amber-950/30 border-amber-600/50 text-white'
                        : isCompleted
                          ? 'bg-emerald-950/25 border-emerald-700/40 text-white'
                          : isActive
                            ? 'bg-orange-950/40 border-orange-500/50 text-white'
                            : 'bg-[#121417] border-gray-800 text-gray-300'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <span className="font-bold text-white block truncate">{proj.name}</span>
                      <span className="text-[10px] text-gray-400 block">
                        {count} pcs, {proj.date}
                        {isCompleted && proj.difficulty ? ` · ${proj.difficulty}` : ''}
                      </span>
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 mt-0.5">
                          Completed build · What Can I Build
                        </span>
                      )}
                      {isPaused && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 mt-0.5">
                          <PauseCircle className="w-3 h-3" /> Paused, waiting on stock
                        </span>
                      )}
                      {isPaused && proj.pauseReason && (
                        <span className="text-[10px] text-amber-200/70 block line-clamp-2 mt-0.5 font-sans">
                          {proj.pauseReason.split('\n')[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isPaused ? (
                        <button
                          type="button"
                          onClick={() => handleResumeProject(proj.id, proj.name)}
                          className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 font-semibold rounded-lg flex items-center gap-1 cursor-pointer text-[11px]"
                          title="Resume after you have logged the missing stock"
                        >
                          <Play className="w-3 h-3" /> Resume
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleLoadProject(proj.id, proj.name)}
                          className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-orange-400 font-semibold rounded-lg flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          Open <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedProject(proj.id, proj.name)}
                        className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-950/40 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* STEP 1, Name */}
        <div
          className={`bg-[#1e2228] border p-5 rounded-2xl shadow-xl space-y-3 ${
            projectNamed ? 'border-emerald-800/50' : 'border-orange-500/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                projectNamed
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-orange-950 text-orange-400 border border-orange-700'
              }`}
            >
              STEP 1
            </span>
            <h4 className="text-sm font-bold text-white">Name this project</h4>
          </div>
          <input
            type="text"
            value={activeProjectName === 'New Project' ? '' : activeProjectName}
            onChange={(e) => store.setActiveProjectName(e.target.value || 'New Project')}
            placeholder="e.g. Box, Cutting Board"
            className="w-full max-w-xl bg-[#121417] border border-gray-700 rounded-xl px-4 py-3 text-base text-white font-semibold focus:outline-none focus:border-orange-500"
            autoFocus={!projectNamed}
          />
          <p className="text-[11px] text-gray-500">
            {projectNamed
              ? `Working on “${activeProjectName.trim()}”. Continue to step 2.`
              : 'Type a real name before adding parts, offcuts and finished pieces will be tagged to it.'}
          </p>
          <div className="pt-2 max-w-xs space-y-1">
            <label className="block text-xs font-medium text-gray-400">
              Saw kerf for this project ({u})
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={mmToDisplay(activeKerfMm, unitSystem, unitSystem === 'imperial' ? 3 : 1)}
              onChange={(e) => {
                const v = displayToMm(parseFloat(e.target.value), unitSystem);
                if (!isNaN(v) && v >= 0) {
                  setActiveKerfMm(v);
                  setIsGenerated(false);
                }
              }}
              className="w-full bg-[#121417] border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
            />
            <p className="text-[10px] text-gray-500">
              Default from Settings is {formatDim(defaultKerfMm, unitSystem)}. Change here if this
              job uses a different blade, nesting updates when you generate again.
            </p>
          </div>
        </div>

        {/* STEP 2 — Parts */}
        <div
          className={`bg-[#1e2228] border border-gray-800 p-5 rounded-2xl shadow-xl space-y-4 ${
            !projectNamed ? 'opacity-55' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
              STEP 2
            </span>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              {editingPartId ? (
                <>
                  <Pencil className="w-4 h-4 text-orange-500" /> Edit part
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 text-orange-500" /> Add parts to the cut list
                </>
              )}
            </h4>
          </div>

          {!projectNamed && (
            <p className="text-xs text-amber-400/90 bg-amber-950/30 border border-amber-900/40 rounded-xl px-3 py-2">
              Finish step 1 first, name the project, then add sides, tops, rails, etc.
            </p>
          )}

          {editingPartId && (
            <p className="text-xs text-orange-300/90 bg-orange-950/30 border border-orange-900/40 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
              <span>Editing a part. Saving updates the cut list (clears any saved cutting plan).</span>
              <button
                type="button"
                onClick={resetPartForm}
                className="shrink-0 text-orange-200 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </p>
          )}

          <form onSubmit={handleAddPartGuarded} className="space-y-4">
            {formError && (
              <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl px-3 py-2">
                {formError}
              </p>
            )}
            <fieldset disabled={!projectNamed} className="space-y-4 disabled:pointer-events-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Part name</label>
                  <input
                    type="text"
                    required={projectNamed}
                    placeholder="e.g. Side, Top, Rail"
                    value={partName}
                    onChange={(e) => {
                      setPartName(e.target.value);
                      setFormError(null);
                    }}
                    className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Wood species</label>
                  <SpeciesSelect value={woodSpecies} onChange={setWoodSpecies} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Length ({u})</label>
                  <input
                    type="number"
                    step="any"
                    required={projectNamed}
                    min="0.01"
                    placeholder={unitSystem === 'imperial' ? 'e.g. 13.78' : 'e.g. 350'}
                    value={length}
                    onChange={(e) => {
                      setLength(e.target.value);
                      setFormError(null);
                    }}
                    className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Width ({u})</label>
                  <input
                    type="number"
                    step="any"
                    required={projectNamed}
                    min="0.01"
                    placeholder={unitSystem === 'imperial' ? 'e.g. 2' : 'e.g. 50'}
                    value={width}
                    onChange={(e) => {
                      setWidth(e.target.value);
                      setFormError(null);
                    }}
                    className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Thick ({u}) <span className="text-gray-600">optional</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder={unitSystem === 'imperial' ? 'e.g. 0.75' : 'e.g. 18'}
                    value={thickness}
                    onChange={(e) => {
                      setThickness(e.target.value);
                      setFormError(null);
                    }}
                    className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="w-full md:w-auto px-6 bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 text-xs cursor-pointer"
                >
                  {editingPartId ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Save part changes
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" /> Add part
                    </>
                  )}
                </button>
                {editingPartId && (
                  <button
                    type="button"
                    onClick={resetPartForm}
                    className="w-full md:w-auto px-5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" /> Cancel edit
                  </button>
                )}
              </div>
            </fieldset>
          </form>

          <div className="border-t border-gray-800 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-gray-300 flex items-center gap-2 font-mono uppercase tracking-wide">
                <Layers className="w-3.5 h-3.5 text-orange-500" />
                Cut list, {projectNamed ? activeProjectName : 'unnamed'}, {totalBoardsRequired} pcs
              </h5>
              {activeParts.length > 0 && (
                <button
                  type="button"
                  onClick={async () => {
                    if (store.activeCuttingPlan) {
                      const ok = await warnIfPlanExists('Clearing all parts');
                      if (!ok) return;
                    }
                    store.setActiveParts([]);
                    resetPartForm();
                    setIsGenerated(false);
                  }}
                  className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-1 cursor-pointer font-mono"
                >
                  <RotateCcw className="w-3 h-3" /> Clear parts
                </button>
              )}
            </div>

            {activeParts.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs border border-dashed border-gray-800 rounded-xl font-mono">
                No parts yet, add each piece you need to cut.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activeParts.map((p) => (
                  <div
                    key={p.id}
                    className={`bg-[#121417] border p-3.5 rounded-xl flex items-center justify-between gap-2 ${
                      editingPartId === p.id
                        ? 'border-orange-500/70'
                        : 'border-gray-800'
                    }`}
                  >
                    <div className="space-y-0.5 font-mono min-w-0">
                      <div className="text-white font-bold text-xs flex items-center gap-2 flex-wrap">
                        <span>{p.name}</span>
                        <span className="text-[10px] bg-orange-950 text-orange-400 px-2 py-0.5 rounded border border-orange-800">
                          {p.species}
                        </span>
                      </div>
                      <div className="text-gray-400 text-xs">
                        {formatDim(p.length, unitSystem)} × {formatDim(p.width, unitSystem)}
                        {p.thickness ? ` × ${formatDim(p.thickness, unitSystem)}` : ''}, Qty:{' '}
                        <strong className="text-white">{p.quantity}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditPart(p)}
                        className="text-gray-300 hover:text-orange-300 p-1.5 rounded-lg hover:bg-orange-950/40 transition-all cursor-pointer"
                        title="Edit part"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeletePart(p.id)}
                        className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-950/40 transition-all cursor-pointer"
                        title="Remove part"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* STEP 3 — Save & generate */}
        <div
          className={`bg-[#1e2228] border border-gray-800 p-5 rounded-2xl shadow-xl space-y-3 ${
            activeParts.length === 0 || !projectNamed ? 'opacity-55' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
              STEP 3
            </span>
            <h4 className="text-sm font-bold text-white">Save project &amp; generate cut sheets</h4>
          </div>
          <p className="text-[11px] text-gray-500">
            Save keeps this cut list in your project library. Generate builds shop sheets from stock
            and keeps a copy with the project so confirmed cuts reopen the same plan.
          </p>

          <div className="space-y-2 pt-1">
            <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wide">
              Cutting strategy preference
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                [
                  'auto',
                  'crosscut-first',
                  'rip-first',
                  'preserve-offcut',
                ] as CuttingStrategy[]
              ).map((key) => {
                const meta = STRATEGY_META[key];
                const selected = activeStrategy === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveStrategy(key)}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      selected
                        ? 'bg-orange-950/40 border-orange-500 text-white'
                        : 'bg-[#121417] border-gray-800 hover:border-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono flex items-center justify-between gap-2">
                      <span>{meta.label}</span>
                      {selected && (
                        <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded">
                          Selected
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 leading-snug">
                      {meta.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={activeParts.length === 0 || !projectNamed}
              onClick={handleSaveCurrentProject}
              className={`flex-1 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-xs ${
                activeParts.length === 0 || !projectNamed
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-800 hover:bg-gray-700 text-white cursor-pointer'
              }`}
            >
              <Save className="w-4 h-4" /> Save project
            </button>
            <button
              type="button"
              disabled={activeParts.length === 0 || !projectNamed}
              onClick={handleGenerateInstructions}
              className={`flex-1 font-semibold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-xs ${
                activeParts.length === 0 || !projectNamed
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 cursor-pointer'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />{' '}
              {store.activeCuttingPlan && isGenerated
                ? `Regenerate (${totalBoardsRequired})`
                : `Generate instructions (${totalBoardsRequired})`}
            </button>
          </div>
        </div>
      </div>

      {/* Printable cutting sheets only */}
      {isGenerated && activeParts.length > 0 && (
        <div ref={sheetsAnchorRef} className="space-y-6 pt-4 scroll-mt-4">
          {store.activeCuttingPlan?.placements?.length ? (
            <div className="no-print rounded-xl border border-emerald-700/40 bg-emerald-950/25 px-4 py-2.5 text-xs text-emerald-200/90">
              Saved cutting plan restored for <strong className="text-white">{activeProjectName}</strong>
              {store.activeCuttingPlan.savedAt
                ? ` · ${new Date(store.activeCuttingPlan.savedAt).toLocaleString()}`
                : ''}
              . Diagrams below are the confirmed sequence for this project.
            </div>
          ) : null}
          <CutListDrawing ignorePartThickness={allowThinStock} />
        </div>
      )}

    </div>
  );
}