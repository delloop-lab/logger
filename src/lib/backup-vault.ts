import Dexie, { type Table } from 'dexie';
import type {
  Board,
  CutPart,
  OffcutSettings,
  SavedCuttingPlan,
  SavedProject,
  UnitSystem,
} from '@/lib/store';

export interface WorkshopBackupPayload {
  version: 1;
  exportedAt: string;
  backupDate: string; // YYYY-MM-DD (local date)
  userId: string;
  boards: Board[];
  savedProjects: SavedProject[];
  storageLocations: string[];
  lumberTypes: string[];
  activeProjectName: string;
  activeParts: CutPart[];
  completedOperations: string[];
  offcutSettings: OffcutSettings;
  unitSystem: UnitSystem;
  defaultKerfMm: number;
  activeKerfMm: number;
  activeCuttingPlan: SavedCuttingPlan | null;
}

export interface StoredBackupRecord {
  /** Primary key: `${userId}::${slot}` where slot is `latest`, `highwater`, or `daily:YYYY-MM-DD` */
  id: string;
  userId: string;
  slot: string;
  label: string;
  backupDate: string;
  createdAt: string;
  boardCount: number;
  projectCount: number;
  payload: WorkshopBackupPayload;
}

class LoggerBackupDatabase extends Dexie {
  backups!: Table<StoredBackupRecord, string>;

  constructor() {
    super('logger_backup_vault_v1');
    this.version(1).stores({
      backups: 'id, userId, slot, backupDate, createdAt',
    });
  }
}

let dbInstance: LoggerBackupDatabase | null = null;

function getBackupDb(): LoggerBackupDatabase | null {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return null;
  }
  if (!dbInstance) {
    dbInstance = new LoggerBackupDatabase();
  }
  return dbInstance;
}

const LS_FALLBACK_PREFIX = 'logger_device_backup_v1:';
const LS_AUTO_DOWNLOAD_KEY = 'logger_auto_download_daily_backup_v1';
const LS_LAST_FILE_DOWNLOAD_DATE_PREFIX = 'logger_last_file_backup_date_v1:';
const MAX_DAILY_SNAPSHOTS = 30;

export function todayDateString(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function hasMeaningfulWorkshopData(
  snapshot: Pick<WorkshopBackupPayload, 'boards' | 'savedProjects'>
): boolean {
  return (snapshot.boards?.length || 0) > 0 || (snapshot.savedProjects?.length || 0) > 0;
}

function saveLocalStorageMirror(userId: string, record: StoredBackupRecord) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      `${LS_FALLBACK_PREFIX}${userId}:${record.slot}`,
      JSON.stringify(record)
    );
  } catch {
    /* ignore quota errors — IndexedDB is primary */
  }
}

function readLocalStorageMirrors(userId: string): StoredBackupRecord[] {
  if (typeof window === 'undefined') return [];
  const results: StoredBackupRecord[] = [];
  const prefix = `${LS_FALLBACK_PREFIX}${userId}:`;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as StoredBackupRecord;
      if (parsed && parsed.payload && Array.isArray(parsed.payload.boards)) {
        results.push(parsed);
      }
    }
  } catch {
    /* ignore */
  }
  return results;
}

/**
 * Save current workshop state into the on-device vault:
 * 1. `latest` — updated on every non-empty change
 * 2. `daily:YYYY-MM-DD` — saved once per day, or upgraded if today's board/project count grows
 * 3. `highwater` — preserved whenever total boards + projects reaches a new high
 */
export async function recordDeviceBackup(
  userId: string,
  snapshot: Omit<WorkshopBackupPayload, 'version' | 'exportedAt' | 'backupDate' | 'userId'>
): Promise<{ savedDaily: boolean; backupDate: string }> {
  const backupDate = todayDateString();
  if (!userId || !hasMeaningfulWorkshopData(snapshot)) {
    return { savedDaily: false, backupDate };
  }

  const nowIso = new Date().toISOString();
  const payload: WorkshopBackupPayload = {
    version: 1,
    exportedAt: nowIso,
    backupDate,
    userId,
    ...snapshot,
  };

  const boardCount = snapshot.boards.length;
  const projectCount = snapshot.savedProjects.length;

  const latestRecord: StoredBackupRecord = {
    id: `${userId}::latest`,
    userId,
    slot: 'latest',
    label: 'Most recent backup',
    backupDate,
    createdAt: nowIso,
    boardCount,
    projectCount,
    payload,
  };

  const dailySlot = `daily:${backupDate}`;
  const dailyId = `${userId}::${dailySlot}`;
  const dailyRecord: StoredBackupRecord = {
    id: dailyId,
    userId,
    slot: dailySlot,
    label: `Daily backup (${backupDate})`,
    backupDate,
    createdAt: nowIso,
    boardCount,
    projectCount,
    payload,
  };

  saveLocalStorageMirror(userId, latestRecord);

  const db = getBackupDb();
  if (!db) {
    saveLocalStorageMirror(userId, dailyRecord);
    return { savedDaily: true, backupDate };
  }

  let savedDaily = false;
  try {
    await db.backups.put(latestRecord);

    const existingDaily = await db.backups.get(dailyId);
    const shouldWriteDaily =
      !existingDaily ||
      boardCount > existingDaily.boardCount ||
      projectCount > existingDaily.projectCount;

    if (shouldWriteDaily) {
      await db.backups.put(dailyRecord);
      saveLocalStorageMirror(userId, dailyRecord);
      savedDaily = !existingDaily;
    }

    const highwaterId = `${userId}::highwater`;
    const existingHigh = await db.backups.get(highwaterId);
    const currentScore = boardCount * 10 + projectCount;
    const highScore = existingHigh
      ? existingHigh.boardCount * 10 + existingHigh.projectCount
      : -1;
    if (!existingHigh || currentScore >= highScore) {
      const highRecord: StoredBackupRecord = {
        id: highwaterId,
        userId,
        slot: 'highwater',
        label: 'Fullest workshop backup',
        backupDate,
        createdAt: nowIso,
        boardCount,
        projectCount,
        payload,
      };
      await db.backups.put(highRecord);
      saveLocalStorageMirror(userId, highRecord);
    }

    // Prune daily snapshots older than MAX_DAILY_SNAPSHOTS (never prune latest or highwater)
    const allForUser = await db.backups.where('userId').equals(userId).toArray();
    const dailies = allForUser
      .filter((r) => r.slot.startsWith('daily:'))
      .sort((a, b) => b.backupDate.localeCompare(a.backupDate));
    if (dailies.length > MAX_DAILY_SNAPSHOTS) {
      const staleIds = dailies.slice(MAX_DAILY_SNAPSHOTS).map((r) => r.id);
      await db.backups.bulkDelete(staleIds);
    }
  } catch {
    saveLocalStorageMirror(userId, dailyRecord);
  }

  return { savedDaily, backupDate };
}

/** List all device backups for a user (newest first). */
export async function listDeviceBackups(userId: string): Promise<StoredBackupRecord[]> {
  if (!userId) return [];
  const byId = new Map<string, StoredBackupRecord>();

  for (const item of readLocalStorageMirrors(userId)) {
    byId.set(item.id, item);
  }

  const db = getBackupDb();
  if (db) {
    try {
      const rows = await db.backups.where('userId').equals(userId).toArray();
      for (const r of rows) {
        byId.set(r.id, r);
      }
    } catch {
      /* fallback to localStorage mirrors */
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (a.slot === 'latest') return -1;
    if (b.slot === 'latest') return 1;
    if (a.slot === 'highwater') return -1;
    if (b.slot === 'highwater') return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/**
 * Find the best on-device backup when cloud returns empty boards or empty projects.
 * Prefers the snapshot with the most boards/projects.
 */
export async function getBestRecoveryBackup(
  userId: string
): Promise<StoredBackupRecord | null> {
  const backups = await listDeviceBackups(userId);
  if (backups.length === 0) return null;

  const withData = backups.filter((b) => hasMeaningfulWorkshopData(b.payload));
  if (withData.length === 0) return null;

  return [...withData].sort((a, b) => {
    const scoreA = a.boardCount * 100 + a.projectCount * 10;
    const scoreB = b.boardCount * 100 + b.projectCount * 10;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b.createdAt.localeCompare(a.createdAt);
  })[0];
}

export function getAutoDownloadDailyPreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(LS_AUTO_DOWNLOAD_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAutoDownloadDailyPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_AUTO_DOWNLOAD_KEY, enabled ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

export function hasDownloadedDailyFileToday(userId: string, dateStr = todayDateString()): boolean {
  if (typeof window === 'undefined' || !userId) return false;
  try {
    return (
      window.localStorage.getItem(`${LS_LAST_FILE_DOWNLOAD_DATE_PREFIX}${userId}`) === dateStr
    );
  } catch {
    return false;
  }
}

export function markDownloadedDailyFileToday(userId: string, dateStr = todayDateString()): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(`${LS_LAST_FILE_DOWNLOAD_DATE_PREFIX}${userId}`, dateStr);
  } catch {
    /* ignore */
  }
}

/** Trigger a browser download of the workshop backup JSON file to the user's device. */
export function downloadBackupFileToDevice(payload: WorkshopBackupPayload, customTag?: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const datePart = payload.backupDate || todayDateString();
  const suffix = customTag ? `-${customTag}` : '';
  const filename = `logger-workshop-backup-${datePart}${suffix}.json`;
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Validate and parse an imported JSON backup file from the user's device. */
export function parseImportedBackupJson(
  rawJson: string
): { ok: true; payload: WorkshopBackupPayload } | { ok: false; message: string } {
  try {
    const parsed = JSON.parse(rawJson) as Partial<WorkshopBackupPayload>;
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, message: 'Backup file is not a valid JSON object.' };
    }
    if (!Array.isArray(parsed.boards) || !Array.isArray(parsed.savedProjects)) {
      return {
        ok: false,
        message: 'Backup file is missing boards or savedProjects arrays.',
      };
    }
    const payload: WorkshopBackupPayload = {
      version: 1,
      exportedAt: String(parsed.exportedAt || new Date().toISOString()),
      backupDate: String(parsed.backupDate || todayDateString()),
      userId: String(parsed.userId || 'imported'),
      boards: parsed.boards,
      savedProjects: parsed.savedProjects,
      storageLocations: Array.isArray(parsed.storageLocations) ? parsed.storageLocations : [],
      lumberTypes: Array.isArray(parsed.lumberTypes) ? parsed.lumberTypes : [],
      activeProjectName: String(parsed.activeProjectName || 'New Project'),
      activeParts: Array.isArray(parsed.activeParts) ? parsed.activeParts : [],
      completedOperations: Array.isArray(parsed.completedOperations)
        ? parsed.completedOperations
        : [],
      offcutSettings:
        parsed.offcutSettings &&
        typeof parsed.offcutSettings.minLength === 'number' &&
        typeof parsed.offcutSettings.minWidth === 'number'
          ? parsed.offcutSettings
          : { minLength: 100, minWidth: 100 },
      unitSystem: parsed.unitSystem === 'imperial' ? 'imperial' : 'metric',
      defaultKerfMm: typeof parsed.defaultKerfMm === 'number' ? parsed.defaultKerfMm : 3.2,
      activeKerfMm: typeof parsed.activeKerfMm === 'number' ? parsed.activeKerfMm : 3.2,
      activeCuttingPlan: parsed.activeCuttingPlan ?? null,
    };
    return { ok: true, payload };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Could not parse backup JSON file.',
    };
  }
}
