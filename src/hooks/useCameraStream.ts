'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export type CameraDeviceInfo = { id: string; label: string };

export type CameraStreamState = {
  isTransitioning: boolean;
  isLive: boolean;
  error: string | null;
  devices: CameraDeviceInfo[];
  deviceIndex: number;
  videoRef: React.RefObject<HTMLVideoElement>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  flip: () => Promise<void>;
  retry: () => Promise<void>;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function isRealColorCamera(label: string): boolean {
  const s = (label || '').toLowerCase();
  if (!s) return true;
  if (
    /\b(ir|infrared|depth|tof|realsense|kinect|windows hello|biometric|virtual|obs|snap camera|manycam|xsplit|splitcam|nvidia broadcast)\b/i.test(
      s
    )
  ) {
    return false;
  }
  return true;
}

function friendlyMediaError(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  const message = err instanceof Error ? err.message : String(err || 'Camera error');

  if (name === 'AbortError' || /AbortError|Timeout starting video|timed out/i.test(message)) {
    return 'Windows camera driver is still busy from an earlier session. Close other tabs/apps using the camera (or restart the browser once to clear the OS lock), or use "Scan QR from photo" below.';
  }
  if (name === 'NotReadableError' || /NotReadableError|TrackStartError|in use/i.test(message)) {
    return 'Camera is in use by another app or tab. Close it, then tap Retry — or use "Scan QR from photo" below.';
  }
  if (name === 'NotAllowedError' || /Permission|denied/i.test(message)) {
    return 'Camera permission denied. Allow camera access in the address bar, then retry.';
  }
  if (name === 'NotFoundError' || /DevicesNotFound|no camera/i.test(message)) {
    return 'No camera found on this device. Use "Scan QR from photo" or manual lookup below.';
  }
  return message || 'Could not start the camera.';
}

/**
 * Stop all tracks and detach from <video>.
 * NOTE: Do NOT call `video.load()` after clearing `srcObject` — in Chromium on Windows,
 * `load()` on an empty `<video>` can abort the next MediaStream attachment.
 */
export async function teardownMediaStream(
  stream: MediaStream | null,
  video: HTMLVideoElement | null
): Promise<void> {
  const tracks = new Set<MediaStreamTrack>();

  if (video) {
    try {
      video.onloadedmetadata = null;
      video.onplay = null;
      video.onloadeddata = null;
      video.onerror = null;
      video.onpause = null;
      video.onended = null;
    } catch {
      /* ignore */
    }

    try {
      video.pause();
    } catch {
      /* ignore */
    }

    const attached = video.srcObject;
    if (attached instanceof MediaStream) {
      for (const t of attached.getTracks()) tracks.add(t);
    }

    try {
      video.srcObject = null;
    } catch {
      /* ignore */
    }
  }

  if (stream) {
    for (const t of stream.getTracks()) tracks.add(t);
  }

  for (const track of Array.from(tracks)) {
    try {
      track.enabled = false;
      track.onended = null;
      track.stop();
    } catch {
      /* ignore */
    }
  }
}

async function listUsableVideoDevices(excludeIds: Set<string>): Promise<CameraDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  const videos = all.filter((d) => d.kind === 'videoinput' && d.deviceId);
  const filtered = videos.filter(
    (d) => !excludeIds.has(d.deviceId) && isRealColorCamera(d.label)
  );
  const source =
    filtered.length > 0 ? filtered : videos.filter((d) => !excludeIds.has(d.deviceId));

  const seen = new Set<string>();
  const out: CameraDeviceInfo[] = [];
  for (const d of source) {
    if (seen.has(d.deviceId)) continue;
    seen.add(d.deviceId);
    out.push({
      id: d.deviceId,
      label: d.label || `Camera ${out.length + 1}`,
    });
  }
  return out;
}

/**
 * Single-flight camera hook:
 * - Never calls getUserMedia while a previous getUserMedia is still pending in the browser
 * - Uses simple `{ video: true }` on default start so Windows drivers don't hang negotiating facingMode
 * - Cleans up tracks without calling `video.load()`
 */
export function useCameraStream(): CameraStreamState {
  const videoRef = useRef<HTMLVideoElement>(null!);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingGumRef = useRef<Promise<MediaStream> | null>(null);
  const devicesRef = useRef<CameraDeviceInfo[]>([]);
  const deviceIndexRef = useRef(0);
  const brokenIdsRef = useRef<Set<string>>(new Set());
  const transitioningRef = useRef(false);
  const unmountedRef = useRef(false);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<CameraDeviceInfo[]>([]);
  const [deviceIndex, setDeviceIndex] = useState(0);

  const beginTransition = () => {
    transitioningRef.current = true;
    setIsTransitioning(true);
  };

  const endTransition = () => {
    transitioningRef.current = false;
    if (!unmountedRef.current) setIsTransitioning(false);
  };

  const releaseCurrent = useCallback(async (settleMs = 300) => {
    // If a previous getUserMedia is still in flight in the browser, wait for it to settle
    // and immediately stop whatever it returns — NEVER stack a second getUserMedia on top.
    if (pendingGumRef.current) {
      try {
        const late = await pendingGumRef.current;
        await teardownMediaStream(late, null);
      } catch {
        /* previous call rejected, driver is free */
      } finally {
        pendingGumRef.current = null;
      }
    }

    const stream = streamRef.current;
    streamRef.current = null;
    await teardownMediaStream(stream, videoRef.current);
    if (!unmountedRef.current) setIsLive(false);
    if (settleMs > 0) await sleep(settleMs);
  }, []);

  const attachStream = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) {
      await teardownMediaStream(stream, null);
      throw new Error('Camera view is not ready.');
    }

    streamRef.current = stream;
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.srcObject = stream;

    try {
      await video.play();
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'NotAllowedError')) {
        throw err;
      }
    }

    if (!unmountedRef.current) setIsLive(true);
  }, []);

  const requestStream = useCallback(async (constraints: MediaStreamConstraints) => {
    const p = navigator.mediaDevices.getUserMedia(constraints);
    pendingGumRef.current = p;
    try {
      return await p;
    } finally {
      if (pendingGumRef.current === p) {
        pendingGumRef.current = null;
      }
    }
  }, []);

  const openOnce = useCallback(
    async (deviceId?: string) => {
      // Bare `{ video: true }` is the most reliable on Windows; only constrain deviceId when flipping
      const constraints: MediaStreamConstraints = deviceId
        ? { audio: false, video: { deviceId: { exact: deviceId } } }
        : { audio: false, video: true };

      const stream = await requestStream(constraints);

      if (unmountedRef.current) {
        await teardownMediaStream(stream, null);
        return;
      }

      try {
        await attachStream(stream);
      } catch (err) {
        await teardownMediaStream(stream, videoRef.current);
        streamRef.current = null;
        throw err;
      }
    },
    [attachStream, requestStream]
  );

  const syncDeviceListFromRunningStream = useCallback(async () => {
    const list = await listUsableVideoDevices(brokenIdsRef.current);
    devicesRef.current = list;
    const activeId = streamRef.current?.getVideoTracks()[0]?.getSettings()?.deviceId;
    const matchIdx = activeId ? list.findIndex((d) => d.id === activeId) : -1;
    const idx = matchIdx >= 0 ? matchIdx : 0;
    deviceIndexRef.current = idx;
    if (!unmountedRef.current) {
      setDevices(list);
      setDeviceIndex(idx);
    }
    return list;
  }, []);

  const start = useCallback(async () => {
    if (transitioningRef.current) return;
    beginTransition();
    setError(null);

    try {
      // Only pause if we actually had a running stream
      const hadStream = Boolean(streamRef.current || pendingGumRef.current);
      await releaseCurrent(hadStream ? 300 : 0);

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support camera access.');
      }

      await openOnce(undefined);
      await syncDeviceListFromRunningStream();
    } catch (err) {
      await releaseCurrent(0);
      if (!unmountedRef.current) {
        setError(friendlyMediaError(err));
        setIsLive(false);
      }
    } finally {
      endTransition();
    }
  }, [openOnce, releaseCurrent, syncDeviceListFromRunningStream]);

  const stop = useCallback(async () => {
    if (transitioningRef.current) return;
    beginTransition();
    setError(null);
    try {
      await releaseCurrent(250);
    } finally {
      endTransition();
    }
  }, [releaseCurrent]);

  const flip = useCallback(async () => {
    if (transitioningRef.current) return;
    beginTransition();
    setError(null);

    const prevIndex = deviceIndexRef.current;

    try {
      let list = devicesRef.current;
      if (list.length < 2) {
        list = await listUsableVideoDevices(brokenIdsRef.current);
        devicesRef.current = list;
        if (!unmountedRef.current) setDevices(list);
      }
      if (list.length < 2) {
        throw new Error('Only one camera is available on this device.');
      }

      const prevDeviceId = list[prevIndex]?.id;
      const nextIndex = (prevIndex + 1) % list.length;
      const target = list[nextIndex];

      await releaseCurrent(350);

      try {
        await openOnce(target.id);
        await syncDeviceListFromRunningStream();
      } catch (switchErr) {
        brokenIdsRef.current.add(target.id);
        await releaseCurrent(350);

        try {
          if (prevDeviceId && prevDeviceId !== target.id) {
            await openOnce(prevDeviceId);
          } else {
            await openOnce(undefined);
          }
          await syncDeviceListFromRunningStream();
          if (!unmountedRef.current) {
            setError(
              `"${target.label}" could not start and was skipped — kept your working camera.`
            );
          }
        } catch {
          throw switchErr;
        }
      }
    } catch (err) {
      await releaseCurrent(0);
      if (!unmountedRef.current) {
        setError(friendlyMediaError(err));
        setIsLive(false);
      }
    } finally {
      endTransition();
    }
  }, [openOnce, releaseCurrent, syncDeviceListFromRunningStream]);

  const retry = useCallback(async () => {
    brokenIdsRef.current.clear();
    await start();
  }, [start]);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      transitioningRef.current = false;
      const stream = streamRef.current;
      streamRef.current = null;
      void teardownMediaStream(stream, videoRef.current);
    };
  }, []);

  return {
    isTransitioning,
    isLive,
    error,
    devices,
    deviceIndex,
    videoRef,
    start,
    stop,
    flip,
    retry,
  };
}
