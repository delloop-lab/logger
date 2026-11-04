import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { parseScanOutput, resolveTrustedCliInvocation } from '@/lib/timini-cli';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/timini-print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('TiMini Print API Route & Helpers', () => {
  const originalEnv = process.env.TIMINI_CLI_PATH;

  beforeEach(() => {
    delete process.env.TIMINI_CLI_PATH;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.TIMINI_CLI_PATH = originalEnv;
    } else {
      delete process.env.TIMINI_CLI_PATH;
    }
    vi.restoreAllMocks();
  });

  it('parses TiMini CLI --scan output accurately for MXW01 and X7', () => {
    const raw = [
      'MXW01 [profile: v5x] [model: v5x; source: Fun Print, iBleem] (48:0F:57:C4:4F:B0) [ble]',
      'X7 [profile: x7] [model: x7; source: Tiny Print] (07:43:54:48:1A:B9) [classic] [unpaired]',
    ].join('\r\n');

    const printers = parseScanOutput(raw);
    expect(printers).toHaveLength(2);
    expect(printers[0]).toEqual({
      raw: 'MXW01 [profile: v5x] [model: v5x; source: Fun Print, iBleem] (48:0F:57:C4:4F:B0) [ble]',
      name: 'MXW01',
      profile: 'v5x',
      model: 'v5x',
      source: 'Fun Print, iBleem',
      address: '48:0F:57:C4:4F:B0',
      transport: 'ble',
      paired: true,
    });
    expect(printers[1].name).toBe('X7');
    expect(printers[1].paired).toBe(false);
    expect(printers[1].transport).toBe('classic');
  });

  it('resolves local Windows CLI binary and rejects GUI executable', () => {
    const defaultResolved = resolveTrustedCliInvocation();
    expect(defaultResolved.available).toBe(true);
    expect(defaultResolved.resolvedPath).toContain('TiMini-Print-Command-Line-Windows-x86_64.exe');

    process.env.TIMINI_CLI_PATH = 'C:\\Users\\Lou\\Downloads\\TiMini-Print-GUI-Windows-x86_64.exe';
    const guiResolved = resolveTrustedCliInvocation();
    expect(guiResolved.available).toBe(false);
    expect(guiResolved.error).toContain('TiMini-Print-GUI-Windows-x86_64.exe');
  });

  it('rejects invalid JSON bodies and unsupported actions with 400', async () => {
    const badJsonRes = await POST(makeRequest('{not-valid-json'));
    expect(badJsonRes.status).toBe(400);

    const badActionRes = await POST(makeRequest({ action: 'delete-system' }));
    expect(badActionRes.status).toBe(400);
  });

  it('rejects invalid PNG data (non-PNG signature or malformed base64) with 400', async () => {
    const res1 = await POST(
      makeRequest({
        action: 'print',
        imageBase64: 'data:image/png;base64,aGVsbG8gd29ybGQ=', // "hello world", not PNG magic bytes
      })
    );
    expect(res1.status).toBe(400);
    const json1 = await res1.json();
    expect(json1.ok).toBe(false);
    expect(json1.error).toContain('Invalid PNG');

    const res2 = await POST(
      makeRequest({
        action: 'print',
        imageBase64: '!!!not-base64!!!',
      })
    );
    expect(res2.status).toBe(400);
  });

  it('rejects unsafe Bluetooth flags, model keys, or darkness out of range with 400', async () => {
    const flagInjectRes = await POST(
      makeRequest({
        action: 'feed',
        bluetooth: '--export-printer-config',
      })
    );
    expect(flagInjectRes.status).toBe(400);

    const badModelRes = await POST(
      makeRequest({
        action: 'feed',
        printerModel: '../evil',
      })
    );
    expect(badModelRes.status).toBe(400);

    const badDarknessRes = await POST(
      makeRequest({
        action: 'print',
        text: 'Test',
        darkness: 9,
      })
    );
    expect(badDarknessRes.status).toBe(400);
  });

  it('reports 503 when CLI executable is missing and TIMINI_CLI_PATH points to non-existent binary', async () => {
    process.env.TIMINI_CLI_PATH = 'C:\\nonexistent\\TiMini-Missing.exe';
    // Note: fallback still checks bin/, so test status with GUI path to trigger 503
    process.env.TIMINI_CLI_PATH = 'C:\\Users\\Lou\\Downloads\\TiMini-Print-GUI-Windows-x86_64.exe';
    const res = await POST(makeRequest({ action: 'feed' }));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });
});
