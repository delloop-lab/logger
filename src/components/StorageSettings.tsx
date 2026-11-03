'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Sliders, Save, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StorageSettings() {
  const store = useAppStore();
  const settings = store?.offcutSettings || { minLength: 100, minWidth: 100 };
  const storageLocations = store?.storageLocations || [];

  const [minLength, setMinLength] = useState(settings.minLength.toString());
  const [minWidth, setMinWidth] = useState(settings.minWidth.toString());
  const [newLocation, setNewLocation] = useState('');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const l = parseFloat(minLength);
    const w = parseFloat(minWidth);

    if (isNaN(l) || isNaN(w) || l < 0 || w < 0) {
      toast.error('Please enter valid positive dimensions.');
      return;
    }

    store.updateOffcutSettings({ minLength: l, minWidth: w });
    toast.success('Updated offcut classification thresholds!');
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.trim()) return;
    if (storageLocations.includes(newLocation.trim())) {
      toast.error('Location already exists.');
      return;
    }
    store.updateStorageLocations([...storageLocations, newLocation.trim()]);
    setNewLocation('');
    toast.success('Added new storage location!');
  };

  const handleDeleteLocation = (loc: string) => {
    store.updateStorageLocations(storageLocations.filter((l) => l !== loc));
    toast.error(`Removed location: ${loc}`);
  };

  return (
    <div className="space-y-6">
      {/* Offcut Threshold Configuration Card */}
      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-orange-500" /> Minimum Reusable Offcut Size Settings
        </h3>
        <p className="text-xs text-gray-400">
          Pieces with BOTH length and width below these limits will automatically be categorized as <strong>Waste</strong>. If EITHER dimension meets or exceeds the threshold, the piece is logged as a <strong>Reusable Offcut</strong>.
        </p>

        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Min Length (mm)</label>
            <input
              type="number"
              value={minLength}
              onChange={(e) => setMinLength(e.target.value)}
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Min Width (mm)</label>
            <input
              type="number"
              value={minWidth}
              onChange={(e) => setMinWidth(e.target.value)}
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/30"
            >
              <Save className="w-4 h-4" /> Save Rules
            </button>
          </div>
        </form>
      </div>

      {/* Storage Locations Management */}
      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          Workshop Storage Locations ({storageLocations.length})
        </h3>

        <form onSubmit={handleAddLocation} className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. Rack 4, Cabinet B"
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            className="flex-1 bg-[#121417] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-orange-500" /> Add Location
          </button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {storageLocations.map((loc) => (
            <div
              key={loc}
              className="bg-[#121417] border border-gray-800 p-3 rounded-xl flex items-center justify-between text-xs text-gray-300 font-mono"
            >
              <span>{loc}</span>
              <button
                onClick={() => handleDeleteLocation(loc)}
                className="text-gray-500 hover:text-red-400 p-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}