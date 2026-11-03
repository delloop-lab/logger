'use client';

import React, { useState } from 'react';
import { useAppStore, Board } from '@/lib/store';
import { Package, Trash2, Edit3, MapPin, Tag, X, Check, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { displayToMm, formatDimsLWT, mmToDisplay, unitLabel } from '@/lib/units';

type SortField = 'tagId' | 'species' | 'source' | 'length' | 'width' | 'thickness' | 'location';
type SortOrder = 'asc' | 'desc';

export default function InventoryList() {
  const store = useAppStore();
  const boards = store?.boards || [];
  const removeBoard = store?.removeBoard || (() => {});
  const addBoard = store?.addBoard || (() => {});
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
  const [sortField, setSortField] = useState<SortField>('tagId');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'consumed'>('active');
  const [speciesFilter, setSpeciesFilter] = useState('all');

  const speciesOptions = Array.from(new Set(boards.map((b) => b.species).filter(Boolean))).sort();

  const uniqueBoards = Array.from(
    new Map(boards.map((b) => [b.id || b.tagId, b])).values()
  ).filter((b) => {
    if (statusFilter === 'active' && b.status === 'consumed') return false;
    if (statusFilter === 'consumed' && b.status !== 'consumed') return false;
    if (speciesFilter !== 'all' && b.species !== speciesFilter) return false;
    return true;
  });

  uniqueBoards.sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === 'string' && typeof valB === 'string') {
      const comp = valA.localeCompare(valB);
      return sortOrder === 'asc' ? comp : -comp;
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }

    return 0;
  });

  const handleDelete = (id: string, tagId: string) => {
    removeBoard(id);
    toast.error(`Removed board ${tagId} from inventory.`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBoard) return;

    removeBoard(editingBoard.id);
    addBoard(editingBoard);
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
            Manage your active stock, tag IDs, dimensions, and workshop locations.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'active' | 'all' | 'consumed')}
            className="bg-[#121417] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-semibold cursor-pointer"
          >
            <option value="active">Available</option>
            <option value="consumed">Consumed</option>
            <option value="all">All statuses</option>
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
            Showing: <strong className="text-white">{uniqueBoards.length}</strong>
          </span>
        </div>
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
                <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('tagId')}>Tag ID</th>
                <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('species')}>Species</th>
                <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('source')}>Source</th>
                <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('length')}>Dimensions (L × W × T)</th>
                <th className="p-3 cursor-pointer hover:text-white" onClick={() => toggleSort('location')}>Location</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 font-mono">
              {uniqueBoards.map((b) => (
                <tr key={b.id} className="hover:bg-[#121417]/50 transition-all">
                  <td className="p-3 font-bold text-orange-400 flex items-center gap-1.5 font-sans">
                    <Tag className="w-3.5 h-3.5 text-orange-500" /> {b.tagId}
                  </td>
                  <td className="p-3 font-sans font-semibold text-white">{b.species}</td>
                  <td className="p-3 text-gray-400">{b.source}</td>
                  <td className="p-3 text-gray-200">
                    {formatDimsLWT(b.length, b.width, b.thickness, unitSystem)}
                  </td>
                  <td className="p-3 text-emerald-400">
                    <span className="inline-flex items-center gap-1 font-sans">
                      <MapPin className="w-3.5 h-3.5" /> {b.location || 'Workbench'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-[10px] uppercase tracking-wide text-gray-400 border border-gray-700 px-2 py-0.5 rounded">
                      {b.status}
                      {b.classification ? ` · ${b.classification}` : ''}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1">
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Board Modal */}
      {editingBoard && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-orange-500" /> Edit Board ({editingBoard.tagId})
              </h4>
              <button onClick={() => setEditingBoard(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Tag ID</label>
                <input
                  type="text"
                  value={editingBoard.tagId}
                  onChange={(e) => setEditingBoard({ ...editingBoard, tagId: e.target.value })}
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">Species</label>
                  <input
                    type="text"
                    value={editingBoard.species}
                    onChange={(e) => setEditingBoard({ ...editingBoard, species: e.target.value })}
                    className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">Source</label>
                  <input
                    type="text"
                    value={editingBoard.source}
                    onChange={(e) => setEditingBoard({ ...editingBoard, source: e.target.value })}
                    className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">Length ({u})</label>
                  <input
                    type="number"
                    step="any"
                    value={mmToDisplay(editingBoard.length, unitSystem, unitSystem === 'imperial' ? 2 : 1)}
                    onChange={(e) =>
                      setEditingBoard({
                        ...editingBoard,
                        length: displayToMm(parseFloat(e.target.value) || 0, unitSystem),
                      })
                    }
                    className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">Width ({u})</label>
                  <input
                    type="number"
                    step="any"
                    value={mmToDisplay(editingBoard.width, unitSystem, unitSystem === 'imperial' ? 2 : 1)}
                    onChange={(e) =>
                      setEditingBoard({
                        ...editingBoard,
                        width: displayToMm(parseFloat(e.target.value) || 0, unitSystem),
                      })
                    }
                    className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-400 mb-1">Thick ({u})</label>
                  <input
                    type="number"
                    step="any"
                    value={mmToDisplay(editingBoard.thickness, unitSystem, unitSystem === 'imperial' ? 2 : 1)}
                    onChange={(e) =>
                      setEditingBoard({
                        ...editingBoard,
                        thickness: displayToMm(parseFloat(e.target.value) || 0, unitSystem),
                      })
                    }
                    className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">Storage Location</label>
                <select
                  value={editingBoard.location}
                  onChange={(e) => setEditingBoard({ ...editingBoard, location: e.target.value })}
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer"
                >
                  {activeLocations.map((loc, idx) => (
                    <option key={idx} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingBoard(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-orange-600/30 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}