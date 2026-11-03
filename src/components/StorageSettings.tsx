'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Sliders, Save, Plus, Trash2, RotateCcw, Ruler, Cloud } from 'lucide-react';
import toast from 'react-hot-toast';
import { displayToMm, mmToDisplay, unitLabel, type UnitSystem } from '@/lib/units';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  pullStorageLocations,
  pushStorageLocations,
  pushUnitPreference,
} from '@/lib/supabase/storageLocations';
import { getSupabase } from '@/lib/supabase/client';

export default function StorageSettings() {
  const store = useAppStore();
  const settings = store.offcutSettings;
  const storageLocations = store.storageLocations;
  const unitSystem = store.unitSystem;
  const resetWorkshopData = store.resetWorkshopData;
  const setUnitSystem = store.setUnitSystem;

  const u = unitLabel(unitSystem);
  const [minLength, setMinLength] = useState(
    String(mmToDisplay(settings.minLength, unitSystem, unitSystem === 'imperial' ? 2 : 0))
  );
  const [minWidth, setMinWidth] = useState(
    String(mmToDisplay(settings.minWidth, unitSystem, unitSystem === 'imperial' ? 2 : 0))
  );
  const [newLocation, setNewLocation] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);

  useEffect(() => {
    setMinLength(String(mmToDisplay(settings.minLength, unitSystem, unitSystem === 'imperial' ? 2 : 0)));
    setMinWidth(String(mmToDisplay(settings.minWidth, unitSystem, unitSystem === 'imperial' ? 2 : 0)));
  }, [unitSystem, settings.minLength, settings.minWidth]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setUserId(data.session?.user?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUnitChange = async (system: UnitSystem) => {
    setUnitSystem(system);
    toast.success(system === 'imperial' ? 'Using inches (imperial)' : 'Using millimetres (metric)');
    if (userId) {
      const result = await pushUnitPreference(userId, system);
      if (!result.ok) toast.error(result.message);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const lDisplay = parseFloat(minLength);
    const wDisplay = parseFloat(minWidth);

    if (isNaN(lDisplay) || isNaN(wDisplay) || lDisplay < 0 || wDisplay < 0) {
      toast.error('Please enter valid positive dimensions.');
      return;
    }

    store.updateOffcutSettings({
      minLength: displayToMm(lDisplay, unitSystem),
      minWidth: displayToMm(wDisplay, unitSystem),
    });
    toast.success('Updated offcut classification thresholds!');
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.trim()) return;
    if (storageLocations.includes(newLocation.trim())) {
      toast.error('Location already exists.');
      return;
    }
    const next = [...storageLocations, newLocation.trim()];
    store.updateStorageLocations(next);
    setNewLocation('');
    toast.success('Added new storage location!');
    if (userId) {
      const result = await pushStorageLocations(userId, next);
      if (!result.ok) toast.error(`Local save ok, cloud sync failed: ${result.message}`);
    }
  };

  const handleDeleteLocation = async (loc: string) => {
    const next = storageLocations.filter((l) => l !== loc);
    store.updateStorageLocations(next);
    toast.error(`Removed location: ${loc}`);
    if (userId) {
      const result = await pushStorageLocations(userId, next);
      if (!result.ok) toast.error(`Local save ok, cloud sync failed: ${result.message}`);
    }
  };

  const syncToCloud = async () => {
    if (!userId) {
      toast.error('Sign in after Supabase auth is enabled to sync.');
      return;
    }
    setSyncBusy(true);
    const result = await pushStorageLocations(userId, storageLocations);
    setSyncBusy(false);
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  const syncFromCloud = async () => {
    if (!userId) {
      toast.error('Sign in after Supabase auth is enabled to sync.');
      return;
    }
    setSyncBusy(true);
    const result = await pullStorageLocations(userId);
    setSyncBusy(false);
    if (result.ok) {
      store.updateStorageLocations(result.locations);
      toast.success(result.message);
    } else toast.error(result.message);
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Ruler className="w-5 h-5 text-orange-500" /> Measurement units
        </h3>
        <p className="text-xs text-gray-400">
          Inventory is always stored in millimetres. Choose how dimensions appear and are entered across
          the app.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleUnitChange('metric')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer border ${
              unitSystem === 'metric'
                ? 'bg-orange-600 text-white border-orange-500'
                : 'bg-[#121417] text-gray-300 border-gray-800 hover:border-gray-600'
            }`}
          >
            Metric (mm)
          </button>
          <button
            type="button"
            onClick={() => handleUnitChange('imperial')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer border ${
              unitSystem === 'imperial'
                ? 'bg-orange-600 text-white border-orange-500'
                : 'bg-[#121417] text-gray-300 border-gray-800 hover:border-gray-600'
            }`}
          >
            Imperial (inches)
          </button>
        </div>
      </div>

      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-orange-500" /> Minimum reusable offcut size
        </h3>
        <p className="text-xs text-gray-400">
          Pieces with BOTH length and width below these limits are classified as <strong>Waste</strong>.
          If either dimension meets the threshold, the piece is a <strong>Reusable Offcut</strong>.
        </p>

        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Min Length ({u})
            </label>
            <input
              type="number"
              step="any"
              value={minLength}
              onChange={(e) => setMinLength(e.target.value)}
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Min Width ({u})</label>
            <input
              type="number"
              step="any"
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

      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Workshop storage locations ({storageLocations.length})
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={syncBusy || !isSupabaseConfigured()}
              onClick={syncFromCloud}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1"
            >
              <Cloud className="w-3.5 h-3.5" /> Pull from cloud
            </button>
            <button
              type="button"
              disabled={syncBusy || !isSupabaseConfigured()}
              onClick={syncToCloud}
              className="px-3 py-2 bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white border border-orange-500/30 disabled:opacity-40 text-xs font-bold rounded-xl cursor-pointer"
            >
              Push to cloud
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          These locations are used in Quick Log and inventory. They will sync to Supabase for your user
          account once you complete the setup steps and sign in.
          {!isSupabaseConfigured() && (
            <span className="text-orange-400"> Supabase keys are not configured in this environment yet.</span>
          )}
          {isSupabaseConfigured() && !userId && (
            <span className="text-orange-400"> Configured — sign in to sync this user&apos;s locations.</span>
          )}
          {userId && <span className="text-emerald-400"> Signed in — cloud sync available.</span>}
        </p>

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
                type="button"
                onClick={() => handleDeleteLocation(loc)}
                className="text-gray-500 hover:text-red-400 p-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#1e2228] border border-red-900/40 p-6 rounded-2xl space-y-3 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-red-400" /> Reset workshop data
        </h3>
        <p className="text-xs text-gray-400">
          Clears boards, projects and cut history on this device. Locations and unit preference reset to
          defaults locally (cloud data is not deleted).
        </p>
        <button
          type="button"
          onClick={() => {
            if (!confirm('Reset all TimberVault data on this device?')) return;
            resetWorkshopData();
            toast.success('Workshop data cleared. Fresh start ready.');
          }}
          className="px-5 py-2.5 bg-red-950/50 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/50 rounded-xl text-xs font-bold cursor-pointer"
        >
          Clear all local data
        </button>
      </div>
    </div>
  );
}
