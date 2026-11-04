import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  parseScanOutput,
  resolveTrustedCliInvocation,
  type TiMiniImageMode,
  type TiMiniPrintRequest,
} from '@/lib/timini-cli';

const execFileAsync = promisify(execFile);

export const runtime = 'nodejs';

const VALID_ACTIONS = new Set(['print', 'scan', 'list-models', 'feed', 'retract', 'status']);
const VALID_IMAGE_MODES = new Set<TiMiniImageMode>([
  'grayscale',
  'atkinson',
  'floyd_steinberg',
  'bayer_4',
  'bayer_8',
  'threshold',
]);

// Safe validation patterns to prevent flag injection or malformed inputs
const SAFE_BT_TARGET_RE = /^[A-Za-z0-9_:\-. ()]{1,64}$/;
const SAFE_MODEL_KEY_RE = /^[a-z0-9_]{1,48}$/;
const SAFE_PAPER_KEY_RE = /^[a-z0-9_]{1,48}$/;
const SAFE_SERIAL_RE = /^(COM\d{1,3}|\/dev\/[A-Za-z0-9_.\-]+)$/i;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB max for thermal label PNG

/**
 * In-process job lock to prevent concurrent BLE connections / overlapping print jobs.
 */
let activeJobReason: string | null = null;

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;

  let body: TiMiniPrintRequest;
  try {
    body = (await req.json()) as TiMiniPrintRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const action = body.action || 'print';
  if (!VALID_ACTIONS.has(action)) {
    return NextResponse.json(
      { ok: false, error: `Unsupported action "${String(action)}".` },
      { status: 400 }
    );
  }

  const cli = resolveTrustedCliInvocation();
  if (action === 'status') {
    return NextResponse.json({
      ok: cli.available,
      cliAvailable: cli.available,
      cliPath: cli.resolvedPath,
      busy: Boolean(activeJobReason),
      busyReason: activeJobReason,
      error: cli.error,
    });
  }

  if (!cli.available) {
    return NextResponse.json(
      {
        ok: false,
        error: cli.error || 'TiMini CLI is not available on this computer.',
      },
      { status: 503 }
    );
  }

  if (activeJobReason) {
    return NextResponse.json(
      {
        ok: false,
        error: `Printer is currently busy (${activeJobReason}). Please wait for the current operation to finish.`,
        code: 'PRINTER_BUSY',
      },
      { status: 409 }
    );
  }

  const args = [...cli.baseArgs];

  try {
    if (action === 'scan') {
      args.push('--scan');
    } else if (action === 'list-models') {
      args.push('--list-models');
    } else {
      // Validate Bluetooth target
      const bt = body.bluetooth !== undefined ? body.bluetooth.trim() : 'MXW01';
      if (bt) {
        if (!SAFE_BT_TARGET_RE.test(bt) || bt.startsWith('-')) {
          return NextResponse.json(
            { ok: false, error: 'Invalid Bluetooth device name or address.' },
            { status: 400 }
          );
        }
        args.push('--bluetooth', bt);
      }

      // Validate optional Serial port
      if (body.serial?.trim()) {
        const serial = body.serial.trim();
        if (!SAFE_SERIAL_RE.test(serial)) {
          return NextResponse.json(
            { ok: false, error: 'Invalid serial port format (expected e.g. COM4).' },
            { status: 400 }
          );
        }
        args.push('--serial', serial);
      }

      // Validate Printer Model Key (note: pass --printer-model only when explicitly needed or when using serial,
      // because MXW01 auto-resolves to model=v5x/profile=v5x in 1 scan instead of 2 scans)
      if (body.printerModel?.trim()) {
        const modelKey = body.printerModel.trim().toLowerCase();
        if (!SAFE_MODEL_KEY_RE.test(modelKey)) {
          return NextResponse.json(
            { ok: false, error: 'Invalid printer model key.' },
            { status: 400 }
          );
        }
        if (body.serial?.trim() || (modelKey !== 'v5x' && modelKey !== 'auto')) {
          args.push('--printer-model', modelKey);
        }
      }

      if (action === 'feed') {
        args.push('--feed');
      } else if (action === 'retract') {
        args.push('--retract');
      } else {
        // Print action validation — default to maximum darkness (5) for sharpest thermal density
        const d = body.darkness !== undefined ? Number(body.darkness) : 5;
        if (!Number.isInteger(d) || d < 1 || d > 5) {
          return NextResponse.json(
            { ok: false, error: 'Darkness must be an integer between 1 and 5.' },
            { status: 400 }
          );
        }
        args.push('--darkness', String(d));

        const imgMode: TiMiniImageMode = body.imageMode || 'threshold';
        if (!VALID_IMAGE_MODES.has(imgMode)) {
          return NextResponse.json(
            { ok: false, error: `Invalid imageMode "${String(body.imageMode)}".` },
            { status: 400 }
          );
        }
        args.push('--image-mode', imgMode);

        // Force image mode so V5X uses image energy (9000) instead of text energy (8000)
        args.push('--force-image-mode');

        if (body.paper?.trim()) {
          const paper = body.paper.trim();
          if (!SAFE_PAPER_KEY_RE.test(paper)) {
            return NextResponse.json(
              { ok: false, error: 'Invalid paper preset key.' },
              { status: 400 }
            );
          }
          args.push('--paper', paper);
        }

        // Default to preserving full 384px width and top/bottom borders on pre-sized 384px labels
        if (body.trimSideMargins !== true) {
          args.push('--no-trim-side-margins');
        }
        if (body.trimTopBottomMargins !== true) {
          args.push('--no-trim-top-bottom-margins');
        }

        if (body.imageBase64) {
          const rawB64 = body.imageBase64.replace(/^data:image\/png;base64,/i, '').trim();
          if (!rawB64 || !/^[A-Za-z0-9+/=\r\n]+$/.test(rawB64)) {
            return NextResponse.json(
              { ok: false, error: 'Invalid base64 image payload.' },
              { status: 400 }
            );
          }

          const buffer = Buffer.from(rawB64, 'base64');
          if (buffer.length < 64 || !buffer.subarray(0, 8).equals(PNG_MAGIC)) {
            return NextResponse.json(
              { ok: false, error: 'Invalid PNG image data (missing PNG signature).' },
              { status: 400 }
            );
          }
          if (buffer.length > MAX_IMAGE_BYTES) {
            return NextResponse.json(
              { ok: false, error: 'PNG image exceeds maximum allowed size (2 MB).' },
              { status: 400 }
            );
          }

          tempFilePath = path.join(
            os.tmpdir(),
            `timbervault-label-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
          );
          await fs.writeFile(tempFilePath, buffer);
          args.push(tempFilePath);
        } else if (typeof body.text === 'string' && body.text.trim().length > 0) {
          const cleanText = body.text.trim();
          if (cleanText.length > 2000) {
            return NextResponse.json(
              { ok: false, error: 'Text payload exceeds 2000 characters.' },
              { status: 400 }
            );
          }
          args.push('--text', cleanText);
        } else {
          return NextResponse.json(
            { ok: false, error: 'Missing imageBase64 or text payload to print.' },
            { status: 400 }
          );
        }
      }
    }

    activeJobReason = action;
    const timeoutMs = action === 'scan' ? 35000 : action === 'list-models' ? 15000 : 55000;

    const { stdout, stderr } = await execFileAsync(cli.file, args, {
      timeout: timeoutMs,
      windowsHide: true,
      env: {
        ...process.env,
        TIMINIPRINT_NO_UPDATE_CHECK: '1',
      },
    });

    const outTrimmed = stdout.trim();
    const errTrimmed = stderr.trim();

    if (action === 'scan') {
      const printers = parseScanOutput(outTrimmed);
      return NextResponse.json({
        ok: true,
        action,
        printers,
        stdout: outTrimmed,
        stderr: errTrimmed,
      });
    }

    return NextResponse.json({
      ok: true,
      action,
      args,
      stdout: outTrimmed,
      stderr: errTrimmed,
    });
  } catch (err: unknown) {
    const errorObj = err as {
      message?: string;
      stdout?: string;
      stderr?: string;
      code?: number | string;
      killed?: boolean;
      signal?: string;
    };
    const stderr = errorObj.stderr?.trim() || '';
    const stdout = errorObj.stdout?.trim() || '';

    let friendlyError = stderr || stdout || errorObj.message || 'TiMini CLI execution failed';
    if (errorObj.killed || errorObj.signal === 'SIGTERM') {
      friendlyError =
        'Printer operation timed out. Ensure the MXW01 printer is switched on, within Bluetooth range, and not connected to another app.';
    } else if (/No device matches/i.test(friendlyError)) {
      friendlyError = `${friendlyError}. Make sure MXW01 is switched on and not actively connected in TiMini GUI or a phone app.`;
    } else if (/No supported printers found/i.test(friendlyError)) {
      friendlyError =
        'No supported Bluetooth printers found nearby. Ensure MXW01 is switched on and Bluetooth is enabled on Windows.';
    }

    return NextResponse.json(
      {
        ok: false,
        error: friendlyError,
        code: errorObj.code,
        stdout,
        stderr,
      },
      { status: 500 }
    );
  } finally {
    activeJobReason = null;
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }
  }
}
