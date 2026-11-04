import type { Board } from '@/lib/store';

export type NestStock = {
  id: string;
  tagId: string;
  species: string;
  source: string;
  location: string;
  length: number;
  width: number;
  thickness: number;
  status: Board['status'];
  isOffcut?: boolean;
  defects?: string[];
  defectNotes?: string;
};

/** Walk tag genealogy to the stock lot that carries logged defects. */
export function findSourceLot(tag: string, boards: Board[]): Board | undefined {
  if (!tag) return undefined;
  const exact = boards.find((b) => b.tagId === tag);
  if (exact) return exact;

  const withoutOp = tag.replace(/-OP\d+.*$/i, '');
  if (withoutOp !== tag) {
    const unitOrLot = boards.find((b) => b.tagId === withoutOp);
    if (unitOrLot) return unitOrLot;
  }

  const lotTag = withoutOp.replace(/-\d+$/, '');
  if (lotTag && lotTag !== withoutOp) {
    const lot = boards.find((b) => b.tagId === lotTag);
    if (lot) return lot;
  }

  return boards.find((b) => withoutOp === b.tagId || withoutOp.startsWith(`${b.tagId}-`));
}

/** Escape a lot tag for use in RegExp (e.g. PIN-001). */
export function escapeTag(tag: string): string {
  return tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highest unit index already taken from a multi-qty lot.
 * Infers from child tags like PIN-001-1-OP1-PART / PIN-001-2 when unitsIssued is missing.
 */
export function resolveUnitsIssued(lot: Board, allBoards: Board[]): number {
  const stored = Math.max(0, Number(lot.unitsIssued) || 0);
  const re = new RegExp(`^${escapeTag(lot.tagId)}-(\\d+)(?:$|-)`);
  let inferred = 0;
  for (const b of allBoards) {
    if (b.id === lot.id) continue;
    const m = (b.tagId || '').match(re);
    if (m) inferred = Math.max(inferred, Number(m[1]));
  }
  return Math.max(stored, inferred);
}

/** Raw lots + reusable offcuts, never re-nest finished parts or in-progress OP rem/strip/aside tags */
export function isNestableStock(b: Board): boolean {
  if (b.status === 'consumed') return false;
  if (b.classification === 'finished_piece' || b.classification === 'waste') return false;
  if (/-PART$/i.test(b.tagId || '')) return false;
  if (/-OP\d+-(?:REM|STRIP|ASIDE|WASTE)$/i.test(b.tagId || '')) return false;
  return true;
}

/**
 * Expand quantity lots into distinct pullable pieces with **stable** unit tags.
 * After PIN-001-1 is used, remaining qty must become PIN-001-2… not PIN-001-1 again.
 */
export function expandLotsToStock(boards: Board[]): NestStock[] {
  return boards.filter(isNestableStock).flatMap((b) => {
    const qty = Math.max(1, b.quantity || 1);
    const issued = resolveUnitsIssued(b, boards);
    const useUnitTags = qty > 1 || issued > 0;
    const isOffcut =
      b.classification === 'reusable_offcut' ||
      Boolean(b.originProject) ||
      /-OFFCUT$/i.test(b.tagId || '');
    const base = {
      species: b.species,
      source: b.source,
      location: b.location,
      length: Number(b.dimensions?.length ?? b.length ?? 0),
      width: Number(b.dimensions?.width ?? b.width ?? 0),
      thickness: Number(b.dimensions?.thickness ?? b.thickness ?? 0),
      status: b.status as Board['status'],
      isOffcut,
      defects: b.defects?.length ? [...b.defects] : undefined,
      defectNotes: b.defectNotes?.trim() || undefined,
    };
    return Array.from({ length: qty }, (_, i) => {
      const unit = issued + i + 1;
      return {
        ...base,
        id: useUnitTags ? `${b.id}#${unit}` : b.id,
        tagId: useUnitTags ? `${b.tagId}-${unit}` : b.tagId,
      };
    });
  });
}
