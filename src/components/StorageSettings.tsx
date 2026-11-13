'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore, DEFAULT_LUMBER_TYPES } from '@/lib/store';
import {
  Sliders,
  Save,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  HardDriveDownload,
  Upload,
  ShieldCheck,
  MapPin,
  Layers,
  Truck,
} from 'lucide-react';
import { notify, toast } from '@/lib/notify';
import { displayToMm, formatDim, mmToDisplay, unitLabel, type UnitSystem } from '@/lib/units';
import { getSupabase } from '@/lib/supabase/client';
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
import { DEFAULT_SUPPLIERS } from '@/lib/store';

export default function StorageSettings() {
  const store = useAppStore();
  const settings = store.offcutSettings;
  const storageLocations = store.storageLocations;
  const lumberTypes = store.lumberTypes?.length
    ? store.lumberTypes
    : [...DEFAULT_LUMBER_TYPES];
  const suppliers = store.suppliers?.length ? store.suppliers : [...DEFAULT_SUPPLIERS];
  const unitSystem = store.unitSystem;
  const setUnitSystem = store.setUnitSystem;
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
  const [newSupplier, setNewSupplier] = useState('');
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
    setMinLength(
      String(mmToDisplay(settings.minLength, unitSystem, unitSystem === 'imperial' ? 2 : 0))
    );
    setMinWidth(
      String(mmToDisplay(settings.minWidth, unitSystem, unitSystem === 'imperial' ? 2 : 0))
    );
    setKerfDisplay(
      String(mmToDisplay(defaultKerfMm, unitSystem, unitSystem === 'imperial' ? 3 : 1))
    );
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
    toast.success(
      system === 'imperial' ? 'Using inches (imperial)' : 'Using millimetres (metric)'
    );
  };

  const handleSaveKerf = (e: React.FormEvent) => {
    e.preventDefault();
    const v = displayToMm(parseFloat(kerfDisplay), unitSystem);
    if (isNaN(v) || v < 0) {
      toast.error('Enter a valid kerf (0 or greater).');
      return;
    }
    setDefaultKerfMm(v);
    toast.success(`Default kerf set to ${formatDim(v, unitSystem)}.`);
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

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSupplier.trim();
    if (!name) return;
    if (suppliers.some((s) => s.toLowerCase() === name.toLowerCase())) {
      toast.error('That supplier is already in the list.');
      return;
    }
    store.updateSuppliers([...suppliers, name]);
    setNewSupplier('');
    toast.success(`Added supplier: ${name}`);
  };

  const handleDeleteSupplier = (name: string) => {
    store.updateSuppliers(suppliers.filter((s) => s.toLowerCase() !== name.toLowerCase()));
    toast.success(`Removed supplier: ${name}`);
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

  const formatShortBackupTitle = (b: StoredBackupRecord) => {
    if (b.slot === 'latest') return 'Most recent';
    if (b.slot === 'highwater') return 'Fullest backup';
    const m = b.backupDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `Daily (${m[3]}/${m[2]})`;
    return `Daily (${b.backupDate})`;
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-base font-bold text-white uppercase tracking-wider">Settings</h2>
        {userEmail && (
          <p className="text-xs text-gray-400">
            Signed in as: <span className="font-mono text-white">{userEmail}</span>
          </p>
        )}
      </div>

      {/* 1. Workshop Rules & Defaults (Top Hero Card) */}
      <div className="bg-[#1e2228] border border-gray-800 p-5 rounded-2xl shadow-xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2 border-b border-gray-800 pb-2.5">
          <Sliders className="w-4 h-4 text-orange-500" /> Workshop Rules &amp; Defaults
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          {/* Units Toggle */}
          <div className="lg:col-span-3 space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Units
            </label>
            <div className="grid grid-cols-2 bg-[#121417] p-1 rounded-xl border border-gray-800">
              <button
                type="button"
                onClick={() => handleUnitChange('metric')}
                className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  unitSystem === 'metric'
                    ? 'bg-orange-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Metric (mm)
              </button>
              <button
                type="button"
                onClick={() => handleUnitChange('imperial')}
                className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  unitSystem === 'imperial'
                    ? 'bg-orange-600 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Imp (in)
              </button>
            </div>
          </div>

          {/* Saw Kerf */}
          <form onSubmit={handleSaveKerf} className="lg:col-span-4 space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Saw Kerf ({u})
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="any"
                min="0"
                value={kerfDisplay}
                onChange={(e) => setKerfDisplay(e.target.value)}
                className="flex-1 min-w-0 bg-[#121417] border border-gray-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </form>

          {/* Min Reusable Offcut */}
          <form onSubmit={handleSaveSettings} className="lg:col-span-5 space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Min Reusable Offcut ({u})
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-[#121417] border border-gray-800 rounded-xl px-2.5 py-2 focus-within:border-orange-500">
                <span className="text-[11px] font-mono text-gray-500 font-bold">L:</span>
                <input
                  type="number"
                  step="any"
                  value={minLength}
                  onChange={(e) => setMinLength(e.target.value)}
                  className="w-full min-w-0 bg-transparent text-sm text-white font-mono focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-[#121417] border border-gray-800 rounded-xl px-2.5 py-2 focus-within:border-orange-500">
                <span className="text-[11px] font-mono text-gray-500 font-bold">W:</span>
                <input
                  type="number"
                  step="any"
                  value={minWidth}
                  onChange={(e) => setMinWidth(e.target.value)}
                  className="w-full min-w-0 bg-transparent text-sm text-white font-mono focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 2. Master Lists (2-Column Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lumber Species */}
        <div className="bg-[#1e2228] border border-gray-800 p-5 rounded-2xl space-y-3 shadow-xl flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-500" /> Lumber Species ({lumberTypes.length})
          </h3>

          <form onSubmit={handleAddLumberType} className="flex gap-2">
            <input
              type="text"
              placeholder="Add species (e.g. Birch Plywood, Jarrah)…"
              value={newLumberType}
              onChange={(e) => setNewLumberType(e.target.value)}
              className="flex-1 min-w-0 bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-orange-500" /> Add
            </button>
          </form>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border-t border-gray-800/80 pt-2">
            {lumberTypes.map((name) => {
              const editing = editingLumber === name;
              return (
                <div
                  key={name}
                  className="bg-[#121417] border border-gray-800/90 px-3 py-2 rounded-xl flex items-center gap-2 text-xs text-gray-200"
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
                        className="flex-1 min-w-0 bg-[#1e2228] border border-orange-500/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
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
                      <span className="flex-1 min-w-0 font-mono truncate">• {name}</span>
                      <button
                        type="button"
                        onClick={() => startEditLumber(name)}
                        className="text-gray-400 hover:text-orange-400 px-1.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                        aria-label={`Edit ${name}`}
                      >
                        <Pencil className="w-3 h-3" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLumberType(name)}
                        className="text-gray-400 hover:text-red-400 px-1.5 py-0.5 rounded text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                        aria-label={`Remove ${name}`}
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Storage Locations */}
        <div className="bg-[#1e2228] border border-gray-800 p-5 rounded-2xl space-y-3 shadow-xl flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-500" /> Storage Locations ({storageLocations.length})
          </h3>

          <form onSubmit={handleAddLocation} className="flex gap-2">
            <input
              type="text"
              placeholder="Add location (e.g. Rack 4, Cabinet B)…"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="flex-1 min-w-0 bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-orange-500" /> Add
            </button>
          </form>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border-t border-gray-800/80 pt-2">
            {storageLocations.map((loc) => (
              <div
                key={loc}
                className="bg-[#121417] border border-gray-800/90 px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs text-gray-200 font-mono"
              >
                <span className="truncate">• {loc}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteLocation(loc)}
                  className="text-gray-400 hover:text-red-400 px-1.5 py-0.5 rounded text-[11px] font-sans font-semibold cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Suppliers */}
      <div className="bg-[#1e2228] border border-gray-800 p-5 rounded-2xl space-y-3 shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
          <Truck className="w-4 h-4 text-orange-500" /> Suppliers ({suppliers.length})
        </h3>
        <p className="text-[11px] text-gray-400 m-0">
          Used by the Supplier dropdown in Quick Log for New / Purchased stock. Choose Other… there
          to add a one-off name.
        </p>
        <form onSubmit={handleAddSupplier} className="flex gap-2 max-w-xl">
          <input
            type="text"
            placeholder="Add supplier (e.g. specialty hardwood yard)…"
            value={newSupplier}
            onChange={(e) => setNewSupplier(e.target.value)}
            className="flex-1 min-w-0 bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-orange-500" /> Add
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {suppliers.map((name) => (
            <div
              key={name}
              className="bg-[#121417] border border-gray-800/90 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs text-gray-200"
            >
              <span className="font-mono">{name}</span>
              <button
                type="button"
                onClick={() => handleDeleteSupplier(name)}
                className="text-gray-400 hover:text-red-400 p-0.5 cursor-pointer"
                aria-label={`Remove ${name}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Workshop Backups */}
      <div className="bg-[#1e2228] border border-emerald-900/50 p-5 rounded-2xl space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Workshop Backups
            </h3>
            <p className="text-[11px] text-gray-400">
              Your boards and projects are automatically saved every day on this device and in your online
              account. We keep the last 7 days of daily backups.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <HardDriveDownload className="w-3.5 h-3.5" /> Save to Computer
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
                const boardCount = parsed.payload.boards?.length || 0;
                const projectCount = parsed.payload.savedProjects?.length || 0;
                const ok = await notify.confirm({
                  title: 'Restore from backup file?',
                  message: `This merges ${boardCount} board${boardCount === 1 ? '' : 's'} and ${projectCount} project${projectCount === 1 ? '' : 's'} from "${file.name}" into your current workshop.\n\nExisting boards and projects stay as they are. Only missing items are added, then synced to your account.`,
                  confirmLabel: 'Restore from file',
                });
                if (!ok) return;
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
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-orange-400" /> Load File
            </button>

            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none pl-1">
              <input
                type="checkbox"
                checked={autoDownloadDaily}
                onChange={(e) => {
                  const next = e.target.checked;
                  setAutoDownloadDaily(next);
                  setAutoDownloadDailyPreference(next);
                  toast.success(
                    next
                      ? 'Auto-save daily backup file turned on.'
                      : 'Auto-save daily backup file turned off.'
                  );
                }}
                className="rounded border-gray-700 bg-[#121417] text-orange-500 focus:ring-orange-500"
              />
              <span>Auto-save daily backup</span>
            </label>
          </div>
        </div>

        {deviceBackups.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {deviceBackups.slice(0, 8).map((b) => (
              <div
                key={b.id}
                className="bg-[#121417] border border-gray-800 rounded-xl p-3 flex flex-col justify-between gap-2.5 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-white truncate">{formatShortBackupTitle(b)}</div>
                  <div className="text-[11px] text-gray-400 font-mono">
                    {b.boardCount} bds • {b.projectCount} proj
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await notify.confirm({
                        title: 'Restore this backup?',
                        message: `Restore "${formatShortBackupTitle(b)}" (${b.boardCount} boards, ${b.projectCount} projects) into your current workshop?\n\nExisting boards and projects stay as they are. Only missing items are added, then synced to your account.`,
                        confirmLabel: 'Restore backup',
                      });
                      if (!ok) return;
                      const res = store.mergeBackupIntoWorkshop(b.payload);
                      if (res.addedBoards === 0 && res.addedProjects === 0) {
                        toast.success('Everything in this backup is already in your workshop.');
                      } else {
                        toast.success(
                          `Restored ${res.addedBoards} boards and ${res.addedProjects} projects.`
                        );
                      }
                    }}
                    className="flex-1 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-[11px] cursor-pointer text-center"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadBackupFileToDevice(b.payload, b.slot.replace(':', '-'))}
                    className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-lg text-[11px] cursor-pointer"
                    title="Save a copy of this backup to your computer"
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
