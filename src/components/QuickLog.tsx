'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { PlusCircle, Tag, MapPin, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuickLog() {
  const store = useAppStore();
  const addBoard = store?.addBoard || (() => {});
  const activeLocations = (store?.storageLocations || [
    'Workbench',
    'Rack 1',
    'Rack 2',
    'Rack 3',
    'Under Cabinet',
  ]).filter((loc) => loc && loc.trim() !== '');

  const [species, setSpecies] = useState('Pine / Pallet');
  const [source, setSource] = useState('Pallet');
  const [location, setLocation] = useState(activeLocations[0] || 'Workbench');
  const [length, setLength] = useState('450');
  const [width, setWidth] = useState('75');
  const [thickness, setThickness] = useState('18');
  const [quantity, setQuantity] = useState('1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const l = parseFloat(length);
    const w = parseFloat(width);
    const t = parseFloat(thickness);
    const qty = parseInt(quantity, 10);

    if (isNaN(l) || isNaN(w) || isNaN(t) || isNaN(qty) || l <= 0 || w <= 0 || t <= 0) {
      toast.error('Please enter valid dimensions.');
      return;
    }

    const tagPrefix = species.toLowerCase().includes('walnut') ? 'WAL' : 'PIN';
    const randomId = Math.floor(100 + Math.random() * 900);
    const tagId = `${tagPrefix}-${randomId}`;

    const newBoard = {
      id: Date.now().toString(),
      tagId,
      species,
      source,
      length: l,
      width: w,
      thickness: t,
      quantity: qty,
      location,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
    };

    addBoard(newBoard);
    toast.success(`Logged board lot ${tagId} successfully!`);
  };

  return (
    <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-6 shadow-xl max-w-2xl mx-auto">
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-orange-500" /> Quick Workshop Log
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Quickly log incoming scrap lumber or stock lots into your active workshop inventory.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Wood Species</label>
            <select
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer"
            >
              <option value="Pine / Pallet">Pine / Pallet</option>
              <option value="Walnut">Walnut</option>
              <option value="European Oak">European Oak</option>
              <option value="Maple">Maple</option>
              <option value="Mahogany">Mahogany</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Source / Origin</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer"
            >
              <option value="Pallet">Pallet</option>
              <option value="Salvaged">Salvaged</option>
              <option value="Offcut Bin">Offcut Bin</option>
              <option value="Purchased">Purchased</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Storage Location</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer"
          >
            {activeLocations.map((loc, idx) => (
              <option key={idx} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Length (mm)</label>
            <input
              type="number"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Width (mm)</label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Thickness (mm)</label>
            <input
              type="number"
              value={thickness}
              onChange={(e) => setThickness(e.target.value)}
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
            />
          </div>
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

        <button
          type="submit"
          className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 text-xs cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" /> Log Board Lot to Inventory
        </button>
      </form>
    </div>
  );
}