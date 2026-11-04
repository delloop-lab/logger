/** Species → short lot prefix (PIN, WAL, …). */
export function tagPrefixForSpecies(species: string): string {
  const s = species.toLowerCase();
  if (s.includes('walnut')) return 'WAL';
  if (s.includes('oak')) return 'OAK';
  if (s.includes('maple')) return 'MAP';
  if (s.includes('mahogany')) return 'MAH';
  if (s.includes('cherry')) return 'CHE';
  if (s.includes('plywood')) return 'PLY';
  return 'PIN';
}

/**
 * Next lot code for a prefix, zero-padded to 3 digits (PIN-001, PIN-002, …).
 * Scans existing tags so a wiped inventory starts at 001 again.
 */
export function nextLotTagId(
  boards: { tagId?: string }[],
  prefix: string
): string {
  const re = new RegExp(`^${prefix}-(\\d+)(?:-|$)`, 'i');
  let max = 0;
  for (const b of boards) {
    const m = (b.tagId || '').match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const n = max + 1;
  return `${prefix}-${String(n).padStart(3, '0')}`;
}
