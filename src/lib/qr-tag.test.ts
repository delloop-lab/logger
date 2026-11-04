import { describe, expect, it } from 'vitest';
import { extractTagFromScan } from '@/lib/qr-tag';

describe('extractTagFromScan', () => {
  it('reads plain tag ids', () => {
    expect(extractTagFromScan('pin-001-1')).toBe('PIN-001-1');
  });

  it('reads timbervault protocol', () => {
    expect(extractTagFromScan('timbervault:PIN-042')).toBe('PIN-042');
  });

  it('reads JSON payloads', () => {
    expect(extractTagFromScan('{"tagId":"OAK-12"}')).toBe('OAK-12');
  });

  it('reads tag query from URL', () => {
    expect(extractTagFromScan('https://example.com/b?tag=WAL-9')).toBe('WAL-9');
  });
});
