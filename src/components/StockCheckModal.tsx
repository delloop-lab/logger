'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Layers } from 'lucide-react';
import AppModal from '@/components/AppModal';
import { formatDim, type UnitSystem } from '@/lib/units';

export type StockCheckPart = {
  id: string;
  name: string;
  species: string;
  length: number;
  width: number;
  thickness: number;
};

export type LaminateOption = {
  id: string;
  label: string;
  boardIds: string[];
  boardTags: string[];
  totalThickness: number;
};

export type StockCheckIssue = {
  part: StockCheckPart;
  kind: 'no_species' | 'too_thin' | 'too_thick' | 'too_small' | 'ply_mismatch';
  requiredThickness?: number;
  maxAvailableThickness?: number;
  stockLabel?: string;
  detail?: string;
  laminateOptions?: LaminateOption[];
};

export type AcceptedLamination = {
  partId: string;
  partName: string;
  optionId: string;
  boardIds: string[];
  boardTags: string[];
  totalThickness: number;
  targetThickness: number;
  label: string;
};

export type StockCheckResolution = {
  action: 'pause' | 'generate' | 'cancel';
  /** Part ids the user chose to skip for this generate run */
  skippedPartIds: string[];
  /** Part ids accepted for face-lamination (nest ignoring thickness) */
  laminatePartIds: string[];
  /** Full laminate pairings (boards allocated for glue-up) */
  laminations: AcceptedLamination[];
  /** Non-plywood parts accepted for planing thicker stock */
  planePartIds: string[];
};

type Props = {
  open: boolean;
  unitSystem: UnitSystem;
  issues: StockCheckIssue[];
  canGeneratePartial: boolean;
  onClose: (result: StockCheckResolution) => void;
};

function badgeFor(kind: StockCheckIssue['kind']) {
  switch (kind) {
    case 'too_thin':
      return { label: 'Too thin', className: 'border-amber-600/60 bg-amber-950/40 text-amber-200' };
    case 'too_thick':
      return { label: 'Too thick', className: 'border-orange-600/60 bg-orange-950/40 text-orange-200' };
    case 'ply_mismatch':
      return { label: 'Thickness mismatch', className: 'border-amber-600/60 bg-amber-950/40 text-amber-200' };
    case 'no_species':
      return { label: 'No stock', className: 'border-red-600/60 bg-red-950/40 text-red-200' };
    default:
      return { label: 'Won’t fit', className: 'border-zinc-600 bg-zinc-900 text-zinc-300' };
  }
}

export default function StockCheckModal({
  open,
  unitSystem,
  issues,
  canGeneratePartial,
  onClose,
}: Props) {
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const [laminateChoice, setLaminateChoice] = useState<Record<string, string>>({});
  const [laminateAck, setLaminateAck] = useState<Record<string, boolean>>({});
  const [planeAck, setPlaneAck] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setSkipped(new Set());
    setLaminateChoice({});
    setLaminateAck({});
    setPlaneAck({});
  }, [open, issues]);

  const activeIssues = useMemo(
    () => issues.filter((i) => !skipped.has(i.part.id)),
    [issues, skipped]
  );

  const thinIssues = activeIssues.filter((i) => i.kind === 'too_thin');
  const thickIssues = activeIssues.filter((i) => i.kind === 'too_thick');

  const thinThickResolved = activeIssues
    .filter((i) => i.kind === 'too_thin' || i.kind === 'too_thick')
    .every((i) =>
      i.kind === 'too_thin'
        ? Boolean(laminateChoice[i.part.id] && laminateAck[i.part.id])
        : Boolean(planeAck[i.part.id])
    );

  const hardLeft = activeIssues.filter(
    (i) => i.kind === 'no_species' || i.kind === 'too_small' || i.kind === 'ply_mismatch'
  );

  const generateEnabled =
    thinThickResolved && (hardLeft.length === 0 || canGeneratePartial);

  const finish = (action: StockCheckResolution['action']) => {
    const laminations: AcceptedLamination[] = thinIssues
      .map((i) => {
        const optId = laminateChoice[i.part.id];
        if (!optId || !laminateAck[i.part.id]) return null;
        const opt = (i.laminateOptions || []).find((o) => o.id === optId);
        if (!opt) return null;
        return {
          partId: i.part.id,
          partName: i.part.name,
          optionId: opt.id,
          boardIds: [...opt.boardIds],
          boardTags: [...(opt.boardTags || [])],
          totalThickness: opt.totalThickness,
          targetThickness: i.requiredThickness || i.part.thickness || 0,
          label: opt.label,
        };
      })
      .filter((x): x is AcceptedLamination => Boolean(x));

    onClose({
      action,
      skippedPartIds: Array.from(skipped),
      laminatePartIds: laminations.map((l) => l.partId),
      laminations,
      planePartIds: thickIssues.filter((i) => planeAck[i.part.id]).map((i) => i.part.id),
    });
  };

  if (!open) return null;

  return (
    <AppModal
      open={open}
      onClose={() => finish('cancel')}
      title="Stock check"
      subtitle="Review each mismatch, then choose how to continue."
      size="xl"
    >
      <div className="space-y-4">
        {issues.length === 0 ? (
          <p className="text-sm text-gray-300">No stock issues found.</p>
        ) : (
          <div className="space-y-3 max-h-[min(55vh,560px)] overflow-y-auto pr-1">
            {issues.map((issue) => {
              const badge = badgeFor(issue.kind);
              const isSkipped = skipped.has(issue.part.id);
              return (
                <div
                  key={issue.part.id}
                  className={`rounded-2xl border p-4 space-y-3 ${
                    isSkipped
                      ? 'border-gray-800 bg-[#171a1f] opacity-60'
                      : 'border-gray-700 bg-[#121417]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-white m-0">{issue.part.name}</h4>
                        <span
                          className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md border font-bold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        {isSkipped ? (
                          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md border border-zinc-600 text-zinc-400 font-bold">
                            Skipped
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-400 m-0">
                        {issue.part.species} ·{' '}
                        {formatDim(issue.part.length, unitSystem)} ×{' '}
                        {formatDim(issue.part.width, unitSystem)}
                        {issue.part.thickness
                          ? ` × ${formatDim(issue.part.thickness, unitSystem)}`
                          : ''}
                      </p>
                    </div>
                    {(issue.kind === 'too_thin' ||
                      issue.kind === 'too_thick' ||
                      issue.kind === 'ply_mismatch' ||
                      issue.kind === 'no_species' ||
                      issue.kind === 'too_small') && (
                      <button
                        type="button"
                        onClick={() =>
                          setSkipped((prev) => {
                            const next = new Set(prev);
                            if (next.has(issue.part.id)) next.delete(issue.part.id);
                            else next.add(issue.part.id);
                            return next;
                          })
                        }
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 cursor-pointer"
                      >
                        {isSkipped ? 'Undo skip' : 'Reject / skip part'}
                      </button>
                    )}
                  </div>

                  {!isSkipped && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl border border-gray-800 bg-[#1e2228] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">
                            Required
                          </div>
                          <div className="text-white font-semibold mt-0.5">
                            {issue.requiredThickness != null
                              ? `${formatDim(issue.requiredThickness, unitSystem)} thick`
                              : 'See part size above'}
                          </div>
                        </div>
                        <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 px-3 py-2">
                          <div className="text-[10px] uppercase tracking-wide text-amber-400/90 font-bold">
                            On hand
                          </div>
                          <div className="text-amber-100 font-semibold mt-0.5">
                            {issue.maxAvailableThickness != null
                              ? `Max ${formatDim(issue.maxAvailableThickness, unitSystem)}${
                                  issue.stockLabel ? ` (${issue.stockLabel})` : ''
                                }`
                              : issue.detail || 'None matching'}
                          </div>
                        </div>
                      </div>

                      {issue.kind === 'too_thin' && (
                        <div className="space-y-2 rounded-xl border border-amber-700/40 bg-amber-950/15 p-3">
                          <p className="text-xs text-amber-100 m-0 flex items-start gap-2">
                            <Layers className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                            Stock is too thin for {issue.part.name}. Laminate layers to reach{' '}
                            {formatDim(issue.requiredThickness || 0, unitSystem)}, or skip this
                            part.
                          </p>
                          {(issue.laminateOptions || []).length > 0 ? (
                            <select
                              value={laminateChoice[issue.part.id] || ''}
                              onChange={(e) =>
                                setLaminateChoice((prev) => ({
                                  ...prev,
                                  [issue.part.id]: e.target.value,
                                }))
                              }
                              className="w-full bg-[#1e2228] border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-white cursor-pointer"
                            >
                              <option value="">Select laminate combination…</option>
                              {issue.laminateOptions!.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-[11px] text-amber-200/80 m-0">
                              No pair of matching-species boards reaches the required thickness.
                            </p>
                          )}
                          <label className="flex items-start gap-2 text-[11px] text-amber-100 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(laminateAck[issue.part.id])}
                              onChange={(e) =>
                                setLaminateAck((prev) => ({
                                  ...prev,
                                  [issue.part.id]: e.target.checked,
                                }))
                              }
                              className="mt-0.5 accent-orange-500 cursor-pointer"
                            />
                            <span>
                              I understand this stock must be face-laminated and planed to target
                              thickness.
                            </span>
                          </label>
                        </div>
                      )}

                      {issue.kind === 'too_thick' && (
                        <div className="space-y-2 rounded-xl border border-orange-700/40 bg-orange-950/15 p-3">
                          <p className="text-xs text-orange-100 m-0 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
                            Stock is thicker than the part. Using it requires planing down to{' '}
                            {formatDim(issue.requiredThickness || 0, unitSystem)}.
                          </p>
                          <label className="flex items-start gap-2 text-[11px] text-orange-100 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(planeAck[issue.part.id])}
                              onChange={(e) =>
                                setPlaneAck((prev) => ({
                                  ...prev,
                                  [issue.part.id]: e.target.checked,
                                }))
                              }
                              className="mt-0.5 accent-orange-500 cursor-pointer"
                            />
                            <span>
                              I understand this stock must be planed to the correct thickness
                              before it is used.
                            </span>
                          </label>
                        </div>
                      )}

                      {issue.kind === 'ply_mismatch' && (
                        <p className="text-xs text-amber-100 m-0 rounded-xl border border-amber-700/40 bg-amber-950/15 px-3 py-2">
                          Sheet goods must match the required thickness exactly. Planing plywood
                          is not suggested. Log the correct thickness, or skip this part.
                        </p>
                      )}

                      {(issue.kind === 'no_species' || issue.kind === 'too_small') && (
                        <p className="text-xs text-gray-300 m-0">
                          {issue.detail ||
                            'No matching stock will fit this part. Log suitable timber or skip the part.'}
                        </p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1 border-t border-gray-800">
          <button
            type="button"
            onClick={() => finish('cancel')}
            className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => finish('pause')}
            className="flex-1 px-4 py-2.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            Pause project (buy stock later)
          </button>
          <button
            type="button"
            disabled={!generateEnabled}
            onClick={() => finish('generate')}
            className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl cursor-pointer"
          >
            {hardLeft.length > 0
              ? 'Generate what fits now'
              : skipped.size > 0
                ? 'Generate without skipped parts'
                : 'Confirm & generate'}
          </button>
        </div>
      </div>
    </AppModal>
  );
}
