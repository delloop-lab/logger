'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { displayToMm, mmToDisplay, unitLabel } from '@/lib/units';

export default function QuickLog() {
  const addBoard = useAppStore((s) => s.addBoard);
  const unitSystem = useAppStore((s) => s.unitSystem);
  const activeLocations = useAppStore((s) =>
    (s.storageLocations || []).filter((loc) => loc && loc.trim() !== '')
  );
  const u = unitLabel(unitSystem);

  const [species, setSpecies] = useState('Pine / Pallet');
  const [source, setSource] = useState('Pallet');
  const [location, setLocation] = useState(activeLocations[0] || 'Workbench');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [thickness, setThickness] = useState('');
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    // Sensible defaults in current unit system (450×75×18 mm)
    setLength(String(mmToDisplay(450, unitSystem, unitSystem === 'imperial' ? 2 : 0)));
    setWidth(String(mmToDisplay(75, unitSystem, unitSystem === 'imperial' ? 2 : 0)));
    setThickness(String(mmToDisplay(18, unitSystem, unitSystem === 'imperial' ? 2 : 0)));
  }, [unitSystem]);

  useEffect(() => {
    if (activeLocations.length && !activeLocations.includes(location)) {
      setLocation(activeLocations[0]);
    }
  }, [activeLocations, location]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const l = displayToMm(parseFloat(length), unitSystem);
    const w = displayToMm(parseFloat(width), unitSystem);
    const t = displayToMm(parseFloat(thickness), unitSystem);
    const qty = parseInt(quantity, 10);

    if (isNaN(l) || isNaN(w) || isNaN(t) || isNaN(qty) || l <= 0 || w <= 0 || t <= 0) {
      toast.error('Please enter valid dimensions.');
      return;
    }

    const tagPrefix = species.toLowerCase().includes('walnut') ? 'WAL' : 'PIN';
    const randomId = Math.floor(100 + Math.random() * 900);
    const tagId = `${tagPrefix}-${randomId}`;

    addBoard({
      id: Date.now().toString(),
      tagId,
      species,
      source,
      length: l,
      width: w,
      thickness: t,
      quantity: qty,
      location,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    toast.success(`Logged board lot ${tagId} successfully!`);
  };

  return (
    <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-6 shadow-xl max-w-2xl mx-auto">
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-orange-500" /> Quick Workshop Log
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Log timber using {unitSystem === 'imperial' ? 'inches' : 'millimetres'}. Values are stored
          internally in mm.
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
              <option value="Cut-off">Cut-off</option>
              <option value="Furniture Teardown">Furniture Teardown</option>
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
            {activeLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Length ({u})</label>
            <input
              type="number"
              step="any"
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
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Thickness ({u})</label>
            <input
              type="number"
              step="any"
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
