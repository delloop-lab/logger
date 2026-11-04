import * as fsSync from 'fs';
import * as path from 'path';
import * as os from 'os';

export type TiMiniImageMode =
  | 'grayscale'
  | 'atkinson'
  | 'floyd_steinberg'
  | 'bayer_4'
  | 'bayer_8'
  | 'threshold';

export interface TiMiniPrintRequest {
  action?: 'print' | 'scan' | 'list-models' | 'feed' | 'retract' | 'status';
  /** Base64-encoded PNG image (with or without data:image/png;base64, prefix) */
  imageBase64?: string;
  /** Raw text to print via --text */
  text?: string;
  /** Bluetooth printer name or MAC address (--bluetooth), defaults to MXW01 */
  bluetooth?: string;
  /** Serial port path to bypass Bluetooth (--serial), e.g. COM4 */
  serial?: string;
  /** Known printer model key (--printer-model), defaults to v5x for MXW01 */
  printerModel?: string;
  /** Print darkness 1..5 (--darkness) */
  darkness?: number;
  /** Image conversion mode (--image-mode) */
  imageMode?: TiMiniImageMode;
  /** Paper preset key (--paper), e.g. plain_384r or tag_384r */
  paper?: string;
  /** Disable trimming white side margins (--no-trim-side-margins) */
  trimSideMargins?: boolean;
  /** Disable trimming white top/bottom margins (--no-trim-top-bottom-margins) */
  trimTopBottomMargins?: boolean;
}

export interface DiscoveredPrinter {
  raw: string;
  name: string;
  profile: string;
  model: string;
  source: string;
  address: string;
  transport: string;
  paired: boolean;
}

/**
 * Resolves the trusted TiMini CLI executable/script on the local Windows machine.
 * Never accepts arbitrary executable paths from the HTTP request body.
 */
export function resolveTrustedCliInvocation(): {
  available: boolean;
  file: string;
  baseArgs: string[];
  resolvedPath: string;
  error?: string;
} {
  const candidates: string[] = [];

  if (process.env.TIMINI_CLI_PATH?.trim()) {
    candidates.push(process.env.TIMINI_CLI_PATH.trim());
  }

  // Local workspace bin directory (primary location on Windows)
  candidates.push(
    path.join(process.cwd(), 'bin', 'TiMini-Print-Command-Line-Windows-x86_64.exe')
  );

  // User Downloads folder fallback
  const userProfile = process.env.USERPROFILE || os.homedir();
  if (userProfile) {
    candidates.push(
      path.join(userProfile, 'Downloads', 'TiMini-Print-Command-Line-Windows-x86_64.exe')
    );
  }

  for (const candidate of candidates) {
    try {
      const stat = fsSync.statSync(candidate);
      if (!stat.isFile()) continue;

      const lower = candidate.toLowerCase();
      if (lower.endsWith('timini-print-gui-windows-x86_64.exe')) {
        return {
          available: false,
          file: candidate,
          baseArgs: [],
          resolvedPath: candidate,
          error:
            'Configured executable is TiMini-Print-GUI-Windows-x86_64.exe, which launches the Tkinter GUI instead of the CLI. Use TiMini-Print-Command-Line-Windows-x86_64.exe.',
        };
      }

      if (lower.endsWith('.py')) {
        const pythonBin = process.env.TIMINI_PYTHON_PATH?.trim() || 'python';
        return {
          available: true,
          file: pythonBin,
          baseArgs: [candidate],
          resolvedPath: candidate,
        };
      }

      if (lower.endsWith('.exe') || process.platform !== 'win32') {
        return {
          available: true,
          file: candidate,
          baseArgs: [],
          resolvedPath: candidate,
        };
      }
    } catch {
      // candidate does not exist, try next
    }
  }

  return {
    available: false,
    file: '',
    baseArgs: [],
    resolvedPath: '',
    error:
      'TiMini-Print CLI executable not found. Place TiMini-Print-Command-Line-Windows-x86_64.exe in C:\\projects\\logger\\bin\\ or set TIMINI_CLI_PATH.',
  };
}

/**
 * Parses stdout lines from `TiMini-Print --scan` into structured printer objects.
 * Example line:
 * `MXW01 [profile: v5x] [model: v5x; source: Fun Print, iBleem] (48:0F:57:C4:4F:B0) [ble]`
 */
export function parseScanOutput(stdout: string): DiscoveredPrinter[] {
  const printers: DiscoveredPrinter[] = [];
  const lines = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    const profileMatch = line.match(/\[profile:\s*([^\]]+)\]/i);
    if (!profileMatch) continue;

    const namePart = line.slice(0, profileMatch.index).trim();
    const modelSourceMatch = line.match(/\[model:\s*([^;\]]+)(?:;\s*source:\s*([^\]]+))?\]/i);
    const addrMatch = line.match(/\(([0-9A-Fa-f:]{11,17})\)/);
    const transportMatch = line.match(/\[(ble|classic|classic\+ble|serial)\]/i);
    const unpaired = /\[unpaired\]/i.test(line);

    printers.push({
      raw: line,
      name: namePart || addrMatch?.[1] || 'Unknown',
      profile: profileMatch[1].trim(),
      model: modelSourceMatch?.[1]?.trim() || profileMatch[1].trim(),
      source: modelSourceMatch?.[2]?.trim() || '',
      address: addrMatch?.[1]?.trim() || '',
      transport: transportMatch?.[1]?.toLowerCase() || 'ble',
      paired: !unpaired,
    });
  }

  return printers;
}
