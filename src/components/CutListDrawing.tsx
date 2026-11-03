'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore, Board, BoardClassification } from '@/lib/store';
import { Printer, CheckCircle2, ShieldCheck, Scissors, Box, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface StepCut {
  stepIndex: number;
  boardTag: string;
  species: string;
  source: string;
  location: string;
  partName: string;
  stockLen: number;
  stockWid: number;
  cutLen: number;
  cutWid: number;
  posX: number;
  posY: number;
  kerf: number;
  isRip: boolean;
  isCrosscut: boolean;
  remLen: number;
  remWid: number;
  thickness: number;
}

export default function CutListDrawing() {
  const store = useAppStore();
  const boards = store?.boards || [];
  const activeProjectName = store?.activeProjectName || 'Jewel Box Project';
  const activeParts = store?.activeParts || [];
  const completedOperations = store?.completedOperations || [];
  const offcutSettings = store?.offcutSettings || { minLength: 100, minWidth: 100 };

  const [confirmStep, setConfirmStep] = useState<StepCut | null>(null);
  const [overrideClassification, setOverrideClassification] = useState<BoardClassification | null>(null);
  const [customRemLen, setCustomRemLen] = useState<number>(0);
  const [customRemWid, setCustomRemWid] = useState<number>(0);

  const handlePrint = () => {
    window.print();
  };

  const KERF = 3.2;

  const activeInventory = boards.filter((b) => b.status !== 'consumed');

  const getBoardDimensions = (b: any) => ({
    length: Number(b?.dimensions?.length ?? b?.length ?? 0),
    width: Number(b?.dimensions?.width ?? b?.width ?? 0),
    thickness: Number(b?.dimensions?.thickness ?? b?.thickness ?? 18),
  });

  const requiredParts = activeParts.length > 0 ? activeParts : [
    { id: 'p-1', name: 'Top & Bottom', length: 300, width: 250, thickness: 18, quantity: 2, species: 'Pine / Pallet' },
    { id: 'p-2', name: 'Sider F&B', length: 300, width: 200, thickness: 18, quantity: 2, species: 'Pine / Pallet' },
    { id: 'p-3', name: 'Sides L&R', length: 250, width: 200, thickness: 18, quantity: 2, species: 'Pine / Pallet' },
  ];

  const cutPieces = requiredParts.flatMap((part) =>
    Array.from({ length: part.quantity }, (_, i) => ({
      id: `${part.id}-${i + 1}`,
      name: `${part.name} (${i + 1}/${part.quantity})`,
      length: part.length,
      width: part.width,
      thickness: part.thickness || 18,
      species: part.species,
    }))
  );

  const targetSpecies = 'pine / pallet';

  const boardCanFitPart = (bDims: { length: number; width: number; thickness: number }, part: { length: number; width: number; thickness: number }) => {
    if (bDims.thickness < part.thickness - 0.1) return false;
    const directFit = bDims.length >= part.length && bDims.width >= part.width;
    const rotatedFit = bDims.length >= part.width && bDims.width >= part.length;
    return directFit || rotatedFit;
  };

  const speciesMatchedBoards = activeInventory.filter((b) => {
    const bSpecies = (b.species || '').toLowerCase().trim();
    return bSpecies === targetSpecies || bSpecies.includes('pine');
  });

  const sortedCandidateBoards = speciesMatchedBoards.sort((a, b) => {
    const dimsA = getBoardDimensions(a);
    const dimsB = getBoardDimensions(b);
    return (dimsA.length * dimsA.width) - (dimsB.length * dimsB.width);
  });

  // Lazy initializer state to compute and permanently lock the chosen board ID once on mount
  const [lockedBoardId, setLockedBoardId] = useState<string>(() => {
    let chosen: Board | null = null;
    
    // Tier 1: Check small/partial stock boards first
    for (const board of sortedCandidateBoards) {
      const dims = getBoardDimensions(board);
      const fitsAny = cutPieces.some(p => boardCanFitPart(dims, p));
      if (fitsAny && dims.length * dims.width < 100000) {
        chosen = board;
        break;
      }
    }

    // Tier 2: Step up to larger inventory if small stock fails
    if (!chosen) {
      for (const board of sortedCandidateBoards) {
        const dims = getBoardDimensions(board);
        const totalCutArea = cutPieces.reduce((sum, p) => sum + (p.length * p.width), 0);
        if (dims.length * dims.width >= totalCutArea && boardCanFitPart(dims, cutPieces[0])) {
          chosen = board;
          break;
        }
      }
    }

    return chosen ? (chosen.tagId || chosen.id) : (sortedCandidateBoards[0]?.tagId || sortedCandidateBoards[0]?.id || '');
  });

  const selectedBoard = activeInventory.find((b) => (b.tagId || b.id) === lockedBoardId) || sortedCandidateBoards[0];

  if (!selectedBoard || cutPieces.length === 0) {
    return (
      <div className="bg-[#1e2228] border border-red-500/40 p-8 rounded-2xl max-w-xl mx-auto text-center space-y-4 shadow-2xl font-sans mt-12">
        <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-wide">NO SUITABLE STOCK AVAILABLE</h2>
        <p className="text-xs text-gray-400 font-mono leading-relaxed">
          Hierarchical stock selection failed: Available boards cannot accommodate required parts.
        </p>
      </div>
    );
  }

  const boardDims = getBoardDimensions(selectedBoard);

  // Generate 2D cutting steps
  const physicalSteps: StepCut[] = [];
  let cursorX = 0;
  let cursorY = 0;
  let rowMaxHeight = 0;

  cutPieces.forEach((cut, idx) => {
    let cutLen = cut.length;
    let cutWid = cut.width;

    if (cursorX + cutLen + KERF > boardDims.length) {
      cursorX = 0;
      cursorY += rowMaxHeight + KERF;
      rowMaxHeight = 0;
    }

    if (cursorY + cutWid > boardDims.width) {
      const temp = cutLen;
      cutLen = cutWid;
      cutWid = temp;
    }

    if (cutWid > rowMaxHeight) {
      rowMaxHeight = cutWid;
    }

    const remLen = Math.max(0, boardDims.length - (cursorX + cutLen));
    const remWid = Math.max(0, boardDims.width - (cursorY + cutWid));

    physicalSteps.push({
      stepIndex: idx + 1,
      boardTag: selectedBoard.tagId || selectedBoard.id,
      species: selectedBoard.species,
      source: selectedBoard.source || 'Stock',
      location: selectedBoard.location || 'Workshop',
      partName: cut.name,
      stockLen: boardDims.length,
      stockWid: boardDims.width,
      cutLen,
      cutWid,
      posX: cursorX,
      posY: cursorY,
      kerf: KERF,
      isRip: true,
      isCrosscut: true,
      remLen,
      remWid,
      thickness: boardDims.thickness,
    });

    cursorX += cutLen + KERF;
  });

  const openConfirmationModal = (step: StepCut) => {
    setConfirmStep(step);
    setCustomRemLen(step.remLen);
    setCustomRemWid(step.remWid);

    const isWaste = step.remLen < offcutSettings.minLength && step.remWid < offcutSettings.minWidth;
    setOverrideClassification(isWaste ? 'waste' : 'reusable_offcut');
  };

  const executeAtomicInventoryUpdate = () => {
    if (!confirmStep) return;

    const opKey = `${activeProjectName}-${confirmStep.stepIndex}-${confirmStep.boardTag}`;
    if (completedOperations.includes(opKey)) {
      toast.error('Operation already completed!');
      return;
    }

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

    if (customRemLen > 0 && customRemWid > 0) {
      const isReusable = overrideClassification === 'reusable_offcut';
      const offcutBoard: Board = {
        id: `off-${Date.now()}-${confirmStep.stepIndex}`,
        tagId: `${confirmStep.boardTag}-OP${confirmStep.stepIndex}-${isReusable ? 'OFFCUT' : 'WASTE'}`,
        species: confirmStep.species,
        source: confirmStep.source,
        dimensions: {
          length: Number(customRemLen.toFixed(1)),
          width: Number(customRemWid.toFixed(1)),
          thickness: confirmStep.thickness,
        },
        length: Number(customRemLen.toFixed(1)),
        width: Number(customRemWid.toFixed(1)),
        thickness: confirmStep.thickness,
        quantity: 1,
        location: confirmStep.location,
        status: isReusable ? 'active' : 'consumed',
        classification: overrideClassification || 'reusable_offcut',
        parentBoardId: confirmStep.boardTag,
        originProject: activeProjectName,
        notes: `Resulting offcut from operation #${confirmStep.stepIndex}`,
        createdAt: timestamp,
      };
      newRecords.push(offcutBoard);
    }

    store.processCuttingOperation(opKey, confirmStep.boardTag, newRecords);
    toast.success('MARK CUT COMPLETE: Inventory updated successfully!');
    setConfirmStep(null);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-[#1e2228] border border-gray-800 p-4 rounded-xl shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-gray-300">
            TimberVault Stable Cut Sheet - Project: <strong className="text-white uppercase">{activeProjectName}</strong>
          </span>
          <button
            onClick={handlePrint}
            className="print:hidden flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-orange-600/30 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Workshop Steps ({physicalSteps.length})
          </button>
        </div>

        <div className="bg-[#121417] p-3 rounded-lg border border-gray-800 text-xs font-mono">
          <div className="text-orange-400 font-bold mb-2 flex items-center gap-2">
            <Box className="w-4 h-4" /> PERMANENTLY LOCKED STOCK BOARD:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <div className="bg-[#1e2228] p-2.5 rounded border border-emerald-500/50 text-white">
              <div>Tag: <strong className="text-emerald-400">{selectedBoard.tagId || selectedBoard.id}</strong></div>
              <div className="text-gray-300 text-[11px]">{selectedBoard.species} ({boardDims.length}mm L × {boardDims.width}mm W × {boardDims.thickness}mm T)</div>
              <div className="text-gray-400 text-[10px]">Source: {selectedBoard.source || 'Stock'} | Location: {selectedBoard.location || 'Workshop'}</div>
            </div>
          </div>
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

          return (
            <div
              key={step.stepIndex}
              className="bg-white text-zinc-900 border-2 border-zinc-900 p-6 rounded-lg shadow-md space-y-5 print:border-black print:shadow-none print:break-inside-avoid"
              style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
            >
              <div className="flex justify-between items-center border-b-2 border-zinc-900 pb-3">
                <div className="flex items-center gap-3">
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
                  <div>Tag Ref: <strong className="text-zinc-900">{step.boardTag}</strong></div>
                  <div>Species: <strong className="text-zinc-900">{step.species}</strong></div>
                  <div>Location: <strong className="text-zinc-900">{step.location}</strong></div>
                  <div>Board Dimensions: <strong className="text-zinc-900">{step.stockLen}mm L × {step.stockWid}mm W × {step.thickness}mm T</strong></div>
                </div>

                <div className="bg-zinc-50 p-4 border border-zinc-300 rounded space-y-1">
                  <div className="font-bold text-zinc-900 flex items-center gap-2 border-b border-zinc-300 pb-1 mb-2">
                    <Scissors className="w-4 h-4 text-emerald-600" /> WHAT TO CUT:
                  </div>
                  <div>Target Part: <strong className="text-zinc-900">{step.partName}</strong></div>
                  <div>Cut Size: <strong className="text-zinc-900">{step.cutLen}mm × {step.cutWid}mm</strong></div>
                  <div>Position: <strong className="text-zinc-900">X: {step.posX}mm, Y: {step.posY}mm</strong></div>
                  <div>Saw Kerf: <strong className="text-zinc-900">{step.kerf}mm</strong></div>
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
                  Stock Layout & Placement (Step {step.stepIndex} of {physicalSteps.length}):
                </div>
                <div className="flex justify-center overflow-x-auto py-2">
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="w-full max-w-3xl h-auto font-mono text-[10px]"
                    style={{ strokeLinecap: 'square' }}
                  >
                    <defs>
                      <pattern id={`wood-grain-${step.stepIndex}`} width="40" height="12" patternUnits="userSpaceOnUse">
                        <rect width="40" height="12" fill="#e6cca8" />
                        <path d="M 0 3 Q 10 1, 20 3 T 40 3" fill="none" stroke="#d4b48c" strokeWidth="0.8" />
                        <path d="M 0 9 Q 15 7, 25 9 T 40 9" fill="none" stroke="#d4b48c" strokeWidth="0.7" />
                      </pattern>
                    </defs>

                    <line x1={marginX} y1="24" x2={marginX + boardW} y2="24" stroke="#18181b" strokeWidth="0.8" />
                    <line x1={marginX} y1="18" x2={marginX} y2="30" stroke="#18181b" strokeWidth="1" />
                    <line x1={marginX + boardW} y1="18" x2={marginX + boardW} y2="30" stroke="#18181b" strokeWidth="1" />
                    <text x={marginX + boardW / 2} y="16" fill="#18181b" textAnchor="middle" fontWeight="bold">
                      LENGTH: {step.stockLen} mm
                    </text>

                    <line x1="35" y1={marginY} x2="35" y2={marginY + boardH} stroke="#18181b" strokeWidth="0.8" />
                    <line x1="29" y1={marginY} x2="41" y2={marginY} stroke="#18181b" strokeWidth="1" />
                    <line x1="29" y1={marginY + boardH} x2="41" y2={marginY + boardH} stroke="#18181b" strokeWidth="1" />
                    <text
                      x="22"
                      y={marginY + boardH / 2}
                      fill="#18181b"
                      textAnchor="middle"
                      fontWeight="bold"
                      transform={`rotate(-90, 22, ${marginY + boardH / 2})`}
                    >
                      WIDTH: {step.stockWid} mm
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
                      {step.cutLen}mm × {step.cutWid}mm
                    </text>
                  </svg>
                </div>
              </div>

              <div className="border-t border-zinc-300 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-xs font-mono text-zinc-700 space-y-0.5">
                  <div>• Position cut at X: {step.posX}mm, Y: {step.posY}mm on stock.</div>
                  <div>• Yields target part: <strong>{step.partName}</strong> ({step.cutLen}mm × {step.cutWid}mm).</div>
                </div>

                <div className="print:hidden w-full sm:w-auto">
                  {!isCompleted && (
                    <button
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 font-sans animate-in fade-in duration-200">
          <div className="bg-[#181b20] border border-gray-700/80 rounded-2xl max-w-lg w-full p-6 space-y-6 text-white shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Confirm Physical Cut</h3>
                  <p className="text-[11px] text-gray-400 font-mono">Atomic Inventory Synchronization</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmStep(null)}
                className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
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
                <span className="text-gray-400">Species & Source:</span>
                <strong className="text-gray-200">{confirmStep.species}</strong>
              </div>
              <div className="flex justify-between border-b border-gray-800/50 pb-2">
                <span className="text-gray-400">Yielding Part:</span>
                <strong className="text-orange-400">{confirmStep.partName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Deducted Saw Kerf:</span>
                <strong className="text-red-400">{confirmStep.kerf} mm</strong>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-gray-300 uppercase font-mono tracking-wider">
                Resulting Offcut & Waste Classification
              </label>

              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Actual Rem Length (mm)</label>
                  <input
                    type="number"
                    value={customRemLen}
                    onChange={(e) => setCustomRemLen(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121417] border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">Actual Rem Width (mm)</label>
                  <input
                    type="number"
                    value={customRemWid}
                    onChange={(e) => setCustomRemWid(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#121417] border border-gray-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1.5 font-mono">Classification Status</label>
                <select
                  value={overrideClassification || 'reusable_offcut'}
                  onChange={(e) => setOverrideClassification(e.target.value as BoardClassification)}
                  className="w-full bg-[#121417] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  <option value="reusable_offcut">Reusable Offcut (Added to Available Inventory)</option>
                  <option value="waste">Waste (Archived; Excluded from Active Inventory)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmStep(null)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeAtomicInventoryUpdate}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
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