'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InventoryView() {
  const store = useAppStore();
  const addBoard = store?.addBoard || (() => {});

  // Active custom storage locations (filtering out blank slots)
  const activeLocations = (store?.storageLocations || [
    'Workbench', 
    'Rack 1', 
    'Rack 2', 
    'Rack 3', 
    'Under Cabinet'
  ]).filter(loc => loc && loc.trim() !== '');

  const [species, setSpecies] = useState('Pine/Pallet');
  const [source, setSource] = useState('Pallet');
  const [length, setLength] = useState('450');
  const [width, setWidth] = useState('75');
  const [thickness, setThickness] = useState('18');
  const [quantity, setQuantity] = useState('6');
  const [location, setLocation] = useState(activeLocations[0] || 'Workbench');

  const handleLogBoard = (e: React.FormEvent) => {
    e.preventDefault();

    const l = parseFloat(length);
    const w = parseFloat(width);
    const t = parseFloat(thickness);
    const qty = parseInt(quantity, 10);

    if (isNaN(l) || isNaN(w) || isNaN(t) || isNaN(qty) || l <= 0 || w <= 0 || t <= 0 || qty <= 0) {
      toast.error('Please enter valid dimensions and quantity.');
      return;
    }

    const newBoard = {
      id: Date.now().toString(),
      tagId: `PIN-${Math.floor(100 + Math.random() * 900)}`,
      species,
      source,
      length: l,
      width: w,
      thickness: t,
      quantity: qty,
      location: location || 'Workbench',
      status: 'active' as const,
      createdAt: new Date().toISOString(),
    };

    addBoard(newBoard);
    toast.success(`Logged ${qty}x board lot to ${location}!`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-orange-500" /> Quick Workshop Log
        </h3>

        <form onSubmit={handleLogBoard} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Wood Species</label>
              <select
                value={species}
                onChange={e => setSpecies(e.target.value)}
                className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-semibold"
              >
                <option value="Pine/Pallet">Pine / Pallet</option>
                <option value="European Oak">European Oak</option>
                <option value="Walnut">Walnut</option>
                <option value="Maple">Maple</option>
                <option value="Cherry">Cherry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Source</label>
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-semibold"
              >
                <option value="Pallet">Pallet</option>
                <option value="Cut-off">Cut-off</option>
                <option value="Salvaged">Salvaged Timber</option>
                <option value="Purchased">Purchased Lumber</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Storage Location</label>
              <select
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-semibold"
              >
                {activeLocations.length === 0 ? (
                  <option value="Workbench">Workbench (Default)</option>
                ) : (
                  activeLocations.map((loc, idx) => (
                    <option key={idx} value={loc}>
                      {loc}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Length (mm)</label>
              <input
                type="number"
                value={length}
                onChange={e => setLength(e.target.value)}
                className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Width (mm)</label>
              <input
                type="number"
                value={width}
                onChange={e => setWidth(e.target.value)}
                className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Thickness (mm)</label>
              <input
                type="number"
                value={thickness}
                onChange={e => setThickness(e.target.value)}
                className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 text-sm"
          >
            <PlusCircle className="w-5 h-5" /> Log Board Lot to Inventory
          </button>
        </form>
      </div>
    </div>
  );
}