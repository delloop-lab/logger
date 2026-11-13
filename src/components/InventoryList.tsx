'use client';

import React, { useMemo, useState } from 'react';
import { useAppStore, Board } from '@/lib/store';
import {
  Package,
  Trash2,
  Edit3,
  MapPin,
  Tag,
  Check,
  ArrowUpDown,
  CheckCircle2,
  PackageCheck,
  AlertTriangle,
  Printer,
} from 'lucide-react';
import { notify, toast } from '@/lib/notify';
import { displayToMm, formatDimsLWT, mmToDisplay, unitLabel } from '@/lib/units';
import { DEFECT_OPTIONS, formatDefectsList, type DefectType } from '@/lib/defects';
import AppModal from '@/components/AppModal';
import BoardLabelPrint from '@/components/BoardLabelPrint';
import SpeciesSelect from '@/components/SpeciesSelect';

const SOURCE_OPTIONS = [
  'New',
  'Pallet',
  'Salvaged',
  'Cut-off',
  'Furniture Teardown',
  'Offcut Bin',
  'Purchased',
] as const;

function showDescriptionForSource(source: string) {
  return source === 'Salvaged' || source === 'Furniture Teardown';
}

function showSupplierForSource(source: string) {
  return source === 'New' || source === 'Purchased';
}

type SortField =
  | 'tagId'
  | 'species'
  | 'source'
  | 'length'
  | 'width'
  | 'thickness'
  | 'location'
  | 'classification'
  | 'originProject';
type SortOrder = 'asc' | 'desc';
type TypeFilter = 'all' | 'project_offcuts' | 'finished' | 'stock';
/** Available = not consumed (includes staged finished until installed). */
type StatusFilter = 'available' | 'staged' | 'consumed' | 'all';

const isFinishedPiece = (b: Board) =>
  b.classification === 'finished_piece' || /-PART$/i.test(b.tagId || '');

const isStagedFinished = (b: Board) => isFinishedPiece(b) && b.status !== 'consumed';

/** Remnants / strips / set-asides, not finished parts */
const isProjectOffcut = (b: Board) => {
  if (isFinishedPiece(b)) return false;
  return (
    b.classification === 'reusable_offcut' ||
    b.classification === 'waste' ||
    /-(REM|EDGE|OFFCUT|WASTE|STRIP|ASIDE)$/i.test(b.tagId || '')
  );
};

export default function InventoryList() {
  const store = useAppStore();
  const boards = store?.boards || [];
  const savedProjects = store?.savedProjects || [];
  const removeBoard = store?.removeBoard || (() => {});
  const removeBoards = store?.removeBoards || ((ids: string[]) => ids.forEach((id) => removeBoard(id)));
  const updateBoard = store?.updateBoard || (() => {});
  const markBoardsInstalled = store?.markBoardsInstalled || (() => 0);
  const markProjectCompleted = store?.markProjectCompleted;
  const unitSystem = store.unitSystem;
  const u = unitLabel(unitSystem);

  const activeLocations = (store?.storageLocations || [
    'Workbench',
    'Rack 1',
    'Rack 2',
    'Rack 3',
    'Under Cabinet',
  ]).filter((loc) => loc && loc.trim() !== '');

  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [labelBoards, setLabelBoards] = useState<Board[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [sortField, setSortField] = useState<SortField>('tagId');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('available');
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [projectFilter, setProjectFilter] = useState('all');

  const speciesOptions = Array.from(new Set(boards.map((b) => b.species).filter(Boolean))).sort();

  const projectOptions = useMemo(() => {
    const names = new Set<string>();
    for (const p of savedProjects) {
      if (p.name?.trim()) names.add(p.name.trim());
    }
    for (const b of boards) {
      if (b.originProject?.trim()) names.add(b.originProject.trim());
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [boards, savedProjects]);

  const uniqueBoards = Array.from(
    new Map(boards.map((b) => [b.id || b.tagId, b])).values()
  ).filter((b) => {
    if (statusFilter === 'available') {
      // Still on the shelf, including finished parts waiting to be installed
      if (b.status === 'consumed') return false;
    } else if (statusFilter === 'staged') {
      if (!isStagedFinished(b)) return false;
    } else if (statusFilter === 'consumed') {
      if (b.status !== 'consumed') return false;
    }
    if (speciesFilter !== 'all' && b.species !== speciesFilter) return false;
    if (typeFilter === 'project_offcuts' && !isProjectOffcut(b)) return false;
    if (typeFilter === 'finished' && !isFinishedPiece(b)) return false;
    if (typeFilter === 'stock' && (isProjectOffcut(b) || isFinishedPiece(b))) return false;
    if (projectFilter !== 'all' && (b.originProject || '') !== projectFilter) return false;
    return true;
  });

  const stagedForProject =
    projectFilter === 'all'
      ? []
      : boards.filter(
          (b) => isStagedFinished(b) && (b.originProject || '') === projectFilter
        );

  const stagedCount = boards.filter(isStagedFinished).length;

  uniqueBoards.sort((a, b) => {
    if (sortField === 'originProject' || sortField === 'classification') {
      const offA = isProjectOffcut(a) ? 0 : isFinishedPiece(a) ? 1 : 2;
      const offB = isProjectOffcut(b) ? 0 : isFinishedPiece(b) ? 1 : 2;
      if (offA !== offB) {
        return sortOrder === 'asc' ? offA - offB : offB - offA;
      }
      const projA = (a.originProject || '').toLowerCase();
      const projB = (b.originProject || '').toLowerCase();
      if (projA !== projB) {
        const comp = projA.localeCompare(projB);
        return sortOrder === 'asc' ? comp : -comp;
      }
      const classA = a.classification || '';
      const classB = b.classification || '';
      if (classA !== classB) {
        const comp = classA.localeCompare(classB);
        return sortOrder === 'asc' ? comp : -comp;
      }
      return (a.tagId || '').localeCompare(b.tagId || '');
    }

    const valA = a[sortField];
    const valB = b[sortField];

    if (typeof valA === 'string' && typeof valB === 'string') {
      const comp = valA.localeCompare(valB);
      return sortOrder === 'asc' ? comp : -comp;
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }

    return 0;
  });

  const visibleIds = uniqueBoards.map((b) => b.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };

  const handleDelete = async (id: string, tagId: string) => {
    const ok = await notify.confirm({
      title: 'Remove board from inventory?',
      message: `Remove ${tagId} from inventory? This cannot be undone.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    removeBoard(id);
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.error(`Removed board ${tagId} from inventory.`);
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const tagPreview = boards
      .filter((b) => selectedIds.has(b.id))
      .map((b) => b.tagId)
      .slice(0, 5);
    const more = ids.length - tagPreview.length;
    const ok = await notify.confirm({
      title: `Remove ${ids.length} lot${ids.length === 1 ? '' : 's'} from inventory?`,
      message: `Remove ${tagPreview.join(', ')}${
        more > 0 ? ` and ${more} more` : ''
      }? This cannot be undone.`,
      confirmLabel: ids.length === 1 ? 'Remove' : `Remove ${ids.length}`,
      danger: true,
    });
    if (!ok) return;
    removeBoards(ids);
    setSelectedIds(new Set());
    toast.error(
      ids.length === 1
        ? `Removed board ${tagPreview[0] || ids[0]} from inventory.`
        : `Removed ${ids.length} lots from inventory.`
    );
  };

  /** Finished part leaves Available when installed into the completed project build. */
  const markInstalled = (board: Board) => {
    const n = markBoardsInstalled([board.id]);
    if (n === 0) {
      toast.error(`Could not install ${board.tagId}, try refreshing inventory.`);
      return;
    }
    toast.success(
      `${board.tagId} marked installed, removed from stock${
        board.originProject ? ` (${board.originProject})` : ''
      }.`
    );
  };

  const markProjectBuildComplete = () => {
    if (projectFilter === 'all' || stagedForProject.length === 0) {
      toast.error('Select a project with staged finished parts first.');
      return;
    }
    const n = markBoardsInstalled(stagedForProject.map((b) => b.id));
    const showcase = markProjectCompleted?.(projectFilter);
    if (showcase?.ok) {
      toast.success(
        `Build complete: ${n} finished part${n === 1 ? '' : 's'} installed. "${showcase.name}" is in What Can I Build, add a skill level and description there.`
      );
    } else {
      toast.success(
        `Build complete: ${n} finished part${n === 1 ? '' : 's'} installed for ${projectFilter}.${
          showcase && !showcase.ok ? ` ${showcase.message}` : ''
        }`
      );
    }
    setStatusFilter('consumed');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBoard) return;

    updateBoard(editingBoard);
    setEditingBoard(null);
    toast.success(`Updated board ${editingBoard.tagId}!`);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-6 shadow-xl relative">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" /> Logged Inventory Boards
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Available includes stock, offcuts, and staged finished parts. Mark finished parts
            installed when the project build is complete, then they leave Available. Create and
            open projects in Projects & Cuts.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
          <select
            value={typeFilter}
            onChange={(e) => {
              const next = e.target.value as TypeFilter;
              setTypeFilter(next);
              if (next === 'project_offcuts') {
                setSortField('originProject');
                setSortOrder('asc');
              }
              if (next === 'finished') {
                setStatusFilter('staged');
              }
            }}
            className="bg-[#121417] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-semibold cursor-pointer"
          >
            <option value="all">All types</option>
            <option value="project_offcuts">Offcuts from projects</option>
            <option value="finished">Finished parts</option>
            <option value="stock">Stock lots only</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="bg-[#121417] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-semibold cursor-pointer"
          >
            <option value="available">Available</option>
            <option value="staged">Staged finished</option>
            <option value="consumed">Consumed, installed</option>
            <option value="all">All statuses</option>
          </select>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="bg-[#121417] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-semibold cursor-pointer"
          >
            <option value="all">All projects</option>
            {projectOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={speciesFilter}
            onChange={(e) => setSpeciesFilter(e.target.value)}
            className="bg-[#121417] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-semibold cursor-pointer"
          >
            <option value="all">All species</option>
            {speciesOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 bg-[#121417] px-3 py-2 rounded-xl border border-gray-800 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-gray-400">Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
            >
              <option value="originProject" className="bg-[#121417]">Project, offcut</option>
              <option value="classification" className="bg-[#121417]">Type</option>
              <option value="tagId" className="bg-[#121417]">Tag ID</option>
              <option value="species" className="bg-[#121417]">Species</option>
              <option value="source" className="bg-[#121417]">Source</option>
              <option value="length" className="bg-[#121417]">Length</option>
              <option value="width" className="bg-[#121417]">Width</option>
              <option value="thickness" className="bg-[#121417]">Thickness</option>
              <option value="location" className="bg-[#121417]">Location</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="text-orange-400 hover:text-orange-300 font-bold px-1.5 py-0.5 rounded bg-gray-800 text-[10px]"
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>

          <span className="text-xs bg-gray-800 text-orange-400 font-mono px-3 py-2 rounded-xl border border-gray-700">
            Showing:{' '}
            <strong className="text-white">{uniqueBoards.length}</strong> lot
            {uniqueBoards.length === 1 ? '' : 's'}
            {', '}
            <strong className="text-emerald-400">
              {uniqueBoards.filter(isFinishedPiece).length} finished
            </strong>
            {', '}
            <strong className="text-amber-300">
              {uniqueBoards.filter(isProjectOffcut).length} offcuts
            </strong>
          </span>

          {stagedCount > 0 && statusFilter === 'available' && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('staged');
                setTypeFilter('finished');
              }}
              className="inline-flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-700/50 text-emerald-300 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {stagedCount} staged, click to filter
            </button>
          )}

          {projectFilter !== 'all' && stagedForProject.length > 0 && (
            <button
              type="button"
              onClick={markProjectBuildComplete}
              className="inline-flex items-center gap-1.5 bg-emerald-900/40 hover:bg-emerald-800/50 border border-emerald-700/60 text-emerald-300 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              title={`Mark all staged finished parts for ${projectFilter} as installed`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              Complete build, {projectFilter}, {stagedForProject.length}
            </button>
          )}

          {selectedCount > 0 && (
            <>
              <button
                type="button"
                data-allow-demo
                onClick={() => {
                  const selected = boards.filter((b) => selectedIds.has(b.id));
                  if (selected.length === 0) {
                    toast.error('No selected lots found to print.');
                    return;
                  }
                  setLabelBoards(selected);
                }}
                className="inline-flex items-center gap-1.5 bg-sky-950/50 hover:bg-sky-900/50 border border-sky-700/60 text-sky-300 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                title="Print QR labels for selected lots"
              >
                <Printer className="w-3.5 h-3.5" />
                Print selected ({selectedCount})
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteSelected()}
                className="inline-flex items-center gap-1.5 bg-red-950/50 hover:bg-red-900/50 border border-red-700/60 text-red-300 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                title="Remove selected lots from inventory"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete selected ({selectedCount})
              </button>
            </>
          )}
      </div>

      {uniqueBoards.length === 0 ? (
        <div className="py-16 text-center text-gray-500 text-xs border border-dashed border-gray-800 rounded-xl">
          No boards logged yet. Use the <strong>Quick Log</strong> tab to add your first stock lot.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#121417] text-gray-400 uppercase font-mono text-[10px] tracking-wider border-b border-gray-800">
              <tr>
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                    }}
                    onChange={toggleSelectAllVisible}
                    className="accent-orange-500 cursor-pointer"
                    title={allVisibleSelected ? 'Deselect all visible' : 'Select all visible'}
                    aria-label={allVisibleSelected ? 'Deselect all visible' : 'Select all visible'}
                  />
                </th>
                <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('tagId')}>Tag ID</th>
                <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('originProject')}>Project</th>
                <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('species')}>Species</th>
                <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('source')}>Source</th>
                <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('length')}>Dimensions (L × W × T)</th>
                <th className="p-3">Qty</th>
                <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('location')}>Location</th>
                <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('classification')}>Type, status</th>
                <th className="p-3">Defects</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 font-mono">
              {uniqueBoards.map((b) => {
                const defectLabel = formatDefectsList(b.defects, b.defectNotes);
                const selected = selectedIds.has(b.id);
                return (
                <tr
                  key={b.id}
                  className={`hover:bg-[#121417]/50 transition-all ${
                    selected ? 'bg-orange-950/20' : ''
                  }`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelect(b.id)}
                      className="accent-orange-500 cursor-pointer"
                      aria-label={`Select ${b.tagId}`}
                    />
                  </td>
                  <td className="p-3 font-bold text-orange-400 flex items-center gap-1.5 font-sans">
                    <Tag className="w-3.5 h-3.5 text-orange-500" /> {b.tagId}
                  </td>
                  <td className="p-3 text-amber-300/90 font-sans text-[11px]">
                    {b.originProject || ''}
                  </td>
                  <td className="p-3 font-sans font-semibold text-white">{b.species}</td>
                  <td className="p-3 text-gray-400">{b.source}</td>
                  <td className="p-3 text-gray-200">
                    {formatDimsLWT(b.length, b.width, b.thickness, unitSystem)}
                  </td>
                  <td className="p-3 text-white font-bold">{b.quantity || 1}</td>
                  <td className="p-3 text-emerald-400">
                    <span className="inline-flex items-center gap-1 font-sans">
                      <MapPin className="w-3.5 h-3.5" /> {b.location || 'Workbench'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] uppercase tracking-wide border px-2 py-0.5 rounded ${
                        isFinishedPiece(b)
                          ? b.status === 'consumed'
                            ? 'text-slate-300 border-slate-600/60 bg-slate-900/40'
                            : 'text-emerald-300 border-emerald-700/60 bg-emerald-950/30'
                          : isProjectOffcut(b)
                            ? 'text-amber-300 border-amber-700/60 bg-amber-950/30'
                            : 'text-gray-400 border-gray-700'
                      }`}
                    >
                      {isFinishedPiece(b)
                        ? b.status === 'consumed'
                          ? 'finished, installed'
                          : 'finished, staged'
                        : isProjectOffcut(b)
                          ? 'project offcut'
                          : b.classification || 'stock'}
                      {!isFinishedPiece(b) && b.status === 'consumed' ? ', consumed' : ''}
                    </span>
                  </td>
                  <td className="p-3 font-sans text-[11px] max-w-[14rem]">
                    {defectLabel ? (
                      <span className="inline-flex items-start gap-1 text-amber-300">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{defectLabel}</span>
                      </span>
                    ) : (
                      <span className="text-gray-600">None</span>
                    )}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    {isStagedFinished(b) && (
                      <button
                        onClick={() => markInstalled(b)}
                        className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded-lg hover:bg-emerald-950/40 transition-all inline-block cursor-pointer"
                        title="Mark installed in project build (removes from Available)"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      data-allow-demo
                      onClick={() => setLabelBoards([b])}
                      className="text-sky-400 hover:text-sky-300 p-1.5 rounded-lg hover:bg-sky-950/40 transition-all inline-block cursor-pointer"
                      title="Print QR label"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingBoard({ ...b })}
                      className="text-orange-400 hover:text-orange-300 p-1.5 rounded-lg hover:bg-orange-950/40 transition-all inline-block cursor-pointer"
                      title="Edit Board"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id, b.tagId)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-950/40 transition-all inline-block cursor-pointer"
                      title="Delete Board"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AppModal
        open={Boolean(editingBoard)}
        onClose={() => setEditingBoard(null)}
        title={editingBoard ? `Edit board (${editingBoard.tagId})` : 'Edit board'}
        subtitle="Same fields as Quick Log"
        size="xl"
      >
        {editingBoard && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Tag ID</label>
                <input
                  type="text"
                  value={editingBoard.tagId}
                  onChange={(e) => setEditingBoard({ ...editingBoard, tagId: e.target.value })}
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Wood Species</label>
                <SpeciesSelect
                  value={editingBoard.species}
                  onChange={(species) => setEditingBoard({ ...editingBoard, species })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Source / Origin</label>
                <select
                  value={
                    SOURCE_OPTIONS.includes(editingBoard.source as (typeof SOURCE_OPTIONS)[number])
                      ? editingBoard.source
                      : editingBoard.source || 'Pallet'
                  }
                  onChange={(e) => {
                    const source = e.target.value;
                    const keepNotes =
                      showDescriptionForSource(source) || showSupplierForSource(source)
                        ? editingBoard.notes
                        : undefined;
                    setEditingBoard({ ...editingBoard, source, notes: keepNotes });
                  }}
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer"
                >
                  {!SOURCE_OPTIONS.includes(editingBoard.source as (typeof SOURCE_OPTIONS)[number]) &&
                  editingBoard.source ? (
                    <option value={editingBoard.source}>{editingBoard.source}</option>
                  ) : null}
                  {SOURCE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Storage Location
                </label>
                <select
                  value={
                    activeLocations.includes(editingBoard.location)
                      ? editingBoard.location
                      : activeLocations[0] || editingBoard.location
                  }
                  onChange={(e) => setEditingBoard({ ...editingBoard, location: e.target.value })}
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer"
                >
                  {!activeLocations.includes(editingBoard.location) && editingBoard.location ? (
                    <option value={editingBoard.location}>{editingBoard.location}</option>
                  ) : null}
                  {activeLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(showDescriptionForSource(editingBoard.source) ||
              showSupplierForSource(editingBoard.source)) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {showDescriptionForSource(editingBoard.source) && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Description <span className="font-normal text-gray-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={editingBoard.notes || ''}
                      onChange={(e) =>
                        setEditingBoard({
                          ...editingBoard,
                          notes: e.target.value.trim() ? e.target.value : undefined,
                        })
                      }
                      placeholder="e.g. bedhead, stool leg"
                      className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}
                {showSupplierForSource(editingBoard.source) && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Supplier <span className="font-normal text-gray-500">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={editingBoard.notes || ''}
                      onChange={(e) =>
                        setEditingBoard({
                          ...editingBoard,
                          notes: e.target.value.trim() ? e.target.value : undefined,
                        })
                      }
                      placeholder="e.g. Bunnings, local timber yard"
                      className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Length ({u})</label>
                <input
                  type="number"
                  step="any"
                  value={mmToDisplay(
                    editingBoard.length,
                    unitSystem,
                    unitSystem === 'imperial' ? 2 : 1
                  )}
                  onChange={(e) =>
                    setEditingBoard({
                      ...editingBoard,
                      length: displayToMm(parseFloat(e.target.value) || 0, unitSystem),
                    })
                  }
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Width ({u})</label>
                <input
                  type="number"
                  step="any"
                  value={mmToDisplay(
                    editingBoard.width,
                    unitSystem,
                    unitSystem === 'imperial' ? 2 : 1
                  )}
                  onChange={(e) =>
                    setEditingBoard({
                      ...editingBoard,
                      width: displayToMm(parseFloat(e.target.value) || 0, unitSystem),
                    })
                  }
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Thickness ({u})
                </label>
                <input
                  type="number"
                  step="any"
                  value={mmToDisplay(
                    editingBoard.thickness,
                    unitSystem,
                    unitSystem === 'imperial' ? 2 : 1
                  )}
                  onChange={(e) =>
                    setEditingBoard({
                      ...editingBoard,
                      thickness: displayToMm(parseFloat(e.target.value) || 0, unitSystem),
                    })
                  }
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Qty in lot</label>
                <input
                  type="number"
                  min={1}
                  value={editingBoard.quantity || 1}
                  onChange={(e) =>
                    setEditingBoard({
                      ...editingBoard,
                      quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                    })
                  }
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-amber-800/40 bg-amber-950/20 p-3.5">
              <label className="flex items-center gap-2 text-xs font-medium text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" /> Defects on this stock
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {DEFECT_OPTIONS.map((d) => {
                  const checked = (editingBoard.defects || []).includes(d);
                  return (
                    <label
                      key={d}
                      className={`flex items-center gap-2 text-[11px] rounded-lg px-2.5 py-1.5 cursor-pointer border ${
                        checked
                          ? 'border-amber-600/60 bg-amber-950/40 text-amber-200'
                          : 'border-gray-800 bg-[#121417] text-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const cur = (editingBoard.defects || []) as DefectType[];
                          const next = checked ? cur.filter((x) => x !== d) : [...cur, d];
                          setEditingBoard({
                            ...editingBoard,
                            defects: next.length ? next : undefined,
                          });
                        }}
                        className="accent-amber-500 cursor-pointer"
                      />
                      {d}
                    </label>
                  );
                })}
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  Defect notes (optional)
                </label>
                <input
                  type="text"
                  value={editingBoard.defectNotes || ''}
                  onChange={(e) =>
                    setEditingBoard({
                      ...editingBoard,
                      defectNotes: e.target.value || undefined,
                    })
                  }
                  placeholder="e.g. screw holes near one end, avoid for face panels"
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingBoard(null)}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-orange-600/30 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </form>
        )}
      </AppModal>

      <BoardLabelPrint
        boards={labelBoards}
        unitSystem={unitSystem}
        onClose={() => setLabelBoards([])}
      />
    </div>
  );
}
