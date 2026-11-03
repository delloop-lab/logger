export type UnitSystem = 'metric' | 'imperial';

export const MM_PER_INCH = 25.4;

/** All inventory dimensions are stored in millimetres. */

export function mmToDisplay(mm: number, system: UnitSystem, digits = 2): number {
  if (system === 'imperial') {
    return round(mm / MM_PER_INCH, digits);
  }
  return round(mm, system === 'metric' ? 1 : digits);
}

export function displayToMm(value: number, system: UnitSystem): number {
  if (system === 'imperial') {
    return value * MM_PER_INCH;
  }
  return value;
}

export function unitLabel(system: UnitSystem): string {
  return system === 'imperial' ? 'in' : 'mm';
}

export function formatDim(mm: number, system: UnitSystem, digits?: number): string {
  const n = mmToDisplay(mm, system, digits ?? (system === 'imperial' ? 2 : 0));
  const shown =
    system === 'imperial'
      ? n.toFixed(digits ?? 2).replace(/\.?0+$/, '') || '0'
      : String(Math.round(n * 10) / 10).replace(/\.0$/, '');
  return `${shown}${unitLabel(system)}`;
}

export function formatDimsLWT(
  lengthMm: number,
  widthMm: number,
  thicknessMm: number,
  system: UnitSystem
): string {
  return `${formatDim(lengthMm, system)} × ${formatDim(widthMm, system)} × ${formatDim(thicknessMm, system)}`;
}

/** Volume helpers */
export function volumeM3(lengthMm: number, widthMm: number, thicknessMm: number, qty = 1): number {
  return (lengthMm * widthMm * thicknessMm * qty) / 1_000_000_000;
}

export function volumeBoardFeet(
  lengthMm: number,
  widthMm: number,
  thicknessMm: number,
  qty = 1
): number {
  const l = lengthMm / MM_PER_INCH;
  const w = widthMm / MM_PER_INCH;
  const t = thicknessMm / MM_PER_INCH;
  return (l * w * t * qty) / 144;
}

export function formatVolume(
  lengthMm: number,
  widthMm: number,
  thicknessMm: number,
  qty: number,
  system: UnitSystem
): string {
  if (system === 'imperial') {
    return `${volumeBoardFeet(lengthMm, widthMm, thicknessMm, qty).toFixed(3)} bf`;
  }
  return `${volumeM3(lengthMm, widthMm, thicknessMm, qty).toFixed(3)} m³`;
}

function round(n: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
