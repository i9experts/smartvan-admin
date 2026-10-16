'use client';

import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '@/components/MapPicker';

export const KARACHI = { lat: 24.8607, lng: 67.0011 };

/**
 * Creates a google.maps.Map in `containerRef` once, keeps it sized, and tears
 * down listeners on unmount. Returns `{ map, g, error }` (map is null until ready).
 */
export function useGoogleMap(containerRef: React.RefObject<HTMLDivElement>) {
  const [state, setState] = useState<{ map: any; g: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let mapInstance: any = null;

    loadGoogleMaps()
      .then(() => {
        const el = containerRef.current;
        if (cancelled || !el) return;
        const g = (window as any).google;
        mapInstance = new g.maps.Map(el, {
          center: KARACHI,
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
        });
        observer = new ResizeObserver(() => g.maps.event.trigger(mapInstance, 'resize'));
        observer.observe(el);
        setState({ map: mapInstance, g });
      })
      .catch((e) => {
        console.error('[Map] Google Maps failed to load:', e);
        if (!cancelled) setError(e?.message === 'No Google Maps key' ? 'missing-key' : 'load-failed');
      });

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (mapInstance) (window as any).google?.maps?.event?.clearInstanceListeners(mapInstance);
    };
  }, [containerRef]);

  return { map: state?.map ?? null, g: state?.g ?? null, error };
}
