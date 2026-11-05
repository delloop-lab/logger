'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore, Board, BoardClassification, partsFingerprint } from '@/lib/store';
import {
  createCuttingPlan,
  explainUnallocated,
  isFinishedPlacement,
  type CuttingPlan,
  type Placement,
} from '@/lib/cutting-engine';
import { expandLotsToStock, findSourceLot, type NestStock } from '@/lib/inventory-lots';
import { formatDefectsList, hasDefects } from '@/lib/defects';
import { Printer, CheckCircle2, ShieldCheck, Scissors, Box, AlertTriangle, Undo2 } from 'lucide-react';
import { notify, toast } from '@/lib/notify';
import { displayToMm, formatDim, formatDimsLWT, mmToDisplay, unitLabel } from '@/lib/units';
import AppModal from '@/components/AppModal';
import CutMapWorkshop from '@/components/CutMapWorkshop';

type Props = {
  /** When user confirmed thickness mismatch, nest without enforcing part thickness */
  ignorePartThickness?: boolean;
};

export default function CutListDrawing({ ignorePartThickness = false }: Props) {
  const store = useAppStore();
  const boards = store?.boards || [];
  const activeProjectName = store?.activeProjectName || 'New Project';
  const activeParts = store?.activeParts || [];
  const completedOperations = store?.completedOperations || [];
  const cutHistory = store?.cutHistory || [];
  const activeCuttingPlan = store.activeCuttingPlan;
  const saveCuttingPlanToActiveProject = store.saveCuttingPlanToActiveProject;
  const undoLastCut = store.undoLastCut;
  const undoAllCuts = store.undoAllCuts;
  const offcutSettings = store?.offcutSettings || { minLength: 100, minWidth: 100 };
  const activeKerfMm = store?.activeKerfMm ?? store?.defaultKerfMm ?? 3.2;
  const activeStrategy = store?.activeStrategy || 'auto';
  const setActiveStrategy = store?.setActiveStrategy;
  const unitSystem = store.unitSystem;
  const u = unitLabel(unitSystem);

  const [confirmStep, setConfirmStep] = useState<Placement | null>(null);
  const [overrideClassification, setOverrideClassification] = useState<BoardClassification | null>(null);
  const [customRemLen, setCustomRemLen] = useState<number>(0);
  const [customRemWid, setCustomRemWid] = useState<number>(0);
  /** Freeze stock snapshot while confirming cuts so consuming the parent lot cannot renest mid-job */
  const [lockedStock, setLockedStock] = useState<NestStock[] | null>(null);

  const liveStock = useMemo(() => expandLotsToStock(boards), [boards]);

  const partsKey = useMemo(() => partsFingerprint(activeParts), [activeParts]);

  const cuttingInProgress = completedOperations.some((op) =>
    op.startsWith(`${activeProjectName}-`)
  );

  useEffect(() => {
    if (!cuttingInProgress) {
      setLockedStock(liveStock);
    }
  }, [liveStock, cuttingInProgress, activeProjectName, partsKey]);

  const nestStock = lockedStock ?? liveStock;

  // While a plan is attached to the open project, always show that copy (confirmed sequence).
  // Parts edits clear the plan in the store; Regenerate clears it before nesting again.
  const useSavedPlan = (activeCuttingPlan?.placements?.length || 0) > 0;

  const plan = useMemo((): CuttingPlan => {
    if (useSavedPlan && activeCuttingPlan) {
      return {
        placements: activeCuttingPlan.placements,
        unallocated: (activeCuttingPlan.unallocated || []).map((p) => ({
          ...p,
          thickness: p.thickness || 0,
        })),
        rejectedBoards: [],
        usedBoardTags: activeCuttingPlan.usedBoardTags || [],
        strategy: activeCuttingPlan.strategy,
        selectedStrategy: activeCuttingPlan.strategy,
        explanation:
          activeCuttingPlan.explanation ||
          'Restored confirmed cutting plan saved with this project.',
      };
    }
    return createCuttingPlan(
      nestStock,
      activeParts.map((p) => ({
        id: p.id,
        name: p.name,
        species: p.species,
        length: p.length,
        width: p.width,
        thickness: ignorePartThickness ? 0 : p.thickness ?? 0,
        quantity: p.quantity,
      })),
      {
        kerfMm: activeKerfMm,
        strategy: activeStrategy,
        offcutThresholds: offcutSettings,
      }
    );
  }, [
    useSavedPlan,
    activeCuttingPlan,
    nestStock,
    activeParts,
    ignorePartThickness,
    activeKerfMm,
    activeStrategy,
    offcutSettings,
  ]);

  // Persist freshly nested plan onto the project (confirmed cuts keep using this copy)
  useEffect(() => {
    if (useSavedPlan) return;
    if (plan.placements.length === 0 && plan.unallocated.length === 0) return;
    saveCuttingPlanToActiveProject({
      savedAt: new Date().toISOString(),
      partsFingerprint: partsKey,
      kerfMm: activeKerfMm,
      strategy: activeStrategy,
      explanation: plan.explanation,
      usedBoardTags: plan.usedBoardTags,
      placements: plan.placements,
      unallocated: plan.unallocated.map((p) => ({
        id: p.id,
        name: p.name,
        species: p.species,
        length: p.length,
        width: p.width,
        thickness: p.thickness || 0,
      })),
    });
  }, [
    useSavedPlan,
    plan,
    partsKey,
    activeKerfMm,
    activeStrategy,
    saveCuttingPlanToActiveProject,
  ]);

  const physicalSteps = plan.placements;
  const finishedSteps = physicalSteps.filter((s) => isFinishedPlacement(s));
  const finishedLogged = finishedSteps.filter((s) =>
    completedOperations.includes(`${activeProjectName}-${s.stepIndex}-${s.boardTag}`)
  ).length;

  const unallocatedExplain = useMemo(
    () => explainUnallocated(plan.unallocated, nestStock),
    [plan.unallocated, nestStock]
  );

  const pauseActiveProject = store.pauseActiveProject;
  const unallocKey = unallocatedExplain.map((u) => u.piece.id).join('|');
  const alertedUnallocRef = React.useRef<string>('');
  useEffect(() => {
    if (unallocatedExplain.length === 0) {
      alertedUnallocRef.current = '';
      return;
    }
    const key = `${partsKey}::${unallocKey}`;
    if (alertedUnallocRef.current === key) return;
    alertedUnallocRef.current = key;
    const lines = unallocatedExplain.map(
      ({ piece, reason }) =>
        `• ${piece.name} (${piece.species}) ${Math.round(piece.length)}×${Math.round(piece.width)}${piece.thickness ? `×${Math.round(piece.thickness)}` : ''} mm\n  ${reason}`
    );
    const reasonText = lines.join('\n\n');
    void (async () => {
      const action = await notify.choice({
        title: 'Parts missing from cut plan',
        message: `${reasonText}\n\nSteps below only cover parts that fit. Pause this project while you buy the correct stock, then Resume when it is logged.`,
        actions: [
          { id: 'pause', label: 'Pause project (buy stock later)', primary: true },
          { id: 'continue', label: 'Continue with what fits' },
        ],
      });
      if (action === 'pause') {
        const result = pauseActiveProject(reasonText);
        if (result.ok) {
          toast.success(
            `Paused "${result.name}". Buy the missing stock, then Resume from Open a saved project.`
          );
        } else {
          toast.error(result.message);
        }
      }
    })();
  }, [partsKey, unallocKey, unallocatedExplain, pauseActiveProject]);

  const handlePrint = () => window.print();

  const openConfirmationModal = (step: Placement) => {
    setConfirmStep(step);
    const remL = step.opKind === 'rip' && isFinishedPlacement(step) ? step.edgeLen : step.remLen;
    const remW = step.opKind === 'rip' && isFinishedPlacement(step) ? step.edgeWid : step.remWid;
    setCustomRemLen(mmToDisplay(remL, unitSystem, unitSystem === 'imperial' ? 2 : 1));
    setCustomRemWid(mmToDisplay(remW, unitSystem, unitSystem === 'imperial' ? 2 : 1));
    const isWaste =
      remL < offcutSettings.minLength && remW < offcutSettings.minWidth;
    setOverrideClassification(isWaste ? 'waste' : 'reusable_offcut');
  };

  /** Always the original nest board tag (never …-OPn-REM/EDGE/PART/…). */
  const nestRootTag = (tag: string) =>
    tag.replace(/(?:-OP\d+-(?:REM|EDGE|OFFCUT|WASTE|PART|ASIDE|STRIP))+$/gi, '');

  const opDone = (s: Placement) =>
    completedOperations.includes(`${activeProjectName}-${s.stepIndex}-${s.boardTag}`);

  /**
   * What to pull for this step (shop flow):
   * - First rip: original board
   * - Crosscuts on a strip: that strip's REM chain
   * - Later rip: the set-aside odd piece (EDGE/ASIDE) from the previous rip, not strip end-waste
   */
  const resolvePullTag = (step: Placement, requireCompleted: boolean) => {
    const root = nestRootTag(step.boardTag);
    const prior = physicalSteps
      .filter(
        (s) =>
          nestRootTag(s.boardTag) === root &&
          s.stepIndex < step.stepIndex &&
          (!requireCompleted || opDone(s))
      )
      .sort((a, b) => b.stepIndex - a.stepIndex);

    if (prior.length === 0) return root;

    if (step.opKind === 'blank') {
      // Subsequent blanks on the same board pull the continuous offcut saved by the previous blank
      const prevBlank = prior.find((s) => s.opKind === 'blank');
      if (prevBlank) return `${root}-OP${prevBlank.stepIndex}-ASIDE`;
      return root;
    }

    if (step.opKind === 'rip') {
      // Subsequent rips on the SAME blank pull the remaining width of that blank (-ASIDE)
      const prevRipSameBlank = prior.find(
        (s) => s.opKind === 'rip' && step.stripKey && s.stripKey === step.stripKey
      );
      if (prevRipSameBlank) return `${root}-OP${prevRipSameBlank.stepIndex}-ASIDE`;

      const prevBlank = prior.find(
        (s) =>
          s.opKind === 'blank' &&
          (!step.stripKey || !s.stripKey || s.stripKey === step.stripKey)
      );
      if (prevBlank) return `${root}-OP${prevBlank.stepIndex}-STRIP`;

      const anyBlank = prior.find((s) => s.opKind === 'blank');
      if (anyBlank) return `${root}-OP${anyBlank.stepIndex}-STRIP`;

      const prevRip = prior.find((s) => s.opKind === 'rip');
      if (prevRip) return `${root}-OP${prevRip.stepIndex}-ASIDE`;
      return root;
    }

    // Crosscut: walk the strip's REM chain (never rip/blank, those yield -STRIP)
    const prevCrosscut = prior.find(
      (s) =>
        s.opKind === 'crosscut' &&
        ((step.stripKey && s.stripKey === step.stripKey) ||
          Math.abs(s.posY - step.posY) < 0.51)
    );
    if (prevCrosscut) return `${root}-OP${prevCrosscut.stepIndex}-REM`;

    const openingRip = prior.find(
      (s) =>
        s.opKind === 'rip' &&
        ((step.stripKey && s.stripKey === step.stripKey) ||
          Math.abs(s.posY - step.posY) < 0.51)
    );
    if (openingRip) return `${root}-OP${openingRip.stepIndex}-STRIP`;

    const prevAny = prior[0];
    if (prevAny?.opKind === 'rip' || prevAny?.opKind === 'blank') {
      return `${root}-OP${prevAny.stepIndex}-STRIP`;
    }
    return `${root}-OP${prevAny.stepIndex}-REM`;
  };

  const plannedPullTag = (boardTag: string, stepIndex: number) => {
    const step = physicalSteps.find((s) => s.boardTag === boardTag && s.stepIndex === stepIndex);
    if (!step) {
      const root = nestRootTag(boardTag);
      const prior = physicalSteps
        .filter((s) => nestRootTag(s.boardTag) === root && s.stepIndex < stepIndex)
        .sort((a, b) => b.stepIndex - a.stepIndex);
      if (prior.length === 0) return root;
      return `${root}-OP${prior[0].stepIndex}-REM`;
    }
    return resolvePullTag(step, false);
  };

  const workingStockTag = (boardTag: string, stepIndex: number) => {
    const step = physicalSteps.find((s) => s.boardTag === boardTag && s.stepIndex === stepIndex);
    if (!step) return nestRootTag(boardTag);
    return resolvePullTag(step, true);
  };

  const remTagForStep = (
    boardTag: string,
    stepIndex: number,
    isLast: boolean,
    reusable: boolean,
    kind: 'rem' | 'strip' | 'aside' = 'rem'
  ) => {
    const root = nestRootTag(boardTag);
    if (kind === 'strip') return `${root}-OP${stepIndex}-STRIP`;
    if (kind === 'aside') return `${root}-OP${stepIndex}-ASIDE`;
    if (isLast) {
      return `${root}-OP${stepIndex}-${reusable ? 'OFFCUT' : 'WASTE'}`;
    }
    return `${root}-OP${stepIndex}-REM`;
  };

  const executeAtomicInventoryUpdate = () => {
    if (!confirmStep) return;

    const opKey = `${activeProjectName}-${confirmStep.stepIndex}-${confirmStep.boardTag}`;
    if (completedOperations.includes(opKey)) {
      toast.error('Operation already completed!');
      return;
    }

    const stepsOnBoard = physicalSteps.filter((s) => s.boardTag === confirmStep.boardTag);
    const completedOnBoard = stepsOnBoard.filter((s) =>
      completedOperations.includes(`${activeProjectName}-${s.stepIndex}-${s.boardTag}`)
    ).length;
    const isFirstOnBoard = completedOnBoard === 0;
    const isLastOnBoard = completedOnBoard + 1 >= stepsOnBoard.length;
    const pullTag = workingStockTag(confirmStep.boardTag, confirmStep.stepIndex);
    const sourceLot =
      findSourceLot(confirmStep.boardTag, boards) || findSourceLot(pullTag, boards);
    const defectFields = {
      defects: sourceLot?.defects?.length ? [...sourceLot.defects] : undefined,
      defectNotes: sourceLot?.defectNotes?.trim() || undefined,
    };

    const timestamp = new Date().toISOString();
    const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const root = nestRootTag(confirmStep.boardTag);
    const isRip = confirmStep.opKind === 'rip';
    const isBlank = confirmStep.opKind === 'blank';
    const isFinished = isFinishedPlacement(confirmStep);
    const newRecords: Board[] = [];
    let nextPullHint: string | null = null;

    const pushBoard = (partial: Omit<Board, 'createdAt'> & { createdAt?: string }) => {
      newRecords.push({ ...defectFields, ...partial, createdAt: timestamp });
    };

    // Every step that produces a finished component (crosscut, or rip from an exact-length blank) yields a PART record
    if (isFinished) {
      pushBoard({
        id: `part-${uid()}`,
        tagId: `${root}-OP${confirmStep.stepIndex}-PART`,
        species: confirmStep.species,
        source: confirmStep.source,
        dimensions: {
          length: confirmStep.cutLen,
          width: confirmStep.cutWid,
          thickness: confirmStep.thickness,
        },
        length: confirmStep.cutLen,
        width: confirmStep.cutWid,
        thickness: confirmStep.thickness,
        quantity: 1,
        location: confirmStep.location,
        status: 'active',
        classification: 'finished_piece',
        parentBoardId: pullTag,
        originProject: activeProjectName,
        notes: `Finished piece: ${confirmStep.partName}`,
      });
    }

    const remLenMm = displayToMm(customRemLen, unitSystem);
    const remWidMm = displayToMm(customRemWid, unitSystem);
    const isReusable = overrideClassification === 'reusable_offcut';
    const asideLen = confirmStep.edgeLen || 0;
    const asideWid = confirmStep.edgeWid || 0;

    if (isBlank) {
      // Working blank (short full-width piece to rip next)
      const blankTag = remTagForStep(confirmStep.boardTag, confirmStep.stepIndex, false, true, 'strip');
      nextPullHint = blankTag;
      pushBoard({
        id: `blank-${uid()}`,
        tagId: blankTag,
        species: confirmStep.species,
        source: confirmStep.source,
        dimensions: {
          length: confirmStep.cutLen,
          width: confirmStep.cutWid,
          thickness: confirmStep.thickness,
        },
        length: confirmStep.cutLen,
        width: confirmStep.cutWid,
        thickness: confirmStep.thickness,
        quantity: 1,
        location: confirmStep.location,
        status: 'active',
        classification: 'reusable_offcut',
        parentBoardId: pullTag,
        originProject: activeProjectName,
        notes: `Working blank, rip strip from this next`,
      });
      // Long continuous offcut left on the original board
      if (remLenMm > 0.5 && remWidMm > 0.5) {
        const longTag = remTagForStep(
          confirmStep.boardTag,
          confirmStep.stepIndex,
          false,
          isReusable,
          'aside'
        );
        pushBoard({
          id: `long-${uid()}`,
          tagId: longTag,
          species: confirmStep.species,
          source: confirmStep.source,
          dimensions: {
            length: Number(remLenMm.toFixed(1)),
            width: Number(remWidMm.toFixed(1)),
            thickness: confirmStep.thickness,
          },
          length: Number(remLenMm.toFixed(1)),
          width: Number(remWidMm.toFixed(1)),
          thickness: confirmStep.thickness,
          quantity: 1,
          location: confirmStep.location,
          status: 'active',
          classification: isReusable ? 'reusable_offcut' : 'waste',
          parentBoardId: pullTag,
          originProject: activeProjectName,
          notes: `Continuous offcut preserved by blank-first cut`,
        });
      }
    } else if (isRip) {
      // Only create an intermediate working strip when this rip is NOT already a finished part
      if (!isFinished && remLenMm > 0.5 && remWidMm > 0.5) {
        const stripTag = remTagForStep(confirmStep.boardTag, confirmStep.stepIndex, false, true, 'strip');
        nextPullHint = stripTag;
        pushBoard({
          id: `strip-${uid()}`,
          tagId: stripTag,
          species: confirmStep.species,
          source: confirmStep.source,
          dimensions: {
            length: Number(remLenMm.toFixed(1)),
            width: Number(remWidMm.toFixed(1)),
            thickness: confirmStep.thickness,
          },
          length: Number(remLenMm.toFixed(1)),
          width: Number(remWidMm.toFixed(1)),
          thickness: confirmStep.thickness,
          quantity: 1,
          location: confirmStep.location,
          status: 'active',
          classification: 'reusable_offcut',
          parentBoardId: pullTag,
          originProject: activeProjectName,
          notes: `Working strip after rip, crosscut parts from this`,
        });
      }
      // Odd piece set aside for later rips / leftover from blank
      const effAsideLen = isFinished && remLenMm > 0.5 ? remLenMm : asideLen;
      const effAsideWid = isFinished && remWidMm > 0.5 ? remWidMm : asideWid;
      if (effAsideLen > 0.5 && effAsideWid > 0.5) {
        const asideTag = remTagForStep(confirmStep.boardTag, confirmStep.stepIndex, false, true, 'aside');
        if (isFinished) nextPullHint = asideTag;
        const asideWaste =
          effAsideLen < offcutSettings.minLength && effAsideWid < offcutSettings.minWidth;
        pushBoard({
          id: `aside-${uid()}`,
          tagId: asideTag,
          species: confirmStep.species,
          source: confirmStep.source,
          dimensions: {
            length: Number(effAsideLen.toFixed(1)),
            width: Number(effAsideWid.toFixed(1)),
            thickness: confirmStep.thickness,
          },
          length: Number(effAsideLen.toFixed(1)),
          width: Number(effAsideWid.toFixed(1)),
          thickness: confirmStep.thickness,
          quantity: 1,
          location: confirmStep.location,
          status: asideWaste ? 'consumed' : 'active',
          classification: asideWaste ? 'waste' : 'reusable_offcut',
          parentBoardId: pullTag,
          originProject: activeProjectName,
          notes: `Set-aside odd piece after rip, use for next strip / leftover`,
        });
      }
    } else if (remLenMm > 0.5 && remWidMm > 0.5) {
      // Remaining length of the strip after this finished part
      nextPullHint = remTagForStep(
        confirmStep.boardTag,
        confirmStep.stepIndex,
        isLastOnBoard,
        isReusable,
        'rem'
      );
      pushBoard({
        id: `rem-${uid()}`,
        tagId: nextPullHint,
        species: confirmStep.species,
        source: confirmStep.source,
        dimensions: {
          length: Number(remLenMm.toFixed(1)),
          width: Number(remWidMm.toFixed(1)),
          thickness: confirmStep.thickness,
        },
        length: Number(remLenMm.toFixed(1)),
        width: Number(remWidMm.toFixed(1)),
        thickness: confirmStep.thickness,
        quantity: 1,
        location: confirmStep.location,
        status: isLastOnBoard && !isReusable ? 'consumed' : 'active',
        classification: isLastOnBoard
          ? overrideClassification || 'reusable_offcut'
          : 'reusable_offcut',
        parentBoardId: pullTag,
        originProject: activeProjectName,
        notes: isLastOnBoard
          ? `Final remnant from ${root}`
          : `Strip remnant after step ${confirmStep.stepIndex}`,
      });
    }

    store.processCuttingOperation(opKey, newRecords, {
      takeFromLotTag: isFirstOnBoard ? confirmStep.boardTag : undefined,
      consumeExactTags: !isFirstOnBoard && pullTag !== nestRootTag(confirmStep.boardTag) ? [pullTag] : [],
    });

    const doneFinished =
      finishedLogged + (isFinished ? 1 : 0);
    toast.success(
      isBlank && nextPullHint
        ? `Blank cut, long offcut saved, rip from ${nextPullHint}`
        : isRip && !isFinished && nextPullHint
          ? `Rip complete, crosscut from ${nextPullHint}. Finished still ${doneFinished}/${finishedSteps.length}`
          : isFinished
            ? `Finished ${doneFinished}/${finishedSteps.length} saved${nextPullHint ? `, next pull ${nextPullHint}` : ''}`
            : isLastOnBoard
              ? `Board sequence finished, ${doneFinished}/${finishedSteps.length} finished pieces.`
              : 'Cut complete, inventory updated.'
    );
    setConfirmStep(null);
  };

  if (activeParts.length === 0) {
    return (
      <div className="bg-[#1e2228] border border-gray-800 p-8 rounded-2xl max-w-xl mx-auto text-center space-y-3 shadow-xl font-sans">
        <h2 className="text-base font-bold text-white">No cut list yet</h2>
        <p className="text-xs text-gray-400">
          Add required parts to this project, then generate cutting instructions.
        </p>
      </div>
    );
  }

  if (physicalSteps.length === 0) {
    return (
      <div className="bg-[#1e2228] border border-red-500/40 p-8 rounded-2xl max-w-xl mx-auto text-center space-y-4 shadow-2xl font-sans">
        <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-wide">NO SUITABLE STOCK AVAILABLE</h2>
        <p className="text-xs text-gray-400 font-mono leading-relaxed">
          No board matches the species and dimensions for this cut list. Log suitable timber in Quick Log.
        </p>
        {plan.rejectedBoards.length > 0 && (
          <ul className="text-left text-[11px] text-gray-400 font-mono space-y-1 max-w-sm mx-auto">
            {plan.rejectedBoards.slice(0, 5).map(({ board, reason }) => (
              <li key={board.id}>
                <span className="text-orange-400">{board.tagId}</span>: {reason}
              </li>
            ))}
          </ul>
        )}
        {unallocatedExplain.length > 0 && (
          <ul className="text-left text-[11px] text-amber-200/90 font-sans space-y-2 max-w-lg mx-auto">
            {unallocatedExplain.map(({ piece, reason }) => (
              <li
                key={piece.id}
                className="rounded-lg border border-amber-700/40 bg-amber-950/30 px-3 py-2"
              >
                <strong className="text-amber-300">
                  {piece.name}
                </strong>{' '}
                <span className="text-gray-400">
                  ({piece.species}, {formatDimsLWT(piece.length, piece.width, piece.thickness || 0, unitSystem)})
                </span>
                <div className="mt-1 text-gray-300">{reason}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div id="timbervault-cut-sheets" className="space-y-6 font-sans">
      {useSavedPlan && (
        <div className="no-print bg-emerald-950/30 border border-emerald-700/40 px-4 py-2.5 rounded-xl text-xs text-emerald-200/90 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          Using the cutting plan saved with this project
          {activeCuttingPlan?.savedAt
            ? ` (${new Date(activeCuttingPlan.savedAt).toLocaleString()})`
            : ''}
          . Confirmed cuts keep this sequence until you regenerate or edit parts.
        </div>
      )}
      {unallocatedExplain.length > 0 && (
        <div className="no-print bg-red-950/40 border border-red-600/50 p-4 rounded-xl space-y-3">
          <div className="flex items-start gap-2 text-red-300 text-sm font-bold">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            {unallocatedExplain.length} part
            {unallocatedExplain.length === 1 ? '' : 's'} not in these cut sheets
          </div>
          <p className="text-xs text-red-200/80">
            The steps below only cut parts that fit logged stock. Pause the project if you need to
            buy stock first.
          </p>
          <ul className="space-y-2">
            {unallocatedExplain.map(({ piece, reason }) => (
              <li
                key={piece.id}
                className="text-xs bg-[#121417] border border-red-800/40 rounded-lg px-3 py-2.5"
              >
                <div className="font-bold text-white">
                  {piece.name}{' '}
                  <span className="text-orange-400 font-normal">
                    {piece.species} ·{' '}
                    {formatDimsLWT(piece.length, piece.width, piece.thickness || 0, unitSystem)}
                  </span>
                </div>
                <div className="text-amber-200/90 mt-1">{reason}</div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              const reasonText = unallocatedExplain
                .map(
                  ({ piece, reason }) =>
                    `• ${piece.name} (${piece.species}) ${Math.round(piece.length)}×${Math.round(piece.width)} mm, ${reason}`
                )
                .join('\n');
              const result = pauseActiveProject(reasonText);
              if (result.ok) {
                toast.success(
                  `Paused "${result.name}". Buy the missing stock, then Resume from Open a saved project.`
                );
              } else {
                toast.error(result.message);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Pause project (buy stock later)
          </button>
        </div>
      )}

      <div className="no-print bg-[#1e2228] border border-gray-800 p-4 rounded-xl shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-mono text-gray-300">
            Cut plan, Project:{' '}
            <strong className="text-white uppercase">{activeProjectName}</strong>
            <span className="text-gray-500">, offcuts tagged to this name</span>
            <span className="text-emerald-400">
              {' '}
             , finished {finishedLogged}/{finishedSteps.length}
            </span>
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={cutHistory.length === 0}
              onClick={() => {
                const result = undoLastCut();
                if (result.ok) toast.success(result.message);
                else toast.error(result.message);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer"
              title="Restore inventory to before the last confirmed cut"
            >
              <Undo2 className="w-4 h-4" /> Undo last cut
            </button>
            <button
              type="button"
              disabled={cutHistory.length === 0}
              onClick={async () => {
                const ok = await notify.confirm({
                  title: 'Undo all cuts?',
                  message: `Undo all ${cutHistory.length} confirmed cut${cutHistory.length === 1 ? '' : 's'}?\n\nThis puts parent boards back in stock and removes finished pieces / cut offcuts from those confirms.`,
                  confirmLabel: 'Undo all',
                  danger: true,
                });
                if (!ok) return;
                const result = undoAllCuts();
                if (result.ok) toast.success(result.message);
                else toast.error(result.message);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-amber-300 rounded-xl text-xs font-bold cursor-pointer"
              title="Undo every confirmed cut and restore stock"
            >
              <Undo2 className="w-4 h-4" /> Undo all cuts
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-orange-600/30 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print cutting sheets ({physicalSteps.length})
            </button>
          </div>
        </div>

        <div className="bg-[#121417] p-3 rounded-lg border border-gray-800 text-xs font-mono space-y-2">
          <div className="text-orange-400 font-bold flex items-center gap-2">
            <Box className="w-4 h-4" /> Allocated stock boards
          </div>
          <div className="flex flex-wrap gap-2">
            {plan.usedBoardTags.map((tag) => {
              const board = boards.find((b) => b.tagId === tag || b.id === tag);
              return (
                <div
                  key={tag}
                  className="bg-[#1e2228] p-2.5 rounded border border-emerald-500/50 text-white"
                >
                  <div>
                    Tag: <strong className="text-emerald-400">{tag}</strong>
                  </div>
                  {board && (
                    <div className="text-gray-300 text-[11px]">
                      {board.species} ({formatDimsLWT(board.length, board.width, board.thickness, unitSystem)}) ,{' '}
                      {board.source}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {plan.explanation && (
            <div className="pt-2 border-t border-gray-800 text-[11px] text-gray-300 font-sans">
              <strong className="text-emerald-400">Cutting strategy:</strong> {plan.explanation}
            </div>
          )}
          {plan.betterAlternative && (
            <div className="mt-2 p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/50 text-[11px] text-amber-200 font-sans flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <strong className="text-amber-300">Better sequence available:</strong>{' '}
                {plan.betterAlternative.reason}
              </div>
              {setActiveStrategy && (
                <button
                  type="button"
                  onClick={() => setActiveStrategy(plan.betterAlternative!.strategy)}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-[11px] shrink-0 cursor-pointer"
                >
                  Switch to {plan.betterAlternative.label}
                </button>
              )}
            </div>
          )}
          {plan.offcuts && plan.offcuts.length > 0 && (
            <div className="pt-2 border-t border-gray-800 space-y-1">
              <div className="text-[11px] text-gray-400 font-sans font-semibold">
                Remaining material from this plan:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {plan.offcuts.map((o, idx) => (
                  <span
                    key={`${o.boardTag}-${idx}`}
                    className={`px-2 py-0.5 rounded text-[11px] border ${
                      o.tier === 'reusable'
                        ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300'
                        : o.tier === 'potentially_reusable'
                          ? 'bg-sky-950/40 border-sky-600/50 text-sky-300'
                          : 'bg-zinc-900 border-zinc-700 text-gray-400'
                    }`}
                  >
                    {o.boardTag}: {formatDim(o.length, unitSystem)} × {formatDim(o.width, unitSystem)} (
                    {o.tier === 'reusable'
                      ? 'reusable offcut'
                      : o.tier === 'potentially_reusable'
                        ? 'small reusable'
                        : 'scrap'}
                    )
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {physicalSteps.map((step) => {
          const opKey = `${activeProjectName}-${step.stepIndex}-${step.boardTag}`;
          const isCompleted = completedOperations.includes(opKey);

          const isRip = step.opKind === 'rip';
          const isBlank = step.opKind === 'blank';
          const isFinishedStep = isFinishedPlacement(step);
          const isSetup = !isFinishedStep;
          const nestTag = nestRootTag(step.boardTag);
          const stepsOnThisNest = physicalSteps.filter((s) => nestRootTag(s.boardTag) === nestTag);
          const pullTag = plannedPullTag(step.boardTag, step.stepIndex);
          const isFirstCutOnBoard = !stepsOnThisNest.some((s) => s.stepIndex < step.stepIndex);
          const isLastOnThisNest =
            stepsOnThisNest.filter((s) => s.stepIndex <= step.stepIndex).length >=
            stepsOnThisNest.length;
          const nextRemLabel = remTagForStep(
            nestTag,
            step.stepIndex,
            isLastOnThisNest,
            true,
            isBlank ? 'strip' : isRip ? (isFinishedStep ? 'aside' : 'strip') : 'rem'
          );
          const partOrdinal =
            finishedSteps.findIndex(
              (s) => s.stepIndex === step.stepIndex && s.boardTag === step.boardTag
            ) + 1;

          return (
            <div
              key={`${step.boardTag}-${step.stepIndex}`}
              className="cut-sheet-page bg-white text-zinc-900 border-2 border-zinc-900 p-6 rounded-lg shadow-md space-y-5"
            >
              <div className="hidden print:flex items-center justify-between text-[11px] font-mono text-zinc-600 border-b border-zinc-300 pb-2 mb-1">
                <span>Logger cutting sheet</span>
                <span>{activeProjectName}</span>
              </div>
              <div className="flex justify-between items-center border-b-2 border-zinc-900 pb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="bg-zinc-900 text-white font-mono text-sm px-3 py-1 font-bold">
                    STEP {step.stepIndex} OF {physicalSteps.length}
                  </span>
                  <h2 className="text-lg font-black tracking-wide uppercase text-zinc-900">
                    {isBlank
                      ? `Blank cut (preserve long offcut): ${step.partName}`
                      : isRip && !isFinishedStep
                        ? `Rip only (no finished piece): ${step.partName}`
                        : isRip && isFinishedStep
                          ? `Finished piece ${partOrdinal}/${finishedSteps.length} (rip from blank): ${step.partName}`
                          : `Finished piece ${partOrdinal}/${finishedSteps.length}: ${step.partName}`}
                  </h2>
                </div>
                {isCompleted && (
                  <span className="bg-emerald-700 text-white text-xs px-3 py-1 font-bold rounded flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> COMPLETED
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                <div className="bg-zinc-50 p-4 border border-zinc-300 rounded space-y-1">
                  <div className="font-bold text-zinc-900 flex items-center gap-2 border-b border-zinc-300 pb-1 mb-2">
                    <Box className="w-4 h-4 text-orange-600" /> WHAT TO PULL (STOCK):
                  </div>
                  <div>
                    Tag Ref: <strong className="text-orange-700">{pullTag}</strong>
                  </div>
                  {!isFirstCutOnBoard && (
                    <div className="text-[11px] text-emerald-700 font-sans">
                      Same board {nestTag}, earlier parts already cut out (see grey on map).
                    </div>
                  )}
                  <div>
                    Species: <strong className="text-zinc-900">{step.species}</strong>
                  </div>
                  <div>
                    Location: <strong className="text-zinc-900">{step.location}</strong>
                  </div>
                  <div>
                    Original board:{' '}
                    <strong className="text-zinc-900">
                      {formatDimsLWT(step.stockLen, step.stockWid, step.thickness, unitSystem)}
                    </strong>
                  </div>
                  {(() => {
                    const lot =
                      findSourceLot(pullTag, boards) || findSourceLot(step.boardTag, boards);
                    const label = formatDefectsList(lot?.defects, lot?.defectNotes);
                    if (!label) return null;
                    return (
                      <div className="mt-2 rounded border border-amber-400 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-950 font-sans leading-snug">
                        <span className="font-bold uppercase tracking-wide">Defects: </span>
                        {label}. Plan cuts and assembly around these.
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-zinc-50 p-4 border border-zinc-300 rounded space-y-1">
                  <div className="font-bold text-zinc-900 flex items-center gap-2 border-b border-zinc-300 pb-1 mb-2">
                    <Scissors className="w-4 h-4 text-emerald-600" /> WHAT TO CUT:
                  </div>
                  {isBlank ? (
                    <>
                      <div>
                        Operation:{' '}
                        <strong className="text-zinc-900">
                          Crosscut a short blank, keep the rest of the board whole
                        </strong>
                      </div>
                      <div>
                        Blank size:{' '}
                        <strong className="text-zinc-900">
                          {formatDim(step.cutLen, unitSystem)} × {formatDim(step.cutWid, unitSystem)}
                        </strong>
                      </div>
                      <div>
                        Continuous offcut left:{' '}
                        <strong className="text-zinc-900">
                          {formatDim(step.remLen, unitSystem)} × {formatDim(step.remWid, unitSystem)}
                        </strong>
                      </div>
                    </>
                  ) : isRip ? (
                    <>
                      {isFinishedStep && (
                        <div>
                          Target Part: <strong className="text-zinc-900">{step.partName}</strong>
                        </div>
                      )}
                      <div>
                        Operation:{' '}
                        <strong className="text-zinc-900">
                          {isFinishedStep
                            ? `Rip finished piece (${formatDim(step.cutLen, unitSystem)} × ${formatDim(step.cutWid, unitSystem)}) from blank`
                            : 'Rip along the long edge (one pass)'}
                        </strong>
                      </div>
                      <div>
                        Fence / strip width:{' '}
                        <strong className="text-zinc-900">{formatDim(step.cutWid, unitSystem)}</strong>
                      </div>
                      {isFinishedStep && step.edgeWid > 0.5 && (
                        <div>
                          Remaining blank set aside:{' '}
                          <strong className="text-zinc-900">
                            {formatDim(step.edgeLen, unitSystem)} × {formatDim(step.edgeWid, unitSystem)}
                          </strong>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div>
                        Target Part: <strong className="text-zinc-900">{step.partName}</strong>
                      </div>
                      <div>
                        Cut size:{' '}
                        <strong className="text-zinc-900">
                          {formatDim(step.cutLen, unitSystem)} × {formatDim(step.cutWid, unitSystem)}
                          {step.rotated ? ' (rotated)' : ''}
                        </strong>
                      </div>
                      <div>
                        Position on board:{' '}
                        <strong className="text-zinc-900">
                          X: {formatDim(step.posX, unitSystem)}, Y: {formatDim(step.posY, unitSystem)}
                        </strong>
                      </div>
                    </>
                  )}
                  <div>
                    Saw Kerf: <strong className="text-zinc-900">{formatDim(step.kerf, unitSystem)}</strong>
                  </div>
                  <div className="pt-2 mt-2 border-t border-zinc-300 text-[11px] text-zinc-600 font-sans">
                    {isBlank
                      ? 'Blank-first: take only what you need now; leave one long continuous offcut.'
                      : isRip
                        ? 'Rip, strip in hand and odd piece set aside.'
                        : isFirstCutOnBoard
                          ? 'Crosscut from the strip, take this rectangle; leftover on the strip stays a shorter rectangle.'
                          : 'Hatch = removed. Cut letter = this crosscut. Dark gap = kerf.'}
                    {nextRemLabel ? (
                      <>
                        {' '}
                        Label leftover stock <strong className="text-emerald-700">{nextRemLabel}</strong>.
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="border-2 border-stone-900 bg-white p-1 print:border-black">
                <CutMapWorkshop
                  step={step}
                  allOnBoard={stepsOnThisNest}
                  unitSystem={unitSystem}
                  isCompleted={isCompleted}
                  projectName={activeProjectName}
                  pullTag={pullTag}
                  stepLabel={`STEP ${step.stepIndex} OF ${physicalSteps.length}`}
                />
              </div>

              <div className="border-t border-zinc-300 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs font-mono text-zinc-700 space-y-0.5">
                  {isBlank ? (
                    <>
                      <div>
                        • Crosscut a {formatDim(step.cutLen, unitSystem)} blank from the board.
                      </div>
                      <div>
                        • Leaves {formatDim(step.remLen, unitSystem)} continuous offcut, no finished
                        part yet.
                      </div>
                    </>
                  ) : isRip ? (
                    isFinishedStep ? (
                      <>
                        <div>
                          • Rip finished piece {partOrdinal} of {finishedSteps.length} from the short blank.
                        </div>
                        <div>
                          • Yields: <strong>{step.partName}</strong> (
                          {formatDim(step.cutLen, unitSystem)} × {formatDim(step.cutWid, unitSystem)}
                          ).
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          • Rip a {formatDim(step.cutWid, unitSystem)} strip, set the odd piece aside.
                        </div>
                        <div>
                          • No finished part yet, crosscuts after this add inventory pieces.
                        </div>
                      </>
                    )
                  ) : (
                    <>
                      <div>
                        • Crosscut finished piece {partOrdinal} of {finishedSteps.length}.
                      </div>
                      <div>
                        • Yields: <strong>{step.partName}</strong> (
                        {formatDim(step.cutLen, unitSystem)} × {formatDim(step.cutWid, unitSystem)}
                        ).
                      </div>
                    </>
                  )}
                </div>

                <div className="print:hidden w-full sm:w-auto">
                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => openConfirmationModal(step)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />{' '}
                      {isBlank
                        ? 'MARK BLANK CUT COMPLETE'
                        : isRip
                          ? 'MARK RIP COMPLETE & UPDATE INVENTORY'
                          : 'MARK CUT COMPLETE & UPDATE INVENTORY'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AppModal
        open={Boolean(confirmStep)}
        onClose={() => setConfirmStep(null)}
        title="Confirm physical cut"
        subtitle="Inventory update"
        size="lg"
      >
        {confirmStep && (
          <div className="space-y-5">
            <div className="space-y-3 text-xs font-mono bg-[#121417] p-4 rounded-xl border border-gray-800/80">
              <div className="flex justify-between border-b border-gray-800/50 pb-2">
                <span className="text-gray-400">Pull / cut from:</span>
                <strong className="text-orange-400">
                  {workingStockTag(confirmStep.boardTag, confirmStep.stepIndex)}
                </strong>
              </div>
              <div className="flex justify-between border-b border-gray-800/50 pb-2">
                <span className="text-gray-400">Original nest board:</span>
                <strong className="text-white">{confirmStep.boardTag}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-800/50 pb-2">
                <span className="text-gray-400">
                  {confirmStep.opKind === 'blank'
                    ? 'Blank cut (no finished piece):'
                    : confirmStep.opKind === 'rip'
                      ? 'Rip (no finished piece):'
                      : 'Finished piece:'}
                </span>
                <strong className="text-orange-400">{confirmStep.partName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Saw Kerf:</span>
                <strong className="text-red-400">{formatDim(confirmStep.kerf, unitSystem)}</strong>
              </div>
              {(() => {
                const lot =
                  findSourceLot(confirmStep.boardTag, boards) ||
                  findSourceLot(
                    workingStockTag(confirmStep.boardTag, confirmStep.stepIndex),
                    boards
                  );
                const label = formatDefectsList(lot?.defects, lot?.defectNotes);
                if (!hasDefects(lot?.defects, lot?.defectNotes) || !label) return null;
                return (
                  <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200 font-sans">
                    <span className="font-bold">Defects on this stock: </span>
                    {label}. Avoid placing critical faces over holes or weak spots.
                  </div>
                );
              })()}
            </div>

            <div className="space-y-4">
              {(() => {
                const stepsOnBoard = physicalSteps.filter(
                  (s) => s.boardTag === confirmStep.boardTag
                );
                const doneOnBoard = stepsOnBoard.filter((s) =>
                  completedOperations.includes(
                    `${activeProjectName}-${s.stepIndex}-${s.boardTag}`
                  )
                ).length;
                const isLast = doneOnBoard + 1 >= stepsOnBoard.length;
                const kind = confirmStep.opKind;
                const previewRem = remTagForStep(
                  confirmStep.boardTag,
                  confirmStep.stepIndex,
                  isLast,
                  overrideClassification === 'reusable_offcut',
                  kind === 'crosscut' ? 'rem' : 'strip'
                );
                return (
                  <p className="text-[11px] text-gray-400">
                    {kind === 'blank'
                      ? `Working blank → ${previewRem}; long continuous offcut saved as ASIDE.`
                      : kind === 'rip'
                        ? `Working strip will be tagged ${previewRem}; odd piece set aside as ASIDE.`
                        : isLast
                          ? `Final remnant / offcut will be tagged ${previewRem}.`
                          : `Leftover strip will be tagged ${previewRem}, that is what the next cut pulls.`}
                  </p>
                );
              })()}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Rem Length ({u})</label>
                  <input
                    type="number"
                    step="any"
                    value={customRemLen}
                    onChange={(e) => setCustomRemLen(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121417] border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Rem Width ({u})</label>
                  <input
                    type="number"
                    step="any"
                    value={customRemWid}
                    onChange={(e) => setCustomRemWid(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121417] border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <select
                value={overrideClassification || 'reusable_offcut'}
                onChange={(e) => setOverrideClassification(e.target.value as BoardClassification)}
                className="w-full bg-[#121417] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="reusable_offcut">Reusable Offcut</option>
                <option value="waste">Waste</option>
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmStep(null)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeAtomicInventoryUpdate}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirm & Update Stock
              </button>
            </div>
          </div>
        )}
      </AppModal>
    </div>
  );
}
