'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorLike;
  }
}

/**
 * Continuously decode QR codes from a live <video> stream.
 * Prefers native BarcodeDetector; falls back to html5-qrcode scanFile on canvas frames.
 */
export function useQrFromVideo(
  videoRef: React.RefObject<HTMLVideoElement>,
  enabled: boolean,
  onDetect: (raw: string) => void
) {
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;
  const cooldownRef = useRef(false);
  const hiddenHostId = useRef(`tv-qr-hidden-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let detector: BarcodeDetectorLike | null = null;
    let fallbackQr: Html5Qrcode | null = null;

    const host = document.createElement('div');
    host.id = hiddenHostId.current;
    host.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;';
    document.body.appendChild(host);

    const emit = (raw: string) => {
      if (!raw || cooldownRef.current) return;
      cooldownRef.current = true;
      onDetectRef.current(raw);
      window.setTimeout(() => {
        cooldownRef.current = false;
      }, 1600);
    };

    const tick = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        timer = setTimeout(() => void tick(), 250);
        return;
      }

      try {
        if (typeof window !== 'undefined' && window.BarcodeDetector) {
          if (!detector) {
            detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          }
          const codes = await detector.detect(video);
          const raw = codes[0]?.rawValue;
          if (raw) emit(raw);
        } else {
          // Fallback: snapshot frame → html5-qrcode file decode
          if (!fallbackQr) {
            fallbackQr = new Html5Qrcode(hiddenHostId.current, { verbose: false });
          }
          const w = video.videoWidth || 640;
          const h = video.videoHeight || 480;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const blob = await new Promise<Blob | null>((resolve) =>
              canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.7)
            );
            if (blob) {
              const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
              try {
                const text = await fallbackQr.scanFile(file, false);
                if (text) emit(text);
              } catch {
                /* no QR in this frame */
              }
            }
          }
        }
      } catch {
        /* frame decode miss */
      }

      if (!cancelled) {
        timer = setTimeout(() => void tick(), detector ? 200 : 550);
      }
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      try {
        fallbackQr?.clear();
      } catch {
        /* ignore */
      }
      host.remove();
    };
  }, [enabled, videoRef]);
}
