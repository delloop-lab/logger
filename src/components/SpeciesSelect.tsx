'use client';

import React, { useMemo } from 'react';
import { useAppStore, DEFAULT_LUMBER_TYPES } from '@/lib/store';
import { mergeLumberTypesWithStock } from '@/lib/lumber-types';

type Props = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  required?: boolean;
};

/** Species dropdown driven by Settings → lumber types (plus any stock labels). */
export default function SpeciesSelect({
  value,
  onChange,
  id,
  className =
    'w-full bg-[#121417] border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-semibold cursor-pointer',
  required,
}: Props) {
  const lumberTypes = useAppStore((s) => s.lumberTypes);
  const boards = useAppStore((s) => s.boards);

  const options = useMemo(() => {
    const merged = mergeLumberTypesWithStock(
      lumberTypes?.length ? lumberTypes : [...DEFAULT_LUMBER_TYPES],
      boards.map((b) => b.species)
    );
    if (value && !merged.some((o) => o.toLowerCase() === value.toLowerCase())) {
      return [value, ...merged];
    }
    return merged;
  }, [lumberTypes, boards, value]);

  return (
    <select
      id={id}
      value={options.some((o) => o === value) ? value : options[0] || value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={className}
    >
      {options.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
