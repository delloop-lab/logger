/**
 * Extract a timber tag from QR / barcode payload text.
 * Labels encode the board tagId (plain, URL, or small JSON).
 */
export function extractTagFromScan(raw: string): string {
  const text = (raw || '').trim();
  if (!text) return '';

  // timbervault:PIN-001-1 or timbervault://tag/PIN-001-1
  const protocol = text.match(/^timbervault:(?:\/\/(?:tag\/)?)?(.+)$/i);
  if (protocol?.[1]) return protocol[1].trim().toUpperCase();

  try {
    const asJson = JSON.parse(text) as { tagId?: string; tag?: string; id?: string };
    const fromJson = asJson.tagId || asJson.tag || asJson.id;
    if (fromJson) return String(fromJson).trim().toUpperCase();
  } catch {
    /* not JSON */
  }

  try {
    if (/^https?:\/\//i.test(text)) {
      const url = new URL(text);
      const q =
        url.searchParams.get('tag') ||
        url.searchParams.get('tagId') ||
        url.searchParams.get('id');
      if (q) return q.trim().toUpperCase();
      const pathTail = url.pathname.split('/').filter(Boolean).pop();
      if (pathTail && /[A-Z]{2,}-/i.test(pathTail)) return decodeURIComponent(pathTail).toUpperCase();
    }
  } catch {
    /* not a URL */
  }

  // First token that looks like a shop tag (ABC-123 or ABC-123-1-OP2-PART)
  const token = text.toUpperCase().match(/[A-Z]{2,}[A-Z0-9]*-\d+[A-Z0-9\-]*/);
  if (token) return token[0];

  return text.toUpperCase();
}
