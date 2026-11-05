/** Species → short lot prefix (PIN, WAL, JAR, …). */
export function tagPrefixForSpecies(species: string): string {
  const s = species.toLowerCase();
  if (s.includes('walnut')) return 'WAL';
  if (s.includes('oak')) return 'OAK';
  if (s.includes('maple')) return 'MAP';
  if (s.includes('mahogany')) return 'MAH';
  if (s.includes('cherry')) return 'CHE';
  if (s.includes('plywood') || s.includes('ply')) return 'PLY';
  if (s.includes('birch')) return 'BIR';
  if (s.includes('jarrah')) return 'JAR';
  if (s.includes('pine') || s.includes('pallet')) return 'PIN';
  if (s.includes('ash')) return 'ASH';
  if (s.includes('beech')) return 'BEE';
  if (s.includes('cedar')) return 'CED';
  if (s.includes('teak')) return 'TEA';
  if (s.includes('poplar')) return 'POP';
  if (s.includes('mdf')) return 'MDF';

  // Custom lumber: first 3 A–Z letters of the label (Jarrah → JAR, White Oak → WHI)
  const letters = s.replace(/[^a-z]/g, '');
  if (letters.length >= 3) return letters.slice(0, 3).toUpperCase();
  if (letters.length > 0) return (letters + 'XXX').slice(0, 3).toUpperCase();
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
