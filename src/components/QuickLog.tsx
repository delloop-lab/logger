'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore, DEFAULT_LUMBER_TYPES } from '@/lib/store';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import { toast } from '@/lib/notify';
import { displayToMm, mmToDisplay, unitLabel } from '@/lib/units';
import { nextLotTagId, tagPrefixForSpecies } from '@/lib/tags';
import { DEFECT_OPTIONS, type DefectType } from '@/lib/defects';
import SpeciesSelect from '@/components/SpeciesSelect';

type Props = {
  onLogged?: () => void;
};

export default function QuickLog({ onLogged }: Props) {
  const addBoard = useAppStore((s) => s.addBoard);
  const boards = useAppStore((s) => s.boards);
  const unitSystem = useAppStore((s) => s.unitSystem);
  const activeLocations = useAppStore((s) =>
    (s.storageLocations || []).filter((loc) => loc && loc.trim() !== '')
  );
  const lumberTypes = useAppStore((s) => s.lumberTypes);
  const u = unitLabel(unitSystem);

  const [species, setSpecies] = useState(
    () => lumberTypes[0] || DEFAULT_LUMBER_TYPES[0]
  );
  const [source, setSource] = useState('Pallet');
  const [location, setLocation] = useState(activeLocations[0] || 'Workbench');
  const [description, setDescription] = useState('');
  const [supplier, setSupplier] = useState('');
  const [supplierOther, setSupplierOther] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [thickness, setThickness] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [defects, setDefects] = useState<DefectType[]>([]);
  const [defectNotes, setDefectNotes] = useState('');
  const suppliers = useAppStore((s) => s.suppliers);
  const updateSuppliers = useAppStore((s) => s.updateSuppliers);
  const supplierOptions = suppliers?.length ? suppliers : ['Bunnings', 'Local timber yard'];

  const toggleDefect = (d: DefectType) => {
    setDefects((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

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

  useEffect(() => {
    const catalog = lumberTypes?.length ? lumberTypes : [...DEFAULT_LUMBER_TYPES];
    if (catalog.length && !catalog.some((t) => t.toLowerCase() === species.toLowerCase())) {
      setSpecies(catalog[0]);
    }
  }, [lumberTypes, species]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const l = displayToMm(parseFloat(length), unitSystem);
    const w = displayToMm(parseFloat(width), unitSystem);
    const t = displayToMm(parseFloat(thickness), unitSystem);
    const qty = parseInt(quantity, 10);

    if (
      isNaN(l) ||
      isNaN(w) ||
      isNaN(t) ||
      isNaN(qty) ||
      qty < 1 ||
      l <= 0 ||
      w <= 0 ||
      t <= 0
    ) {
      toast.error('Please enter valid dimensions and a quantity of at least 1.');
      return;
    }

    const tagId = nextLotTagId(boards, tagPrefixForSpecies(species));
    const showDescription =
      source === 'Salvaged' || source === 'Furniture Teardown';
    const showSupplier = source === 'New' || source === 'Purchased';
    const resolvedSupplier =
      supplier === '__other__' ? supplierOther.trim() : supplier.trim();
    if (showSupplier && supplier === '__other__' && !resolvedSupplier) {
      toast.error('Enter a supplier name for Other, or pick one from the list.');
      return;
    }
    if (
      showSupplier &&
      supplier === '__other__' &&
      resolvedSupplier &&
      !supplierOptions.some((s) => s.toLowerCase() === resolvedSupplier.toLowerCase())
    ) {
      updateSuppliers([...supplierOptions, resolvedSupplier]);
    }
    const notes = showDescription
      ? description.trim() || undefined
      : showSupplier
        ? resolvedSupplier || undefined
        : undefined;

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
      notes,
      defects: defects.length ? [...defects] : undefined,
      defectNotes: defectNotes.trim() || undefined,
    });
    setQuantity('1');
    setDescription('');
    setSupplier('');
    setSupplierOther('');
    setDefects([]);
    setDefectNotes('');
    toast.success(
      qty === 1
        ? `Logged lot ${tagId} (1 board). Stay here to add more.`
        : `Logged lot ${tagId} (${qty} boards in one lot). Stay here to add more.`
    );
    onLogged?.();
  };

  const showDescription = source === 'Salvaged' || source === 'Furniture Teardown';
  const showSupplier = source === 'New' || source === 'Purchased';

  return (
    <div className="w-full bg-[#1e2228] border border-gray-800 p-6 rounded-2xl space-y-6 shadow-xl">
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-orange-500" /> Quick Workshop Log
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Log timber using millimetres or inches, depending on your Settings. Values are stored
          internally in mm.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Wood Species</label>
            <SpeciesSelect value={species} onChange={setSpecies} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Source / Origin</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer"
            >
              <option value="New">New</option>
              <option value="Pallet">Pallet</option>
              <option value="Salvaged">Salvaged</option>
              <option value="Cut-off">Cut-off</option>
              <option value="Furniture Teardown">Furniture Teardown</option>
              <option value="Offcut Bin">Offcut Bin</option>
              <option value="Purchased">Purchased</option>
            </select>
          </div>
          <div className="md:col-span-2 lg:col-span-1">
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
        </div>

        {(showDescription || showSupplier) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {showDescription && (
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Description <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. bedhead, stool leg"
                  className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            )}
            {showSupplier && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Supplier <span className="font-normal text-gray-500">(optional)</span>
                  </label>
                  <select
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer"
                  >
                    <option value="">No supplier</option>
                    {supplierOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="__other__">Other…</option>
                  </select>
                </div>
                {supplier === '__other__' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Other supplier name
                    </label>
                    <input
                      type="text"
                      value={supplierOther}
                      onChange={(e) => setSupplierOther(e.target.value)}
                      placeholder="e.g. specialty hardwood yard"
                      className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Qty in lot</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono"
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 mt-1.5">
            Same size / species / location stay as one lot with this quantity, not separate rows.
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-amber-800/40 bg-amber-950/20 p-3.5">
          <label className="flex items-center gap-2 text-xs font-medium text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" /> Defects on this stock
          </label>
          <p className="text-[10px] text-gray-500">
            Tick anything to watch for when cutting or assembling. Shows on pull tags for every project
            that uses this lot.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {DEFECT_OPTIONS.map((d) => {
              const checked = defects.includes(d);
              return (
                <label
                  key={d}
                  className={`flex items-center gap-2 text-[11px] rounded-lg px-2.5 py-1.5 cursor-pointer border ${
                    checked
                      ? 'border-amber-600/60 bg-amber-950/40 text-amber-200'
                      : 'border-gray-800 bg-[#121417] text-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDefect(d)}
                    className="accent-amber-500 cursor-pointer"
                  />
                  {d}
                </label>
              );
            })}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1">
              Defect notes (optional)
            </label>
            <input
              type="text"
              value={defectNotes}
              onChange={(e) => setDefectNotes(e.target.value)}
              placeholder="e.g. screw holes near one end, avoid for face panels"
              className="w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white"
            />
          </div>
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
