/** Workshop defect labels logged on stock lots and carried into project builds. */
export const DEFECT_OPTIONS = [
  'Screw holes',
  'Nail holes',
  'Loose knots',
  'Hairline checks',
  'Cracks / splits',
  'Warp / cup',
  'Discoloration',
  'Paint / finish',
  'Waney edges',
  'Live edge',
  'Rot / soft spots',
] as const;

export type DefectType = (typeof DEFECT_OPTIONS)[number];

export function normalizeDefects(raw: unknown): DefectType[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(DEFECT_OPTIONS);
  const out: DefectType[] = [];
  for (const item of raw) {
    const s = String(item || '').trim();
    if (s && allowed.has(s) && !out.includes(s as DefectType)) {
      out.push(s as DefectType);
    }
  }
  return out;
}

export function formatDefectsList(defects?: string[] | null, defectNotes?: string | null): string {
  const list = (defects || []).map((d) => String(d).trim()).filter(Boolean);
  const notes = (defectNotes || '').trim();
  if (list.length === 0 && !notes) return '';
  const head = list.join(', ');
  if (head && notes) return `${head}, ${notes}`;
  return head || notes;
}

export function hasDefects(defects?: string[] | null, defectNotes?: string | null): boolean {
  return Boolean((defects && defects.length > 0) || (defectNotes && defectNotes.trim()));
}
