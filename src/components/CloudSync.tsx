'use client';

import { useEffect, useRef } from 'react';
import { toast } from '@/lib/notify';
import { useAppStore } from '@/lib/store';
import { getSupabase } from '@/lib/supabase/client';
import {
  clearLegacyLocalStorage,
  loadWorkspace,
  saveWorkspace,
} from '@/lib/supabase/workspace';
import {
  downloadBackupFileToDevice,
  getAutoDownloadDailyPreference,
  getBestRecoveryBackup,
  hasDownloadedDailyFileToday,
  hasMeaningfulWorkshopData,
  markDownloadedDailyFileToday,
  recordDeviceBackup,
  todayDateString,
} from '@/lib/backup-vault';
import { syncUserProfile } from '@/lib/supabase/profile';

/**
 * Auth + Supabase workspace bridge.
 * Workshop data lives only in Supabase (memory while signed in).
 */
export default function CloudSync() {
  const cloudRevision = useAppStore((s) => s.cloudRevision);
  const cloudUserId = useAppStore((s) => s.cloudUserId);
  const cloudReady = useAppStore((s) => s.cloudReady);
  const setCloudUserId = useAppStore((s) => s.setCloudUserId);
  const setCloudReady = useAppStore((s) => s.setCloudReady);
  const setCloudSaving = useAppStore((s) => s.setCloudSaving);
  const setAuthChecked = useAppStore((s) => s.setAuthChecked);
  const hydrateFromCloud = useAppStore((s) => s.hydrateFromCloud);
  const clearWorkshopMemory = useAppStore((s) => s.clearWorkshopMemory);
  const loadDemoPreview = useAppStore((s) => s.loadDemoPreview);
  const skipSaveRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef(false);

  useEffect(() => {
    clearLegacyLocalStorage();

    const supabase = getSupabase();
    if (!supabase) {
      // No backend — still show demo UI, never invent a signed-in session
      loadDemoPreview();
      return;
    }

    let cancelled = false;

    const applySession = async (userId: string | null) => {
      if (cancelled) return;
      if (!userId) {
        // Wipe any real account data, then show sample preview only
        clearWorkshopMemory();
        loadDemoPreview();
        return;
      }

      setCloudUserId(userId);
      setCloudReady(false);
      void syncUserProfile();
      const result = await loadWorkspace(userId);
      if (cancelled) return;

      if (!result.ok) {
        toast.error(result.message);
        setCloudReady(true);
        setAuthChecked(true);
        return;
      }

      skipSaveRef.current = true;
      hydrateFromCloud(result.data);

      // Protect against empty cloud state if this device has a non-empty backup vault
      const bestDeviceBackup = await getBestRecoveryBackup(userId);
      let recoveredFromDevice = false;
      if (bestDeviceBackup) {
        const cloudBoardsEmpty = (result.data.boards?.length || 0) === 0;
        const cloudProjectsEmpty = (result.data.savedProjects?.length || 0) === 0;
        const backupHasBoards = (bestDeviceBackup.payload.boards?.length || 0) > 0;
        const backupHasProjects = (bestDeviceBackup.payload.savedProjects?.length || 0) > 0;

        if ((cloudBoardsEmpty && backupHasBoards) || (cloudProjectsEmpty && backupHasProjects)) {
          const merged = useAppStore.getState().mergeBackupIntoWorkshop({
            boards: cloudBoardsEmpty ? bestDeviceBackup.payload.boards : [],
            savedProjects: cloudProjectsEmpty ? bestDeviceBackup.payload.savedProjects : [],
            storageLocations: bestDeviceBackup.payload.storageLocations,
            lumberTypes: bestDeviceBackup.payload.lumberTypes,
          });
          if (merged.addedBoards > 0 || merged.addedProjects > 0) {
            recoveredFromDevice = true;
            toast.success(
              `Restored ${merged.addedBoards} board${merged.addedBoards === 1 ? '' : 's'} & ${merged.addedProjects} project${merged.addedProjects === 1 ? '' : 's'} from device backup (${bestDeviceBackup.backupDate}).`
            );
          }
        }
      }

      // Record today's on-device daily snapshot if the workshop has data
      const afterHydrate = useAppStore.getState();
      if (hasMeaningfulWorkshopData(afterHydrate)) {
        const snap = {
          boards: afterHydrate.boards,
          savedProjects: afterHydrate.savedProjects,
          storageLocations: afterHydrate.storageLocations,
          lumberTypes: afterHydrate.lumberTypes,
          activeProjectName: afterHydrate.activeProjectName,
          activeParts: afterHydrate.activeParts,
          completedOperations: afterHydrate.completedOperations,
          offcutSettings: afterHydrate.offcutSettings,
          unitSystem: afterHydrate.unitSystem,
          defaultKerfMm: afterHydrate.defaultKerfMm,
          activeKerfMm: afterHydrate.activeKerfMm,
          activeCuttingPlan: afterHydrate.activeCuttingPlan,
        };
        await recordDeviceBackup(userId, snap);

        if (getAutoDownloadDailyPreference() && !hasDownloadedDailyFileToday(userId)) {
          const today = todayDateString();
          downloadBackupFileToDevice(
            {
              version: 1,
              exportedAt: new Date().toISOString(),
              backupDate: today,
              userId,
              ...snap,
            },
            'daily'
          );
          markDownloadedDailyFileToday(userId, today);
        }
      }

      setAuthChecked(true);
      setTimeout(() => {
        skipSaveRef.current = false;
        if (recoveredFromDevice) {
          useAppStore.getState().bumpCloudRevision();
        }
      }, 0);
    };

    (async () => {
      const { data } = await supabase.auth.getSession();
      await applySession(data.session?.user?.id ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        await applySession(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        await applySession(session?.user?.id ?? null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    clearWorkshopMemory,
    hydrateFromCloud,
    loadDemoPreview,
    setAuthChecked,
    setCloudReady,
    setCloudUserId,
  ]);

  useEffect(() => {
    // Never persist demo preview (or empty signed-out state) to the cloud
    if (!cloudUserId || !cloudReady || skipSaveRef.current) return;
    if (useAppStore.getState().demoPreview) return;
    if (cloudRevision === 0) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const runSave = async () => {
        const state = useAppStore.getState();
        if (!state.cloudUserId || state.demoPreview) return;
        if (saveInFlightRef.current) {
          pendingSaveRef.current = true;
          return;
        }
        saveInFlightRef.current = true;
        pendingSaveRef.current = false;
        setCloudSaving(true);
        const allowEmptyWipe = !!state.pendingCloudEmptyWipe;
        const deletedBoardIds = [...state.pendingDeletedBoardIds];
        const deletedProjectIds = [...state.pendingDeletedProjectIds];
        const snapshot = {
          boards: state.boards,
          storageLocations: state.storageLocations,
          lumberTypes: state.lumberTypes,
          savedProjects: state.savedProjects,
          activeProjectName: state.activeProjectName,
          activeParts: state.activeParts,
          completedOperations: state.completedOperations,
          offcutSettings: state.offcutSettings,
          unitSystem: state.unitSystem,
          defaultKerfMm: state.defaultKerfMm,
          activeKerfMm: state.activeKerfMm,
          activeCuttingPlan: state.activeCuttingPlan,
        };
        // Always write to the on-device backup vault first (unless user just ran Wipe)
        if (!allowEmptyWipe && hasMeaningfulWorkshopData(snapshot)) {
          void recordDeviceBackup(state.cloudUserId, snapshot);
        }
        const result = await saveWorkspace(
          state.cloudUserId,
          snapshot,
          { allowEmptyWipe, deletedBoardIds, deletedProjectIds }
        );
        if (result.ok) {
          useAppStore.getState().clearPendingDeletes();
          if (allowEmptyWipe) {
            useAppStore.getState().clearPendingCloudEmptyWipe();
          }
        }
        setCloudSaving(false);
        saveInFlightRef.current = false;
        if (!result.ok) toast.error(`Cloud save failed: ${result.message}`);
        // Flush latest workshop if more edits landed during this save
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          await runSave();
        }
      };
      await runSave();
    }, 500);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [cloudRevision, cloudUserId, cloudReady, setCloudSaving]);

  return null;
}
