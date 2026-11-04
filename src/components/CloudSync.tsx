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
      setAuthChecked(true);
      setTimeout(() => {
        skipSaveRef.current = false;
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
      const state = useAppStore.getState();
      if (!state.cloudUserId) return;
      setCloudSaving(true);
      const result = await saveWorkspace(state.cloudUserId, {
        boards: state.boards,
        storageLocations: state.storageLocations,
        savedProjects: state.savedProjects,
        activeProjectName: state.activeProjectName,
        activeParts: state.activeParts,
        completedOperations: state.completedOperations,
        offcutSettings: state.offcutSettings,
        unitSystem: state.unitSystem,
        defaultKerfMm: state.defaultKerfMm,
        activeKerfMm: state.activeKerfMm,
        activeCuttingPlan: state.activeCuttingPlan,
      });
      setCloudSaving(false);
      if (!result.ok) toast.error(`Cloud save failed: ${result.message}`);
    }, 500);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [cloudRevision, cloudUserId, cloudReady, setCloudSaving]);

  return null;
}
