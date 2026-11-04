'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Sliders, Save, Plus, Trash2, Ruler, RotateCcw } from 'lucide-react';
import { notify, toast } from '@/lib/notify';
import { displayToMm, formatDim, mmToDisplay, unitLabel, type UnitSystem } from '@/lib/units';
import { getSupabase } from '@/lib/supabase/client';

export default function StorageSettings() {
  const store = useAppStore();
  const settings = store.offcutSettings;
  const storageLocations = store.storageLocations;
  const unitSystem = store.unitSystem;
  const setUnitSystem = store.setUnitSystem;
  const resetWorkshopData = store.resetWorkshopData;
  const defaultKerfMm = store.defaultKerfMm;
  const setDefaultKerfMm = store.setDefaultKerfMm;

  const u = unitLabel(unitSystem);
  const [minLength, setMinLength] = useState(
    String(mmToDisplay(settings.minLength, unitSystem, unitSystem === 'imperial' ? 2 : 0))
  );
  const [minWidth, setMinWidth] = useState(
    String(mmToDisplay(settings.minWidth, unitSystem, unitSystem === 'imperial' ? 2 : 0))
  );
  const [kerfDisplay, setKerfDisplay] = useState(
    String(mmToDisplay(defaultKerfMm, unitSystem, unitSystem === 'imperial' ? 3 : 1))
  );
  const [newLocation, setNewLocation] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    setMinLength(String(mmToDisplay(settings.minLength, unitSystem, unitSystem === 'imperial' ? 2 : 0)));
    setMinWidth(String(mmToDisplay(settings.minWidth, unitSystem, unitSystem === 'imperial' ? 2 : 0)));
    setKerfDisplay(String(mmToDisplay(defaultKerfMm, unitSystem, unitSystem === 'imperial' ? 3 : 1)));
  }, [unitSystem, settings.minLength, settings.minWidth, defaultKerfMm]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setUserEmail(data.session?.user?.email ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleUnitChange = (system: UnitSystem) => {
    setUnitSystem(system);
    toast.success(system === 'imperial' ? 'Using inches (imperial)' : 'Using millimetres (metric)');
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
      {userEmail && (
        <p className="text-xs text-gray-400">
          Signed in as <span className="font-mono text-white">{userEmail}</span>
        </p>
      )}

      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Ruler className="w-5 h-5 text-orange-500" /> Measurement units
        </h3>
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
          <Ruler className="w-5 h-5 text-orange-500" /> Default saw kerf
        </h3>
        <p className="text-xs text-gray-400">
          Blade width used for new projects. You can override kerf on any open project if you change
          blades.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = displayToMm(parseFloat(kerfDisplay), unitSystem);
            if (isNaN(v) || v < 0) {
              toast.error('Enter a valid kerf (0 or greater).');
              return;
            }
            setDefaultKerfMm(v);
            toast.success(`Default kerf set to ${formatDim(v, unitSystem)}.`);
          }}
          className="flex flex-col sm:flex-row gap-3 items-end max-w-md"
        >
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-gray-400 mb-1">Kerf ({u})</label>
            <input
              type="number"
              step="any"
              min="0"
              value={kerfDisplay}
              onChange={(e) => setKerfDisplay(e.target.value)}
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save kerf
          </button>
        </form>
      </div>

      <div className="bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-orange-500" /> Minimum reusable offcut size
        </h3>
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
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          Workshop storage locations ({storageLocations.length})
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

      <div className="bg-[#1e2228] border border-red-900/50 p-6 rounded-2xl space-y-3 shadow-xl">
        <h3 className="text-base font-bold text-red-300 flex items-center gap-2">
          <RotateCcw className="w-5 h-5" /> Start completely fresh
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          Clears <strong className="text-gray-200">all inventory</strong>, finished pieces, offcuts,
          cut history, completed cut marks, and saved projects. Unit system and storage location
          names are kept. This syncs to the cloud for your signed-in account.
        </p>
        <button
          type="button"
          onClick={async () => {
            const ok = await notify.confirm({
              title: 'Warning: wipe workshop data?',
              message:
                'This deletes all boards, finished pieces, offcuts, projects, and cut progress. This cannot be undone.',
              confirmLabel: 'Wipe everything',
              danger: true,
            });
            if (!ok) return;
            resetWorkshopData();
            toast.success('Workshop cleared, log stock and start a new project.');
          }}
          className="px-5 py-2.5 bg-red-950 hover:bg-red-900 border border-red-700/60 text-red-200 font-semibold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" /> Wipe inventory & cuts, start fresh
        </button>
      </div>
    </div>
  );
}
