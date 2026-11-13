'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  useAppStore,
  Board,
  BoardClassification,
  partsFingerprint,
  type PlanLamination,
} from '@/lib/store';
import {
  createCuttingPlan,
  explainUnallocated,
  isFinishedPlacement,
  type CuttingPlan,
  type Placement,
} from '@/lib/cutting-engine';
import { expandLotsToStock, findSourceLot, type NestStock } from '@/lib/inventory-lots';
import { formatDefectsList, hasDefects } from '@/lib/defects';
import {
  Printer,
  CheckCircle2,
  CheckCheck,
  ShieldCheck,
  Scissors,
  Box,
  AlertTriangle,
  Undo2,
  Layers,
} from 'lucide-react';
import { notify, toast } from '@/lib/notify';
import { displayToMm, formatDim, formatDimsLWT, mmToDisplay, unitLabel } from '@/lib/units';
import AppModal from '@/components/AppModal';
import CutMapWorkshop from '@/components/CutMapWorkshop';

type Props = {
  /** When user confirmed thickness mismatch, nest without enforcing part thickness */
  ignorePartThickness?: boolean;
  /** Part ids accepted for face-lamination — nest without thickness filter */
  laminatePartIds?: string[];
  /** Accepted laminate layer pairings to allocate + show on sheets */
  laminations?: PlanLamination[];
};

function rootPartIdFromPiece(pieceId: string, partIds: Set<string>) {
  if (partIds.has(pieceId)) return pieceId;
  const dash = pieceId.lastIndexOf('-');
  if (dash > 0) {
    const maybe = pieceId.slice(0, dash);
    if (partIds.has(maybe)) return maybe;
  }
  return pieceId;
}

export default function CutListDrawing({
  ignorePartThickness = false,
  laminatePartIds = [],
  laminations: laminationsProp = [],
}: Props) {
  const store = useAppStore();
  const boards = store?.boards || [];
  const activeProjectName = store?.activeProjectName || 'New Project';
  const activeParts = store?.activeParts || [];
  const completedOperations = store?.completedOperations || [];
  const cutHistory = store?.cutHistory || [];
  const activeCuttingPlan = store.activeCuttingPlan;
  const saveCuttingPlanToActiveProject = store.saveCuttingPlanToActiveProject;
  const allocateStockByTags = store.allocateStockByTags;
  const undoLastCut = store.undoLastCut;
  const undoAllCuts = store.undoAllCuts;
  const laminations =
    laminationsProp.length > 0
      ? laminationsProp
      : activeCuttingPlan?.laminations || [];
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
    // Idle / regenerate: always take current inventory (boards logged while paused, edits, etc.)
    if (!cuttingInProgress) {
      setLockedStock(liveStock);
      return;
    }
    // Mid-job: drop locked units whose parent lot was deleted from inventory
    setLockedStock((prev) => {
      if (!prev) return liveStock;
      const boardIds = new Set(boards.map((b) => b.id));
      const next = prev.filter((s) => {
        const parentId = String(s.id).split('#')[0];
        return boardIds.has(parentId) || boardIds.has(s.id);
      });
      return next.length === prev.length ? prev : next;
    });
  }, [liveStock, cuttingInProgress, activeProjectName, partsKey, boards]);

  // Plan cleared (Generate / Resume) → unlock immediately even if a prior confirm frame lingered
  useEffect(() => {
    if (!activeCuttingPlan) {
      setLockedStock(liveStock);
    }
  }, [activeCuttingPlan, liveStock]);

  const nestStock = lockedStock ?? liveStock;

  const nestRootFromTag = (tag: string) =>
    tag.replace(/(?:-OP\d+-(?:REM|EDGE|OFFCUT|WASTE|PART|ASIDE|STRIP))+$/gi, '');

  // Saved plan is only valid while its allocated lots still exist in inventory.
  const savedPlanStockPresent = useMemo(() => {
    const tags = activeCuttingPlan?.usedBoardTags || [];
    if (tags.length === 0) return true;
    return tags.every((tag) => {
      const root = nestRootFromTag(tag);
      return boards.some(
        (b) =>
          b.tagId === tag ||
          b.id === tag ||
          b.tagId === root ||
          nestRootFromTag(b.tagId || '') === root
      );
    });
  }, [activeCuttingPlan, boards]);

  // Use the saved nest only when it still matches the current cut list and stock.
  // Stale plans (species edits or deleted lots) must re-nest from live inventory.
  const useSavedPlan =
    (activeCuttingPlan?.placements?.length || 0) > 0 &&
    savedPlanStockPresent &&
    (!activeCuttingPlan?.partsFingerprint ||
      activeCuttingPlan.partsFingerprint === partsKey);

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
        thickness:
          ignorePartThickness || laminatePartIds.includes(p.id) ? 0 : p.thickness ?? 0,
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
    laminatePartIds,
    activeKerfMm,
    activeStrategy,
    offcutSettings,
  ]);

  // Persist freshly nested plan onto the project (confirmed cuts keep using this copy)
  useEffect(() => {
    if (useSavedPlan) return;
    if (plan.placements.length === 0 && plan.unallocated.length === 0) return;
    const lamTags = Array.from(
      new Set(laminations.flatMap((l) => l.boardTags || []).filter(Boolean))
    );
    const usedBoardTags = Array.from(
      new Set([...(plan.usedBoardTags || []), ...lamTags])
    );
    saveCuttingPlanToActiveProject({
      savedAt: new Date().toISOString(),
      partsFingerprint: partsKey,
      kerfMm: activeKerfMm,
      strategy: activeStrategy,
      explanation: plan.explanation,
      usedBoardTags,
      placements: plan.placements,
      laminations: laminations.length ? laminations : undefined,
      unallocated: plan.unallocated.map((p) => ({
        id: p.id,
        name: p.name,
        species: p.species,
        length: p.length,
        width: p.width,
        thickness: p.thickness || 0,
      })),
    });
    // Reserve laminate layers only after nest used them while still active
    if (lamTags.length > 0) {
      allocateStockByTags(lamTags);
    }
  }, [
    useSavedPlan,
    plan,
    partsKey,
    activeKerfMm,
    activeStrategy,
    laminations,
    saveCuttingPlanToActiveProject,
    allocateStockByTags,
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
        title: 'Some parts did not fit',
        message: `${reasonText}\n\nThe steps below only include parts that fit on current stock. You can pause until you log more boards, or continue and cut what fits now.`,
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

  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = 'Precision cut lists by Logger™. Less guesswork, zero wasted timber.';
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 500);
  };

  const defaultRemForStep = (step: Placement) => {
    const remL = step.opKind === 'rip' && isFinishedPlacement(step) ? step.edgeLen : step.remLen;
    const remW = step.opKind === 'rip' && isFinishedPlacement(step) ? step.edgeWid : step.remWid;
    const isWaste =
      remL < offcutSettings.minLength && remW < offcutSettings.minWidth;
    return {
      remLen: mmToDisplay(remL, unitSystem, unitSystem === 'imperial' ? 2 : 1),
      remWid: mmToDisplay(remW, unitSystem, unitSystem === 'imperial' ? 2 : 1),
      classification: (isWaste ? 'waste' : 'reusable_offcut') as BoardClassification,
    };
  };

  const openConfirmationModal = (step: Placement) => {
    setConfirmStep(step);
    const defaults = defaultRemForStep(step);
    setCustomRemLen(defaults.remLen);
    setCustomRemWid(defaults.remWid);
    setOverrideClassification(defaults.classification);
  };

  /** Always the original nest board tag (never …-OPn-REM/EDGE/PART/…). */
  const nestRootTag = (tag: string) =>
    tag.replace(/(?:-OP\d+-(?:REM|EDGE|OFFCUT|WASTE|PART|ASIDE|STRIP))+$/gi, '');

  const opDone = (s: Placement, ops?: string[], projectName?: string) => {
    const list = ops ?? completedOperations;
    const proj = projectName ?? activeProjectName;
    return list.includes(`${proj}-${s.stepIndex}-${s.boardTag}`);
  };

  /**
   * What to pull for this step (shop flow):
   * - First rip: original board
   * - Crosscuts on a strip: that strip's REM chain
   * - Later rip: the set-aside odd piece (EDGE/ASIDE) from the previous rip, not strip end-waste
   */
  const resolvePullTag = (step: Placement, requireCompleted: boolean) => {
    const root = nestRootTag(step.boardTag);
    // Live store ops when chaining cuts (mark-all) so prior steps count as done.
    const live = requireCompleted ? useAppStore.getState() : null;
    const opsForPull = live?.completedOperations ?? completedOperations;
    const projectForPull = live?.activeProjectName || activeProjectName;
    const prior = physicalSteps
      .filter(
        (s) =>
          nestRootTag(s.boardTag) === root &&
          s.stepIndex < step.stepIndex &&
          (!requireCompleted || opDone(s, opsForPull, projectForPull))
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

  const partIdSet = useMemo(() => new Set(activeParts.map((p) => p.id)), [activeParts]);

  const completeCutStep = (
    step: Placement,
    remLenDisplay: number,
    remWidDisplay: number,
    classification: BoardClassification | null,
    opts?: { quiet?: boolean }
  ): { ok: true; lamination?: PlanLamination } | { ok: false; message: string } => {
    const live = useAppStore.getState();
    const opsNow = live.completedOperations;
    const boardsNow = live.boards;
    const projectName = live.activeProjectName || activeProjectName;
    const planLams =
      live.activeCuttingPlan?.laminations?.length
        ? live.activeCuttingPlan.laminations
        : laminations;

    const opKey = `${projectName}-${step.stepIndex}-${step.boardTag}`;
    if (opsNow.includes(opKey)) {
      return { ok: false, message: 'Operation already completed!' };
    }

    const stepsOnBoard = physicalSteps.filter((s) => s.boardTag === step.boardTag);
    const completedOnBoard = stepsOnBoard.filter((s) =>
      opsNow.includes(`${projectName}-${s.stepIndex}-${s.boardTag}`)
    ).length;
    const isFirstOnBoard = completedOnBoard === 0;
    const isLastOnBoard = completedOnBoard + 1 >= stepsOnBoard.length;
    const pullTag = resolvePullTag(step, true);
    const sourceLot =
      findSourceLot(step.boardTag, boardsNow) || findSourceLot(pullTag, boardsNow);
    const rootExists = boardsNow.some(
      (b) =>
        b.tagId === nestRootTag(step.boardTag) ||
        b.id === step.boardTag ||
        nestRootTag(b.tagId || '') === nestRootTag(step.boardTag)
    );
    if (!sourceLot && !rootExists) {
      return {
        ok: false,
        message: `Stock ${pullTag || step.boardTag} is no longer in inventory. Re-generate the cut plan from current stock.`,
      };
    }
    const defectFields = {
      defects: sourceLot?.defects?.length ? [...sourceLot.defects] : undefined,
      defectNotes: sourceLot?.defectNotes?.trim() || undefined,
    };

    const timestamp = new Date().toISOString();
    const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const root = nestRootTag(step.boardTag);
    const isRip = step.opKind === 'rip';
    const isBlank = step.opKind === 'blank';
    const isFinished = isFinishedPlacement(step);
    const newRecords: Board[] = [];
    let nextPullHint: string | null = null;

    const rootId = rootPartIdFromPiece(step.pieceId, partIdSet);
    const lam = planLams.find(
      (l) =>
        l.partId === rootId ||
        l.partId === step.pieceId ||
        (l.partName &&
          (step.partName === l.partName || step.partName.startsWith(`${l.partName} (`)))
    );

    const pushBoard = (partial: Omit<Board, 'createdAt'> & { createdAt?: string }) => {
      newRecords.push({ ...defectFields, ...partial, createdAt: timestamp });
    };

    // Every step that produces a finished component (crosscut, or rip from an exact-length blank) yields a PART record
    if (isFinished) {
      const finishedThickness = lam?.targetThickness || step.thickness;
      pushBoard({
        id: `part-${uid()}`,
        tagId: `${root}-OP${step.stepIndex}-PART`,
        species: step.species,
        source: step.source,
        dimensions: {
          length: step.cutLen,
          width: step.cutWid,
          thickness: finishedThickness,
        },
        length: step.cutLen,
        width: step.cutWid,
        thickness: finishedThickness,
        quantity: 1,
        location: step.location,
        status: 'active',
        classification: 'finished_piece',
        parentBoardId: pullTag,
        originProject: projectName,
        notes: lam
          ? `Finished piece: ${step.partName} (laminated from ${lam.boardTags.join(' + ')})`
          : `Finished piece: ${step.partName}`,
      });
    }

    const remLenMm = displayToMm(remLenDisplay, unitSystem);
    const remWidMm = displayToMm(remWidDisplay, unitSystem);
    const isReusable = classification === 'reusable_offcut';
    const asideLen = step.edgeLen || 0;
    const asideWid = step.edgeWid || 0;

    if (isBlank) {
      // Working blank (short full-width piece to rip next)
      const blankTag = remTagForStep(step.boardTag, step.stepIndex, false, true, 'strip');
      nextPullHint = blankTag;
      pushBoard({
        id: `blank-${uid()}`,
        tagId: blankTag,
        species: step.species,
        source: step.source,
        dimensions: {
          length: step.cutLen,
          width: step.cutWid,
          thickness: step.thickness,
        },
        length: step.cutLen,
        width: step.cutWid,
        thickness: step.thickness,
        quantity: 1,
        location: step.location,
        status: 'active',
        classification: 'reusable_offcut',
        parentBoardId: pullTag,
        originProject: projectName,
        notes: `Working blank, rip strip from this next`,
      });
      // Long continuous offcut left on the original board
      if (remLenMm > 0.5 && remWidMm > 0.5) {
        const longTag = remTagForStep(step.boardTag, step.stepIndex, false, isReusable, 'aside');
        pushBoard({
          id: `long-${uid()}`,
          tagId: longTag,
          species: step.species,
          source: step.source,
          dimensions: {
            length: Number(remLenMm.toFixed(1)),
            width: Number(remWidMm.toFixed(1)),
            thickness: step.thickness,
          },
          length: Number(remLenMm.toFixed(1)),
          width: Number(remWidMm.toFixed(1)),
          thickness: step.thickness,
          quantity: 1,
          location: step.location,
          status: 'active',
          classification: isReusable ? 'reusable_offcut' : 'waste',
          parentBoardId: pullTag,
          originProject: projectName,
          notes: `Continuous offcut preserved by blank-first cut`,
        });
      }
    } else if (isRip) {
      // Only create an intermediate working strip when this rip is NOT already a finished part
      if (!isFinished && remLenMm > 0.5 && remWidMm > 0.5) {
        const stripTag = remTagForStep(step.boardTag, step.stepIndex, false, true, 'strip');
        nextPullHint = stripTag;
        pushBoard({
          id: `strip-${uid()}`,
          tagId: stripTag,
          species: step.species,
          source: step.source,
          dimensions: {
            length: Number(remLenMm.toFixed(1)),
            width: Number(remWidMm.toFixed(1)),
            thickness: step.thickness,
          },
          length: Number(remLenMm.toFixed(1)),
          width: Number(remWidMm.toFixed(1)),
          thickness: step.thickness,
          quantity: 1,
          location: step.location,
          status: 'active',
          classification: 'reusable_offcut',
          parentBoardId: pullTag,
          originProject: projectName,
          notes: `Working strip after rip, crosscut parts from this`,
        });
      }
      // Odd piece set aside for later rips / leftover from blank
      const effAsideLen = isFinished && remLenMm > 0.5 ? remLenMm : asideLen;
      const effAsideWid = isFinished && remWidMm > 0.5 ? remWidMm : asideWid;
      if (effAsideLen > 0.5 && effAsideWid > 0.5) {
        const asideTag = remTagForStep(step.boardTag, step.stepIndex, false, true, 'aside');
        if (isFinished) nextPullHint = asideTag;
        const asideWaste =
          effAsideLen < offcutSettings.minLength && effAsideWid < offcutSettings.minWidth;
        pushBoard({
          id: `aside-${uid()}`,
          tagId: asideTag,
          species: step.species,
          source: step.source,
          dimensions: {
            length: Number(effAsideLen.toFixed(1)),
            width: Number(effAsideWid.toFixed(1)),
            thickness: step.thickness,
          },
          length: Number(effAsideLen.toFixed(1)),
          width: Number(effAsideWid.toFixed(1)),
          thickness: step.thickness,
          quantity: 1,
          location: step.location,
          status: asideWaste ? 'consumed' : 'active',
          classification: asideWaste ? 'waste' : 'reusable_offcut',
          parentBoardId: pullTag,
          originProject: projectName,
          notes: `Set-aside odd piece after rip, use for next strip / leftover`,
        });
      }
    } else if (remLenMm > 0.5 && remWidMm > 0.5) {
      // Remaining length of the strip after this finished part
      nextPullHint = remTagForStep(
        step.boardTag,
        step.stepIndex,
        isLastOnBoard,
        isReusable,
        'rem'
      );
      pushBoard({
        id: `rem-${uid()}`,
        tagId: nextPullHint,
        species: step.species,
        source: step.source,
        dimensions: {
          length: Number(remLenMm.toFixed(1)),
          width: Number(remWidMm.toFixed(1)),
          thickness: step.thickness,
        },
        length: Number(remLenMm.toFixed(1)),
        width: Number(remWidMm.toFixed(1)),
        thickness: step.thickness,
        quantity: 1,
        location: step.location,
        status: isLastOnBoard && !isReusable ? 'consumed' : 'active',
        classification: isLastOnBoard
          ? classification || 'reusable_offcut'
          : 'reusable_offcut',
        parentBoardId: pullTag,
        originProject: projectName,
        notes: isLastOnBoard
          ? `Final remnant from ${root}`
          : `Strip remnant after step ${step.stepIndex}`,
      });
    }

    const secondaryLamTags =
      isFinished && lam
        ? lam.boardTags.filter(
            (t) =>
              t &&
              t !== step.boardTag &&
              t !== pullTag &&
              nestRootTag(t) !== nestRootTag(step.boardTag)
          )
        : [];

    live.processCuttingOperation(opKey, newRecords, {
      takeFromLotTag: isFirstOnBoard ? step.boardTag : undefined,
      takeFromLotTags: secondaryLamTags,
      consumeExactTags:
        !isFirstOnBoard && pullTag !== nestRootTag(step.boardTag) ? [pullTag] : [],
    });

    if (!opts?.quiet) {
      const finishedDoneNow = finishedSteps.filter((s) =>
        useAppStore
          .getState()
          .completedOperations.includes(`${projectName}-${s.stepIndex}-${s.boardTag}`)
      ).length;
      toast.success(
        isBlank && nextPullHint
          ? `Blank cut, long offcut saved, rip from ${nextPullHint}`
          : isRip && !isFinished && nextPullHint
            ? `Rip complete, crosscut from ${nextPullHint}. Finished still ${finishedDoneNow}/${finishedSteps.length}`
            : isFinished
              ? `Finished ${finishedDoneNow}/${finishedSteps.length} saved${nextPullHint ? `, next pull ${nextPullHint}` : ''}`
              : isLastOnBoard
                ? `Board sequence finished, ${finishedDoneNow}/${finishedSteps.length} finished pieces.`
                : 'Cut complete, inventory updated.'
      );
    }

    return { ok: true, lamination: isFinished ? lam : undefined };
  };

  const promptRelogAfterLaminate = async (lam: PlanLamination) => {
    await notify.confirm({
      title: 'Re-log leftover after laminating',
      message:
        `Layers ${lam.boardTags.join(' + ')} were consumed for “${lam.partName}” ` +
        `(glue-up to ~${formatDim(lam.totalThickness, unitSystem)}, target ${formatDim(lam.targetThickness, unitSystem)}).\n\n` +
        `Measure any leftover laminated blank or offcut and log it in Quick Log with the new dimensions.\n\n` +
        `The old layer tags are used — do not treat them as remaining stock.`,
      confirmLabel: 'Got it',
      requireCheck:
        'I will re-log any reusable leftover in Quick Log (or there is none)',
    });
  };

  const executeAtomicInventoryUpdate = async () => {
    if (!confirmStep) return;
    const result = completeCutStep(
      confirmStep,
      customRemLen,
      customRemWid,
      overrideClassification
    );
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setConfirmStep(null);
    if (result.lamination) {
      await promptRelogAfterLaminate(result.lamination);
    }
  };

  const remainingSteps = physicalSteps.filter((s) => !opDone(s));
  const nextIncompleteStep = remainingSteps[0] || null;

  const handleMarkAllRemaining = async () => {
    if (remainingSteps.length === 0) {
      toast.success('All cuts are already complete.');
      return;
    }
    const ok = await notify.confirm({
      title: `Mark all ${remainingSteps.length} remaining cuts complete?`,
      message:
        `This will mark every unfinished cut as done, in order, and update inventory for each one.\n\n` +
        `Remnant sizes will use the plan defaults.\n\n` +
        `To change a remnant size yourself, cancel and use the green button on each cut instead.\n\n` +
        `You can Undo all cuts later if needed.`,
      confirmLabel: `Mark all ${remainingSteps.length}`,
    });
    if (!ok) return;

    let done = 0;
    const laminatedFinished: PlanLamination[] = [];
    for (const step of remainingSteps) {
      const defaults = defaultRemForStep(step);
      const result = completeCutStep(
        step,
        defaults.remLen,
        defaults.remWid,
        defaults.classification,
        { quiet: true }
      );
      if (!result.ok) {
        toast.error(
          result.message ||
            `Stopped at step ${step.stepIndex}. ${done} cut${done === 1 ? '' : 's'} completed before that.`
        );
        return;
      }
      if (result.lamination) laminatedFinished.push(result.lamination);
      done += 1;
    }
    toast.success(
      done === 1
        ? 'Marked 1 cut complete and updated inventory.'
        : `Marked all ${done} remaining cuts complete and updated inventory.`
    );
    if (laminatedFinished.length > 0) {
      const unique = Array.from(
        new Map(laminatedFinished.map((l) => [l.partId, l])).values()
      );
      for (const lam of unique) {
        await promptRelogAfterLaminate(lam);
      }
    }
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
      <div className="hidden print:flex items-center justify-between border-b-2 border-zinc-900 pb-2 mb-3 text-xs font-mono font-bold text-zinc-900">
        <span>Precision cut lists by Logger™. Less guesswork, zero wasted timber.</span>
        <span className="uppercase">{activeProjectName}</span>
      </div>
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

      <div className="no-print bg-[#1e2228] border border-gray-800 p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-bold m-0">
              Cut plan
            </p>
            <h3 className="text-base font-black text-white m-0 tracking-wide uppercase">
              {activeProjectName}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-[#121417] border border-gray-700 text-gray-300">
                Offcuts tagged to this project
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-950/50 border border-emerald-700/50 text-emerald-300 font-bold">
                Finished {finishedLogged}/{finishedSteps.length}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#121417] border border-gray-700 text-gray-400">
                {physicalSteps.length} shop step{physicalSteps.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              disabled={cutHistory.length === 0}
              onClick={() => {
                const result = undoLastCut();
                if (result.ok) toast.success(result.message);
                else toast.error(result.message);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer"
              title="Restore inventory to before the last confirmed cut"
            >
              <Undo2 className="w-4 h-4" /> Undo last
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
              className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-amber-300 rounded-xl text-xs font-bold cursor-pointer"
              title="Undo every confirmed cut and restore stock"
            >
              <Undo2 className="w-4 h-4" /> Undo all
            </button>
            <button
              type="button"
              disabled={remainingSteps.length === 0}
              onClick={() => void handleMarkAllRemaining()}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold cursor-pointer"
              title="Confirm every remaining cut in order using planned remnant sizes"
            >
              <CheckCheck className="w-4 h-4" />
              {remainingSteps.length === 0
                ? 'All cuts complete'
                : `Mark all remaining (${remainingSteps.length})`}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-orange-600/30 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print sheets ({physicalSteps.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-3">
          <div className="bg-[#121417] p-3.5 rounded-xl border border-gray-800 space-y-2.5">
            <div className="text-orange-400 font-bold flex items-center gap-2 text-xs">
              <Box className="w-4 h-4" /> Allocated stock
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {plan.usedBoardTags.map((tag) => {
                const root = nestRootTag(tag);
                const board = boards.find(
                  (b) =>
                    b.tagId === tag ||
                    b.id === tag ||
                    b.tagId === root ||
                    nestRootTag(b.tagId || '') === root
                );
                const missing = !board;
                const isLamLayer = laminations.some((l) =>
                  (l.boardTags || []).some(
                    (t) => t === tag || nestRootTag(t) === root || t === board?.tagId
                  )
                );
                return (
                  <div
                    key={tag}
                    className={`rounded-xl border px-3 py-2.5 space-y-1 ${
                      missing
                        ? 'border-red-500/50 bg-red-950/20'
                        : board?.status === 'consumed'
                          ? 'border-zinc-600/60 bg-[#1a1d22]'
                          : board?.status === 'allocated' || isLamLayer
                            ? 'border-amber-500/40 bg-amber-950/15'
                            : 'border-emerald-500/40 bg-[#1e2228]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong
                        className={`font-mono text-sm ${
                          missing ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {tag}
                      </strong>
                      <span
                        className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                          missing
                            ? 'border-red-600/50 text-red-300'
                            : board?.status === 'consumed'
                              ? 'border-zinc-600 text-zinc-400'
                              : board?.status === 'allocated' || isLamLayer
                                ? 'border-amber-700/50 text-amber-200'
                                : 'border-emerald-700/50 text-emerald-300'
                        }`}
                      >
                        {missing
                          ? 'Missing'
                          : board?.status === 'consumed'
                            ? 'Consumed'
                            : isLamLayer
                              ? 'Laminate'
                              : board?.status === 'allocated'
                                ? 'Allocated'
                                : 'In plan'}
                      </span>
                    </div>
                    {board ? (
                      <div className="text-[11px] text-gray-300 leading-snug">
                        <div className="font-semibold text-white">{board.species}</div>
                        <div>
                          {formatDimsLWT(board.length, board.width, board.thickness, unitSystem)}
                        </div>
                        <div className="text-gray-500">{board.source}</div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-red-300/90">
                        Removed from inventory — not available
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {laminations.length > 0 && (
              <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3 space-y-2">
                <div className="text-amber-300 font-bold text-[11px] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Face laminate before cutting
                </div>
                {laminations.map((lam) => (
                  <div key={lam.partId} className="text-[11px] text-amber-100/95 leading-snug">
                    <strong className="text-white">{lam.partName}</strong>: glue{' '}
                    <span className="font-mono">{lam.boardTags.join(' + ')}</span>
                    {' → '}
                    plane to {formatDim(lam.targetThickness, unitSystem)}, then cut. After
                    cutting, re-log any leftover laminated stock in Quick Log.
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {plan.explanation && (
              <div className="bg-[#121417] border border-gray-800 rounded-xl p-3.5 text-[11px] text-gray-300 font-sans leading-relaxed">
                <div className="text-emerald-400 font-bold mb-1">Cutting strategy</div>
                {plan.explanation}
              </div>
            )}
            {plan.betterAlternative && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 text-[11px] text-amber-200 font-sans flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong className="text-amber-300">Better sequence available:</strong>{' '}
                  {plan.betterAlternative.reason}
                </div>
                {setActiveStrategy && (
                  <button
                    type="button"
                    onClick={() => setActiveStrategy(plan.betterAlternative!.strategy)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-[11px] shrink-0 cursor-pointer"
                  >
                    Switch to {plan.betterAlternative.label}
                  </button>
                )}
              </div>
            )}
            {plan.offcuts && plan.offcuts.length > 0 && (
              <div className="bg-[#121417] border border-gray-800 rounded-xl p-3.5 space-y-2">
                <div className="text-[11px] text-gray-400 font-sans font-semibold">
                  Remaining material from this plan
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
                      {o.boardTag}: {formatDim(o.length, unitSystem)} ×{' '}
                      {formatDim(o.width, unitSystem)} (
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
          const nextFinished = physicalSteps.find(
            (s) =>
              s.stepIndex > step.stepIndex &&
              nestRootTag(s.boardTag) === nestTag &&
              isFinishedPlacement(s) &&
              (!step.stripKey || !s.stripKey || s.stripKey === step.stripKey)
          );
          const pieceHeadline = isFinishedStep
            ? step.partName
            : isBlank
              ? nextFinished
                ? `Blank for ${nextFinished.partName}`
                : step.partName
              : isRip && !isFinishedStep
                ? nextFinished
                  ? `Rip strip for ${nextFinished.partName}`
                  : step.partName
                : step.partName;
          const stepSubtitle = isBlank
            ? 'Blank cut — preserve long offcut (no finished piece yet)'
            : isRip && !isFinishedStep
              ? 'Rip only — strip for later crosscuts'
              : isRip && isFinishedStep
                ? `Finished piece ${partOrdinal} of ${finishedSteps.length} (rip from blank)`
                : `Finished piece ${partOrdinal} of ${finishedSteps.length} (crosscut)`;
          // Length physically in hand (prefer frameLen when it is the remaining strip)
          const stockL = Number(step.stockLen) || 0;
          const frameL = Number(step.frameLen) || 0;
          const inHandLen =
            frameL > 0.5 && stockL > 0.5
              ? Math.min(frameL, stockL)
              : frameL > 0.5
                ? frameL
                : stockL > 0.5
                  ? stockL
                  : step.cutLen;
          const inHandWid = Number(step.stockWid) > 0.5 ? Number(step.stockWid) : step.cutWid;

          return (
            <div
              key={`${step.boardTag}-${step.stepIndex}`}
              className="cut-sheet-page bg-white text-zinc-900 border-2 border-zinc-900 p-5 rounded-lg shadow-md space-y-4"
            >
              {/* Header Bar */}
              <div className="border-b-2 border-zinc-900 pb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-zinc-900 text-white font-mono text-xs sm:text-sm px-2.5 py-1 font-bold uppercase tracking-wide">
                      STEP {step.stepIndex} OF {physicalSteps.length}:{' '}
                      {isBlank
                        ? 'BLANK CROSSCUT'
                        : isRip && isFinishedStep
                          ? 'RIP (FINISHED PIECE)'
                          : isRip
                            ? 'RIP STRIP'
                            : 'CROSSCUT'}
                    </span>
                    {isCompleted && (
                      <span className="bg-emerald-700 text-white text-xs px-2.5 py-1 font-bold rounded flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 leading-tight pt-0.5">
                    {pieceHeadline}
                  </h2>
                </div>
                <span className="px-3 py-1 rounded border border-zinc-300 bg-zinc-100 font-mono text-xs font-bold text-zinc-800 uppercase tracking-wide shrink-0">
                  {activeProjectName}
                </span>
              </div>

              {/* Single Combined Action Card: PULL -> CUT -> OFF-CUT / TAG */}
              <div className="bg-zinc-50 border border-zinc-300 rounded-lg p-3.5 font-mono text-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 pb-2.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-zinc-900">
                    <span className="inline-flex items-center gap-1 font-bold text-zinc-600 uppercase">
                      <Box className="w-3.5 h-3.5 text-orange-600" /> PULL:
                    </span>
                    <strong className="text-orange-700 text-sm">{pullTag}</strong>
                    <span className="text-zinc-700">({step.species})</span>
                    <span className="text-zinc-500">@</span>
                    <strong className="text-zinc-900">{step.location}</strong>
                    <span className="px-2 py-0.5 bg-white border border-zinc-300 rounded text-zinc-900 font-bold">
                      {formatDimsLWT(inHandLen, inHandWid, step.thickness, unitSystem)}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Kerf: <strong className="text-zinc-800">{formatDim(step.kerf, unitSystem)}</strong>
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                  <div className="flex-1 bg-white border-2 border-zinc-900 rounded-md px-3 py-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-bold text-zinc-700 uppercase">
                      <Scissors className="w-3.5 h-3.5 text-emerald-600" /> CUT:
                    </span>
                    <strong className="text-zinc-900 text-sm">
                      {isBlank
                        ? `${formatDim(step.cutLen, unitSystem)} Blank (${formatDim(step.cutLen, unitSystem)} × ${formatDim(step.cutWid, unitSystem)})`
                        : isRip && !isFinishedStep
                          ? `${formatDim(step.cutWid, unitSystem)} Rip Strip (${formatDim(step.cutLen, unitSystem)} × ${formatDim(step.cutWid, unitSystem)})`
                          : `${formatDim(step.cutLen, unitSystem)} × ${formatDim(step.cutWid, unitSystem)} (${step.partName})`}
                    </strong>
                  </div>

                  <span className="hidden sm:inline font-bold text-zinc-400 text-base select-none">
                    ===&gt;
                  </span>

                  <div className="flex-1 bg-white border border-zinc-300 rounded-md px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-zinc-600 uppercase">
                        {isBlank
                          ? 'OFF-CUT TO RACK: '
                          : isRip
                            ? 'SET ASIDE: '
                            : 'REMAINDER: '}
                      </span>
                      <strong className="text-zinc-900">
                        {isRip && step.edgeWid > 0.5
                          ? `${formatDim(step.edgeLen || inHandLen, unitSystem)} × ${formatDim(step.edgeWid, unitSystem)}`
                          : step.remLen > 0.5
                            ? `${formatDim(step.remLen, unitSystem)} × ${formatDim(step.remWid || inHandWid, unitSystem)}`
                            : 'None'}
                      </strong>
                    </div>
                    {nextRemLabel && (
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold text-[11px]">
                        Tag: {nextRemLabel}
                      </span>
                    )}
                  </div>
                </div>

                {(() => {
                  const lot =
                    findSourceLot(pullTag, boards) || findSourceLot(step.boardTag, boards);
                  const label = formatDefectsList(lot?.defects, lot?.defectNotes);
                  if (!label) return null;
                  return (
                    <div className="rounded border border-amber-400 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-950 font-sans leading-snug">
                      <span className="font-bold uppercase tracking-wide">Defects: </span>
                      {label}
                    </div>
                  );
                })()}
              </div>

              {/* Shop Drawing Canvas */}
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

              {/* Bottom Action Bar */}
              <div className="border-t border-zinc-300 pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-300 font-mono text-xs font-bold text-zinc-800">
                  {isBlank
                    ? `Crosscut at ${formatDim(step.cutLen, unitSystem)} · Keep ${formatDim(step.remLen, unitSystem)} offcut whole`
                    : isRip && isFinishedStep
                      ? `Rip ${formatDim(step.cutWid, unitSystem)} finished piece (${step.partName}) · Piece ${partOrdinal}/${finishedSteps.length}`
                      : isRip
                        ? `Rip ${formatDim(step.cutWid, unitSystem)} strip along length`
                        : `Crosscut ${formatDim(step.cutLen, unitSystem)} (${step.partName}) · Piece ${partOrdinal}/${finishedSteps.length}`}
                </span>

                <div className="print:hidden w-full sm:w-auto">
                  {!isCompleted &&
                    (nextIncompleteStep &&
                    nextIncompleteStep.stepIndex === step.stepIndex &&
                    nextIncompleteStep.boardTag === step.boardTag ? (
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
                    ) : (
                      <span className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 border border-zinc-300 text-zinc-500">
                        Waiting — complete earlier steps first
                      </span>
                    ))}
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
