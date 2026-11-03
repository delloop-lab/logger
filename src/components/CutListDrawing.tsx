'use client';

import React, { useMemo, useState } from 'react';
import { useAppStore, Board, BoardClassification } from '@/lib/store';
import { createCuttingPlan, type Placement } from '@/lib/cutting-engine';
import { Printer, CheckCircle2, ShieldCheck, Scissors, Box, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { displayToMm, formatDim, formatDimsLWT, mmToDisplay, unitLabel } from '@/lib/units';

export default function CutListDrawing() {
  const store = useAppStore();
  const boards = store?.boards || [];
  const activeProjectName = store?.activeProjectName || 'New Project';
  const activeParts = store?.activeParts || [];
  const completedOperations = store?.completedOperations || [];
  const offcutSettings = store?.offcutSettings || { minLength: 100, minWidth: 100 };
  const unitSystem = store.unitSystem;
  const u = unitLabel(unitSystem);

  const [confirmStep, setConfirmStep] = useState<Placement | null>(null);
  const [overrideClassification, setOverrideClassification] = useState<BoardClassification | null>(null);
  const [customRemLen, setCustomRemLen] = useState<number>(0);
  const [customRemWid, setCustomRemWid] = useState<number>(0);

  const plan = useMemo(
    () =>
      createCuttingPlan(
        boards.map((b) => ({
          id: b.id,
          tagId: b.tagId,
          species: b.species,
          source: b.source,
          location: b.location,
          length: Number(b.dimensions?.length ?? b.length ?? 0),
          width: Number(b.dimensions?.width ?? b.width ?? 0),
          thickness: Number(b.dimensions?.thickness ?? b.thickness ?? 18),
          status: b.status,
        })),
        activeParts.map((p) => ({
          id: p.id,
          name: p.name,
          species: p.species,
          length: p.length,
          width: p.width,
          thickness: p.thickness || 18,
          quantity: p.quantity,
        }))
      ),
    [boards, activeParts]
  );

  const physicalSteps = plan.placements;

  const handlePrint = () => window.print();

  const openConfirmationModal = (step: Placement) => {
    setConfirmStep(step);
    setCustomRemLen(mmToDisplay(step.remLen, unitSystem, unitSystem === 'imperial' ? 2 : 1));
    setCustomRemWid(mmToDisplay(step.remWid, unitSystem, unitSystem === 'imperial' ? 2 : 1));
    const isWaste =
      step.remLen < offcutSettings.minLength && step.remWid < offcutSettings.minWidth;
    setOverrideClassification(isWaste ? 'waste' : 'reusable_offcut');
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
    const isLastOnBoard = completedOnBoard + 1 >= stepsOnBoard.length;

    const timestamp = new Date().toISOString();

    const finishedPartBoard: Board = {
      id: `part-${Date.now()}-${confirmStep.stepIndex}`,
      tagId: `${confirmStep.boardTag}-OP${confirmStep.stepIndex}-PART`,
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
      parentBoardId: confirmStep.boardTag,
      originProject: activeProjectName,
      notes: `Finished piece: ${confirmStep.partName}`,
      createdAt: timestamp,
    };

    const newRecords: Board[] = [finishedPartBoard];

    const remLenMm = displayToMm(customRemLen, unitSystem);
    const remWidMm = displayToMm(customRemWid, unitSystem);

    // Offcuts / waste only when the parent board is fully cut
    if (isLastOnBoard && remLenMm > 0 && remWidMm > 0) {
      const isReusable = overrideClassification === 'reusable_offcut';
      newRecords.push({
        id: `off-${Date.now()}-${confirmStep.stepIndex}`,
        tagId: `${confirmStep.boardTag}-OP${confirmStep.stepIndex}-${isReusable ? 'OFFCUT' : 'WASTE'}`,
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
        status: isReusable ? 'active' : 'consumed',
        classification: overrideClassification || 'reusable_offcut',
        parentBoardId: confirmStep.boardTag,
        originProject: activeProjectName,
        notes: `Resulting offcut from final operation on ${confirmStep.boardTag}`,
        createdAt: timestamp,
      });
    }

    store.processCuttingOperation(opKey, confirmStep.boardTag, newRecords, {
      consumeParent: isLastOnBoard,
    });
    toast.success(
      isLastOnBoard
        ? 'Cut complete — parent board consumed and inventory updated.'
        : 'Cut complete — finished piece added. Parent board kept for remaining cuts.'
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
        {plan.unallocated.length > 0 && (
          <p className="text-[11px] text-orange-400 font-mono">
            Unallocated pieces: {plan.unallocated.length}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#1e2228] border border-gray-800 p-4 rounded-xl shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-mono text-gray-300">
            Cut plan — Project:{' '}
            <strong className="text-white uppercase">{activeProjectName}</strong>
          </span>
          <button
            type="button"
            onClick={handlePrint}
            className="print:hidden flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-orange-600/30 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Workshop Steps ({physicalSteps.length})
          </button>
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
                      {board.species} ({formatDimsLWT(board.length, board.width, board.thickness, unitSystem)}) ·{' '}
                      {board.source}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {plan.unallocated.length > 0 && (
            <p className="text-orange-400 text-[11px]">
              Warning: {plan.unallocated.length} piece(s) could not be nested on available stock.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-8 print:space-y-4">
        {physicalSteps.map((step) => {
          const opKey = `${activeProjectName}-${step.stepIndex}-${step.boardTag}`;
          const isCompleted = completedOperations.includes(opKey);

          const aspectRatio = step.stockLen / step.stockWid;
          const svgW = 720;
          const svgH = Math.round(720 / aspectRatio) + 80;
          const marginX = 90;
          const marginY = 50;
          const drawW = svgW - marginX * 2;
          const drawH = svgH - marginY * 2;
          const scaleX = drawW / step.stockLen;
          const scaleY = drawH / step.stockWid;
          const boardW = step.stockLen * scaleX;
          const boardH = step.stockWid * scaleY;
          const partX = marginX + step.posX * scaleX;
          const partY = marginY + step.posY * scaleY;
          const partW = step.cutLen * scaleX;
          const partH = step.cutWid * scaleY;

          const priorOnSameBoard = physicalSteps.filter(
            (s) => s.boardTag === step.boardTag && s.stepIndex < step.stepIndex
          );

          return (
            <div
              key={`${step.boardTag}-${step.stepIndex}`}
              className="bg-white text-zinc-900 border-2 border-zinc-900 p-6 rounded-lg shadow-md space-y-5 print:border-black print:shadow-none print:break-inside-avoid"
              style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
            >
              <div className="flex justify-between items-center border-b-2 border-zinc-900 pb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="bg-zinc-900 text-white font-mono text-sm px-3 py-1 font-bold">
                    STEP {step.stepIndex} OF {physicalSteps.length}
                  </span>
                  <h2 className="text-lg font-black tracking-wide uppercase text-zinc-900">
                    Yield: {step.partName}
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
                    Tag Ref: <strong className="text-zinc-900">{step.boardTag}</strong>
                  </div>
                  <div>
                    Species: <strong className="text-zinc-900">{step.species}</strong>
                  </div>
                  <div>
                    Location: <strong className="text-zinc-900">{step.location}</strong>
                  </div>
                  <div>
                    Board Dimensions:{' '}
                    <strong className="text-zinc-900">
                      {formatDimsLWT(step.stockLen, step.stockWid, step.thickness, unitSystem)}
                    </strong>
                  </div>
                </div>

                <div className="bg-zinc-50 p-4 border border-zinc-300 rounded space-y-1">
                  <div className="font-bold text-zinc-900 flex items-center gap-2 border-b border-zinc-300 pb-1 mb-2">
                    <Scissors className="w-4 h-4 text-emerald-600" /> WHAT TO CUT:
                  </div>
                  <div>
                    Target Part: <strong className="text-zinc-900">{step.partName}</strong>
                  </div>
                  <div>
                    Cut Size:{' '}
                    <strong className="text-zinc-900">
                      {formatDim(step.cutLen, unitSystem)} × {formatDim(step.cutWid, unitSystem)}
                      {step.rotated ? ' (rotated)' : ''}
                    </strong>
                  </div>
                  <div>
                    Position:{' '}
                    <strong className="text-zinc-900">
                      X: {formatDim(step.posX, unitSystem)}, Y: {formatDim(step.posY, unitSystem)}
                    </strong>
                  </div>
                  <div>
                    Saw Kerf: <strong className="text-zinc-900">{formatDim(step.kerf, unitSystem)}</strong>
                  </div>
                </div>
              </div>

              <div
                className="border border-zinc-300 p-4 rounded bg-[#f7f5f0]"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(180, 200, 220, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(180, 200, 220, 0.2) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              >
                <div className="text-[11px] font-mono font-bold text-zinc-700 mb-2 uppercase tracking-wide">
                  Stock layout — prior cuts shown in grey, current cut in orange
                </div>
                <div className="flex justify-center overflow-x-auto py-2">
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full max-w-3xl h-auto font-mono text-[10px]"
                    style={{ strokeLinecap: 'square' }}
                  >
                    <defs>
                      <pattern
                        id={`wood-grain-${step.stepIndex}`}
                        width="40"
                        height="12"
                        patternUnits="userSpaceOnUse"
                      >
                        <rect width="40" height="12" fill="#e6cca8" />
                        <path
                          d="M 0 3 Q 10 1, 20 3 T 40 3"
                          fill="none"
                          stroke="#d4b48c"
                          strokeWidth="0.8"
                        />
                      </pattern>
                    </defs>

                    <text
                      x={marginX + boardW / 2}
                      y="16"
                      fill="#18181b"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      LENGTH: {formatDim(step.stockLen, unitSystem)}
                    </text>
                    <text
                      x="22"
                      y={marginY + boardH / 2}
                      fill="#18181b"
                      textAnchor="middle"
                      fontWeight="bold"
                      transform={`rotate(-90, 22, ${marginY + boardH / 2})`}
                    >
                      WIDTH: {formatDim(step.stockWid, unitSystem)}
                    </text>

                    <rect
                      x={marginX}
                      y={marginY}
                      width={boardW}
                      height={boardH}
                      fill={`url(#wood-grain-${step.stepIndex})`}
                      stroke="#27272a"
                      strokeWidth="1.5"
                    />

                    {priorOnSameBoard.map((prior) => (
                      <rect
                        key={`prior-${prior.stepIndex}`}
                        x={marginX + prior.posX * scaleX}
                        y={marginY + prior.posY * scaleY}
                        width={prior.cutLen * scaleX}
                        height={prior.cutWid * scaleY}
                        fill="#d4d4d8"
                        stroke="#71717a"
                        strokeWidth="1"
                      />
                    ))}

                    <rect
                      x={partX}
                      y={partY}
                      width={partW}
                      height={partH}
                      fill="#ffffff"
                      stroke="#f97316"
                      strokeWidth="2.5"
                    />
                    <text x={partX + 6} y={partY + 16} fill="#09090b" fontWeight="bold" fontSize="10">
                      {step.partName.toUpperCase()}
                    </text>
                    <text x={partX + 6} y={partY + 28} fill="#ea580c" fontSize="9" fontWeight="bold">
                      {formatDim(step.cutLen, unitSystem)} × {formatDim(step.cutWid, unitSystem)}
                    </text>
                  </svg>
                </div>
              </div>

              <div className="border-t border-zinc-300 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs font-mono text-zinc-700 space-y-0.5">
                  <div>
                    • Position cut at X: {formatDim(step.posX, unitSystem)}, Y:{' '}
                    {formatDim(step.posY, unitSystem)} on stock.
                  </div>
                  <div>
                    • Yields: <strong>{step.partName}</strong> (
                    {formatDim(step.cutLen, unitSystem)} × {formatDim(step.cutWid, unitSystem)}).
                  </div>
                </div>

                <div className="print:hidden w-full sm:w-auto">
                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => openConfirmationModal(step)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" /> MARK CUT COMPLETE & UPDATE INVENTORY
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {confirmStep && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-[#181b20] border border-gray-700/80 rounded-2xl max-w-lg w-full p-6 space-y-6 text-white shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Confirm Physical Cut</h3>
                  <p className="text-[11px] text-gray-400 font-mono">Inventory update</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmStep(null)}
                className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono bg-[#121417] p-4 rounded-xl border border-gray-800/80">
              <div className="flex justify-between border-b border-gray-800/50 pb-2">
                <span className="text-gray-400">Parent Stock Tag:</span>
                <strong className="text-white">{confirmStep.boardTag}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-800/50 pb-2">
                <span className="text-gray-400">Yielding Part:</span>
                <strong className="text-orange-400">{confirmStep.partName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Saw Kerf:</span>
                <strong className="text-red-400">{formatDim(confirmStep.kerf, unitSystem)}</strong>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] text-gray-400">
                Offcut / waste is recorded when the final cut on this board is confirmed.
              </p>
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

            <div className="flex gap-3 pt-2">
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
        </div>
      )}
    </div>
  );
}
