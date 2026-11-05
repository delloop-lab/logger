'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Sliders,
  Save,
  Plus,
  Trash2,
  Ruler,
  RotateCcw,
  Pencil,
  Check,
  X,
  HardDriveDownload,
  Upload,
  ShieldCheck,
  History,
} from 'lucide-react';
import { notify, toast } from '@/lib/notify';
import { displayToMm, formatDim, mmToDisplay, unitLabel, type UnitSystem } from '@/lib/units';
import { getSupabase } from '@/lib/supabase/client';
import { DEFAULT_LUMBER_TYPES } from '@/lib/store';
import {
  downloadBackupFileToDevice,
  getAutoDownloadDailyPreference,
  listDeviceBackups,
  parseImportedBackupJson,
  recordDeviceBackup,
  setAutoDownloadDailyPreference,
  todayDateString,
  type StoredBackupRecord,
} from '@/lib/backup-vault';

export default function StorageSettings() {
  const store = useAppStore();
  const settings = store.offcutSettings;
  const storageLocations = store.storageLocations;
  const lumberTypes = store.lumberTypes?.length
    ? store.lumberTypes
    : [...DEFAULT_LUMBER_TYPES];
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
  const [newLumberType, setNewLumberType] = useState('');
  const [editingLumber, setEditingLumber] = useState<string | null>(null);
  const [editLumberValue, setEditLumberValue] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [deviceBackups, setDeviceBackups] = useState<StoredBackupRecord[]>([]);
  const [autoDownloadDaily, setAutoDownloadDaily] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const backupUserKey = store.cloudUserId || 'local-workshop';

  const refreshBackupsList = async () => {
    const list = await listDeviceBackups(backupUserKey);
    setDeviceBackups(list);
  };

  useEffect(() => {
    setAutoDownloadDaily(getAutoDownloadDailyPreference());
    void refreshBackupsList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupUserKey, store.boards.length, store.savedProjects.length]);

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

  const handleAddLumberType = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newLumberType.trim().replace(/\s+/g, ' ');
    if (!name) return;
    if (lumberTypes.some((t) => t.toLowerCase() === name.toLowerCase())) {
      toast.error('That lumber type already exists.');
      return;
    }
    store.updateLumberTypes([...lumberTypes, name]);
    setNewLumberType('');
    toast.success(`Added lumber type: ${name}`);
  };

  const startEditLumber = (name: string) => {
    setEditingLumber(name);
    setEditLumberValue(name);
  };

  const cancelEditLumber = () => {
    setEditingLumber(null);
    setEditLumberValue('');
  };

  const saveEditLumber = () => {
    if (!editingLumber) return;
    const result = store.renameLumberType(editingLumber, editLumberValue);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success('Lumber type updated.');
    cancelEditLumber();
  };

  const handleDeleteLumberType = async (name: string) => {
    if (lumberTypes.length <= 1) {
      toast.error('Keep at least one lumber type.');
      return;
    }
    const inUse =
      store.boards.some((b) => b.species.toLowerCase() === name.toLowerCase()) ||
      store.activeParts.some((p) => p.species.toLowerCase() === name.toLowerCase()) ||
      store.savedProjects.some((proj) =>
        proj.parts.some((p) => p.species.toLowerCase() === name.toLowerCase())
      );
    if (inUse) {
      const ok = await notify.confirm({
        title: 'Remove lumber type?',
        message: `"${name}" is used on stock or projects. Removing it from the list will not delete those lots, but it will no longer appear in new Quick Log / part dropdowns unless you add it again.`,
        confirmLabel: 'Remove from list',
        danger: true,
      });
      if (!ok) return;
    }
    store.updateLumberTypes(lumberTypes.filter((t) => t.toLowerCase() !== name.toLowerCase()));
    if (editingLumber?.toLowerCase() === name.toLowerCase()) cancelEditLumber();
    toast.success(`Removed lumber type: ${name}`);
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
          Lumber types ({lumberTypes.length})
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          Species and sheet goods shown in Quick Log and Projects &amp; Cuts. Add custom stock such as
          Birch Plywood or Jarrah, or rename the built-in labels.
        </p>

        <form onSubmit={handleAddLumberType} className="flex gap-3">
          <input
            type="text"
            placeholder="e.g. Birch Plywood, Jarrah"
            value={newLumberType}
            onChange={(e) => setNewLumberType(e.target.value)}
            className="flex-1 bg-[#121417] border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-orange-500" /> Add type
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {lumberTypes.map((name) => {
            const editing = editingLumber === name;
            return (
              <div
                key={name}
                className="bg-[#121417] border border-gray-800 p-3 rounded-xl flex items-center gap-2 text-xs text-gray-300"
              >
                {editing ? (
                  <>
                    <input
                      type="text"
                      value={editLumberValue}
                      onChange={(e) => setEditLumberValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          saveEditLumber();
                        }
                        if (e.key === 'Escape') cancelEditLumber();
                      }}
                      className="flex-1 min-w-0 bg-[#1e2228] border border-orange-500/50 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={saveEditLumber}
                      className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer"
                      aria-label="Save lumber type"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditLumber}
                      className="text-gray-500 hover:text-white p-1 cursor-pointer"
                      aria-label="Cancel edit"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 font-mono truncate">{name}</span>
                    <button
                      type="button"
                      onClick={() => startEditLumber(name)}
                      className="text-gray-500 hover:text-orange-400 p-1 cursor-pointer"
                      aria-label={`Edit ${name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteLumberType(name)}
                      className="text-gray-500 hover:text-red-400 p-1 cursor-pointer"
                      aria-label={`Remove ${name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
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

      <div className="bg-[#1e2228] border border-emerald-900/50 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Daily Workshop Backups
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your boards and projects are automatically saved every day on this device and in your online account. You can also save a backup file to your computer or bring back any saved copy below.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={async () => {
                const snap = {
                  boards: store.boards,
                  savedProjects: store.savedProjects,
                  storageLocations: store.storageLocations,
                  lumberTypes: store.lumberTypes,
                  activeProjectName: store.activeProjectName,
                  activeParts: store.activeParts,
                  completedOperations: store.completedOperations,
                  offcutSettings: store.offcutSettings,
                  unitSystem: store.unitSystem,
                  defaultKerfMm: store.defaultKerfMm,
                  activeKerfMm: store.activeKerfMm,
                  activeCuttingPlan: store.activeCuttingPlan,
                };
                await recordDeviceBackup(backupUserKey, snap);
                await refreshBackupsList();
                downloadBackupFileToDevice(
                  {
                    version: 1,
                    exportedAt: new Date().toISOString(),
                    backupDate: todayDateString(),
                    userId: backupUserKey,
                    ...snap,
                  },
                  'manual'
                );
                toast.success('Backup saved to your computer.');
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
            >
              <HardDriveDownload className="w-4 h-4" /> Save backup to computer
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                const text = await file.text();
                const parsed = parseImportedBackupJson(text);
                if (!parsed.ok) {
                  toast.error(parsed.message);
                  return;
                }
                const merged = store.mergeBackupIntoWorkshop(parsed.payload);
                await refreshBackupsList();
                toast.success(
                  `Backup restored: added ${merged.addedBoards} boards and ${merged.addedProjects} projects.`
                );
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-orange-400" /> Load backup from computer
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-xs text-gray-300 cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            checked={autoDownloadDaily}
            onChange={(e) => {
              const next = e.target.checked;
              setAutoDownloadDaily(next);
              setAutoDownloadDailyPreference(next);
              toast.success(
                next
                  ? 'Daily backup download turned on (saves one file a day to your Downloads folder).'
                  : 'Daily file download turned off (automatic daily backups in the app stay on).'
              );
            }}
            className="rounded border-gray-700 bg-[#121417] text-orange-500 focus:ring-orange-500"
          />
          <span>
            Automatically save a backup file to my Downloads folder once a day
          </span>
        </label>

        {deviceBackups.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-800">
            <div className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-orange-400" /> Saved backups on this device ({deviceBackups.length})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {deviceBackups.slice(0, 10).map((b) => (
                <div
                  key={b.id}
                  className="bg-[#121417] border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-white truncate">
                      {b.slot === 'latest'
                        ? 'Most recent backup'
                        : b.slot === 'highwater'
                          ? 'Fullest workshop backup'
                          : `Daily backup (${b.backupDate})`}
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono">
                      {b.boardCount} boards · {b.projectCount} projects ·{' '}
                      {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const res = store.mergeBackupIntoWorkshop(b.payload);
                        if (res.addedBoards === 0 && res.addedProjects === 0) {
                          toast.success('Everything in this backup is already in your workshop.');
                        } else {
                          toast.success(
                            `Restored ${res.addedBoards} boards and ${res.addedProjects} projects.`
                          );
                        }
                      }}
                      className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-[11px] cursor-pointer"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadBackupFileToDevice(b.payload, b.slot.replace(':', '-'))}
                      className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-lg text-[11px] cursor-pointer"
                      title="Save a copy of this backup to your computer"
                    >
                      Save file
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#1e2228] border border-red-900/50 p-6 rounded-2xl space-y-3 shadow-xl">
        <h3 className="text-base font-bold text-red-300 flex items-center gap-2">
          <RotateCcw className="w-5 h-5" /> Start completely fresh
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          Clears <strong className="text-gray-200">all inventory</strong>, finished pieces, offcuts,
          cut history, completed cut marks, and saved projects. Unit system, lumber types, and
          storage location names are kept. This syncs to the cloud for your signed-in account.
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
