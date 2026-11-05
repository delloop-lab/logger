/** Built-in lumber / species labels shipped with Logger. */
export const DEFAULT_LUMBER_TYPES = [
  'Pine / Pallet',
  'Plywood',
  'Walnut',
  'European Oak',
  'Maple',
  'Mahogany',
] as const;

export type DefaultLumberType = (typeof DEFAULT_LUMBER_TYPES)[number];

/** Trim, drop empties, de-dupe (case-insensitive), keep first-seen casing/order. */
export function normalizeLumberTypes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_LUMBER_TYPES];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const name = String(item || '').trim().replace(/\s+/g, ' ');
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.length ? out : [...DEFAULT_LUMBER_TYPES];
}

/**
 * Merge catalog with species already on boards so dropdowns never hide inventory labels.
 */
export function mergeLumberTypesWithStock(
  catalog: string[] | undefined | null,
  boardSpecies: Array<string | undefined | null>
): string[] {
  const base = normalizeLumberTypes(catalog?.length ? catalog : [...DEFAULT_LUMBER_TYPES]);
  const seen = new Set(base.map((s) => s.toLowerCase()));
  const out = [...base];
  for (const raw of boardSpecies) {
    const name = String(raw || '').trim().replace(/\s+/g, ' ');
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}
