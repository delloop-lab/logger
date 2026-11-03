'use client';

import React, { useState } from 'react';
import { useAppStore, CutPart } from '@/lib/store';
import { displayToMm, formatDim, unitLabel } from '@/lib/units';
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
} from 'lucide-react';
import CutListDrawing from '@/components/CutListDrawing';
import toast from 'react-hot-toast';

export default function CutListNesting() {
  const store = useAppStore();
  const boards = store?.boards || [];
  const savedProjects = store?.savedProjects || [];
  const activeProjectName = store?.activeProjectName || 'New Project';
  const activeParts = store?.activeParts || [];
  const unitSystem = store.unitSystem;
  const u = unitLabel(unitSystem);

  const [partName, setPartName] = useState('');
  const [woodSpecies, setWoodSpecies] = useState('Pine / Pallet');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [quantity, setQuantity] = useState('1');

  const [isGenerated, setIsGenerated] = useState(false);

  const handleStartNewProject = () => {
    if (activeParts.length > 0 && !confirm('Start a new project? This will clear your current cut list.')) {
      return;
    }
    store.startNewProject();
    setIsGenerated(false);
    toast.success('Started a new project! Add your required cut parts below.');
  };

  const handleSaveCurrentProject = () => {
    if (!activeProjectName.trim()) {
      toast.error('Please enter a project name.');
      return;
    }
    if (activeParts.length === 0) {
      toast.error('Add at least one part before saving.');
      return;
    }
    store.saveCurrentProject();
    toast.success(`Saved project "${activeProjectName}" to project drawer!`);
  };

  const handleLoadProject = (id: string, name: string) => {
    store.loadProject(id);
    setIsGenerated(true);
    toast.success(`Loaded project: "${name}"`);
  };

  const handleDeleteSavedProject = (id: string, name: string) => {
    store.deleteProject(id);
    toast.error(`Deleted project: "${name}"`);
  };

  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    const l = displayToMm(parseFloat(length), unitSystem);
    const w = displayToMm(parseFloat(width), unitSystem);
    const qty = parseInt(quantity, 10);

    if (!partName.trim() || isNaN(l) || isNaN(w) || isNaN(qty) || l <= 0 || w <= 0 || qty <= 0) {
      toast.error('Please enter a valid part name, dimensions, and quantity.');
      return;
    }

    const newPart: CutPart = {
      id: Date.now().toString(),
      name: partName.trim(),
      species: woodSpecies,
      length: l,
      width: w,
      quantity: qty,
    };

    store.addPartToActiveProject(newPart);
    setPartName('');
    setLength('');
    setWidth('');
    setQuantity('1');
    setIsGenerated(true);
    toast.success(`Added ${newPart.name} to cut list!`);
  };

  const handleDeletePart = (id: string) => {
    store.removePartFromActiveProject(id);
    toast.error('Removed part from cut list.');
  };

  const totalBoardsRequired = activeParts.reduce((acc, p) => acc + p.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Scissors className="w-5 h-5 text-orange-500" /> Cut-List & Nesting Optimizer
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Allocates exact inventory tag IDs matching your real stock across active workshop locations.
            </p>
          </div>
          <span className="text-xs bg-gray-800 text-orange-400 font-mono px-3 py-1.5 rounded-xl border border-gray-700">
            Logged Inventory: <strong className="text-white">{boards.length} boards</strong>
          </span>
        </div>
      </div>

      {/* Project Controls & Build Name */}
      <div className="bg-[#1e2228] border border-gray-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1 w-full space-y-1">
          <label className="block text-xs font-bold text-gray-400 uppercase font-mono">Active Project / Build Name</label>
          <input
            type="text"
            value={activeProjectName}
            onChange={(e) => store.setActiveProjectName(e.target.value)}
            placeholder="e.g. Cutting Board, Workbench Table, Router Table"
            className="w-full bg-[#121417] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 mt-auto">
          <button
            onClick={handleSaveCurrentProject}
            className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Build
          </button>

          <button
            onClick={handleStartNewProject}
            className="flex-1 md:flex-none px-4 py-2.5 bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" /> Start New Project
          </button>
        </div>
      </div>

      {/* Saved Projects Drawer (This will now show up on your screen!) */}
      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Folder className="w-4 h-4 text-orange-500" /> Saved Workshop Projects ({savedProjects.length})
          </h4>
          <span className="text-[11px] text-gray-400 font-mono">Select a project to switch builds</span>
        </div>

        {savedProjects.length === 0 ? (
          <div className="py-6 text-center text-gray-500 text-xs border border-dashed border-gray-800 rounded-xl font-mono">
            No saved projects yet. Click <strong>Save Build</strong> above to store your project configuration.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedProjects.map((proj) => {
              const count = proj.parts.reduce((acc, p) => acc + p.quantity, 0);
              const isActive = proj.name.toLowerCase() === activeProjectName.toLowerCase();

              return (
                <div
                  key={proj.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between font-mono text-xs transition-all ${
                    isActive
                      ? 'bg-orange-950/40 border-orange-500/50 text-white'
                      : 'bg-[#121417] border-gray-800 text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-white block">{proj.name}</span>
                    <span className="text-[10px] text-gray-400 block">
                      {count} Total Parts — {proj.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleLoadProject(proj.id, proj.name)}
                      className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-orange-400 font-semibold rounded-lg flex items-center gap-1 cursor-pointer text-[11px]"
                    >
                      Load <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteSavedProject(proj.id, proj.name)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-950/40 transition-all cursor-pointer"
                      title="Delete Project"
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

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Part Form */}
        <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-orange-500" /> Add Required Cut Part
          </h4>

          <form onSubmit={handleAddPart} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Part Name</label>
                <input
                  type="text"
                  placeholder="e.g. Cutting Board, Rails, Legs"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Wood Species</label>
                <select
                  value={woodSpecies}
                  onChange={(e) => setWoodSpecies(e.target.value)}
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer"
                >
                  <option value="Pine / Pallet">Pine / Pallet</option>
                  <option value="Walnut">Walnut</option>
                  <option value="European Oak">European Oak</option>
                  <option value="Maple">Maple</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Length ({u})</label>
                <input
                  type="number"
                  step="any"
                  placeholder={unitSystem === 'imperial' ? 'e.g. 13.78' : 'e.g. 350'}
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Width ({u})</label>
                <input
                  type="number"
                  step="any"
                  placeholder={unitSystem === 'imperial' ? 'e.g. 2' : 'e.g. 50'}
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Add Part to Cut List
            </button>
          </form>
        </div>

        {/* Current Cut List Summary */}
        <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-500" /> Cut List: <span className="text-orange-400">{activeProjectName}</span> ({totalBoardsRequired} pieces)
              </h4>
              <button
                onClick={() => store.setActiveParts([])}
                className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-1 cursor-pointer font-mono"
                title="Clear cut list"
              >
                <RotateCcw className="w-3 h-3" /> Clear List
              </button>
            </div>

            {activeParts.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs border border-dashed border-gray-800 rounded-xl font-mono">
                No parts added yet. Fill out the form on the left to start building your cut list.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {activeParts.map((p) => (
                  <div key={p.id} className="bg-[#121417] border border-gray-800 p-3.5 rounded-xl flex items-center justify-between">
                    <div className="space-y-0.5 font-mono">
                      <div className="text-white font-bold text-xs flex items-center gap-2">
                        <span>{p.name}</span>
                        <span className="text-[10px] bg-orange-950 text-orange-400 px-2 py-0.5 rounded border border-orange-800">{p.species}</span>
                      </div>
                      <div className="text-gray-400 text-xs">
                        {formatDim(p.length, unitSystem)} × {formatDim(p.width, unitSystem)} — Qty:{' '}
                        <strong className="text-white">{p.quantity}</strong>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePart(p.id)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-950/40 transition-all cursor-pointer"
                      title="Remove Part"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-gray-800">
            <button
              disabled={activeParts.length === 0}
              onClick={() => {
                setIsGenerated(true);
                toast.success('Generated optimized cutting instructions & drawings!');
              }}
              className={`w-full font-semibold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-xs ${
                activeParts.length === 0
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 cursor-pointer'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> Generate Instructions ({totalBoardsRequired} Total Boards)
            </button>
          </div>
        </div>
      </div>

      {/* Render Technical 2D Drawings Component */}
      {isGenerated && activeParts.length > 0 && (
        <div className="space-y-6 pt-4">
          <CutListDrawing />
        </div>
      )}
    </div>
  );
}