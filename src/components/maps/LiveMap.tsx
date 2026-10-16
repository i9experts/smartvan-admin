'use client';

import { useEffect, useRef, useState } from 'react';
import { Crosshair, MapPin } from 'lucide-react';
import { useGoogleMap } from './useGoogleMap';
import { createPin, createVanOverlay, NAVY, VanOverlayHandle, PinHandle } from './overlays';
import { decodePolyline, isValidPoint } from '@/lib/geo';

export interface MapVan {
  id: string;
  lat: number;
  lng: number;
  heading: number | null;
  label: string;
  ringColor: string;
  dim: boolean;
}

export interface MapStop {
  order: number;
  fullname: string;
  lat: number;
  lng: number;
  status: string;
}

export interface MapPlan {
  stops: MapStop[];
  school: { name: string; lat: number; lng: number } | null;
  plannedPolyline: string | null;
}

interface Props {
  vans: MapVan[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  trail: [number, number][];
  plan: MapPlan | null;
}

/**
 * The map never fights the user: it auto-fits only (a) the first time vans
 * appear and (b) when a trip is selected. Any pan/zoom by the user stops
 * auto-fitting until they press "Re-center".
 */
export default function LiveMap({ vans, selectedId, onSelect, trail, plan }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const { map, g, error } = useGoogleMap(divRef);

  const vanHandles = useRef<Map<string, VanOverlayHandle>>(new Map());
  const stopPins = useRef<PinHandle[]>([]);
  const trailLine = useRef<any>(null);
  const planLine = useRef<any>(null);
  const userMoved = useRef(false);
  const fitDone = useRef(false);
  const lastFitSelection = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [showRecenter, setShowRecenter] = useState(false);

  // Detect real user gestures (programmatic fitBounds doesn't fire these).
  useEffect(() => {
    const el = divRef.current;
    if (!map || !el) return;
    const mark = () => { userMoved.current = true; setShowRecenter(true); };
    const evs = ['wheel', 'pointerdown', 'touchstart', 'dblclick'] as const;
    evs.forEach((e) => el.addEventListener(e, mark, { passive: true }));
    return () => evs.forEach((e) => el.removeEventListener(e, mark));
  }, [map]);

  const fit = (selected: boolean) => {
    if (!map || !g) return;
    const b = new g.maps.LatLngBounds();
    let n = 0;
    const add = (lat: number, lng: number) => { if (isValidPoint(lat, lng)) { b.extend({ lat, lng }); n++; } };
    if (selected && selectedId) {
      const v = vans.find((x) => x.id === selectedId);
      if (v) add(v.lat, v.lng);
      trail.forEach(([la, ln]) => add(la, ln));
      plan?.stops.forEach((s) => add(s.lat, s.lng));
      if (plan?.school) add(plan.school.lat, plan.school.lng);
      decodePolyline(plan?.plannedPolyline).forEach(([la, ln]) => add(la, ln));
    } else {
      vans.forEach((v) => add(v.lat, v.lng));
    }
    if (n === 0) return;
    if (n === 1) { map.setCenter(b.getCenter()); map.setZoom(16); return; }
    map.fitBounds(b, 70);
  };
  const fitRef = useRef(fit);
  fitRef.current = fit;

  // Van overlays: create / glide / restyle / remove.
  useEffect(() => {
    if (!map || !g) return;
    const seen = new Set<string>();
    for (const v of vans) {
      if (!isValidPoint(v.lat, v.lng)) continue;
      seen.add(v.id);
      let h = vanHandles.current.get(v.id);
      if (!h) {
        h = createVanOverlay(g, map, { lat: v.lat, lng: v.lng, heading: v.heading, onClick: () => onSelectRef.current(v.id) });
        vanHandles.current.set(v.id, h);
      } else {
        h.moveTo(v.lat, v.lng, v.heading);
      }
      h.setStyle({ selected: v.id === selectedId, ringColor: v.ringColor, label: v.label, dim: v.dim });
    }
    for (const [id, h] of Array.from(vanHandles.current.entries())) {
      if (!seen.has(id)) { h.remove(); vanHandles.current.delete(id); }
    }
    if (!fitDone.current && seen.size > 0) {
      fitDone.current = true;
      fitRef.current(false);
    }
  }, [map, g, vans, selectedId]);

  // Selecting a trip pans/zooms to it (once per selection; re-arms auto-fit).
  useEffect(() => {
    if (selectedId === lastFitSelection.current) return;
    lastFitSelection.current = selectedId;
    userMoved.current = false;
    setShowRecenter(false);
    if (selectedId) fitRef.current(true);
  }, [selectedId, vans]);

  // When the selected trip's trail/plan first arrives, fit once if the user hasn't moved the map.
  const fittedDataFor = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId) { fittedDataFor.current = null; return; }
    const hasData = trail.length > 1 || (plan?.stops.length ?? 0) > 0;
    if (hasData && fittedDataFor.current !== selectedId && !userMoved.current) {
      fittedDataFor.current = selectedId;
      fitRef.current(true);
    }
  }, [selectedId, trail, plan]);

  // Trail polyline (selected trip only).
  useEffect(() => {
    if (!map || !g) return;
    if (!trailLine.current) {
      trailLine.current = new g.maps.Polyline({ map, strokeColor: NAVY, strokeOpacity: 0.9, strokeWeight: 5, zIndex: 3 });
    }
    trailLine.current.setPath(trail.map(([lat, lng]) => ({ lat, lng })));
  }, [map, g, trail]);

  // Planned road route + stop / school pins.
  useEffect(() => {
    if (!map || !g) return;
    if (!planLine.current) {
      planLine.current = new g.maps.Polyline({
        map, strokeOpacity: 0, zIndex: 2,
        icons: [{
          icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.95, strokeColor: '#2F80ED', scale: 3 },
          offset: '0', repeat: '14px',
        }],
      });
    }
    planLine.current.setPath(decodePolyline(plan?.plannedPolyline).map(([lat, lng]) => ({ lat, lng })));

    stopPins.current.forEach((p) => p.remove());
    stopPins.current = [];
    if (!plan) return;
    for (const s of plan.stops) {
      if (!isValidPoint(s.lat, s.lng)) continue;
      const done = s.status !== 'waiting';
      stopPins.current.push(createPin(g, map, {
        lat: s.lat, lng: s.lng, glyph: String(s.order), caption: s.fullname,
        color: done ? '#6b7280' : '#2F80ED', dimmed: done, title: `${s.order}. ${s.fullname} (${s.status})`,
      }));
    }
    if (plan.school && isValidPoint(plan.school.lat, plan.school.lng)) {
      stopPins.current.push(createPin(g, map, {
        lat: plan.school.lat, lng: plan.school.lng, glyph: 'School', caption: plan.school.name,
        color: '#10b981', z: 8,
      }));
    }
  }, [map, g, plan]);

  // Full cleanup on unmount.
  useEffect(() => () => {
    vanHandles.current.forEach((h) => h.remove());
    vanHandles.current.clear();
    stopPins.current.forEach((p) => p.remove());
    stopPins.current = [];
    trailLine.current?.setMap(null);
    planLine.current?.setMap(null);
    trailLine.current = planLine.current = null;
  }, []);

  const recenter = () => {
    userMoved.current = false;
    setShowRecenter(false);
    fit(!!selectedId);
  };

  return (
    <div className="w-full h-full relative">
      <div ref={divRef} className="w-full h-full" />
      {map && (
        <button
          onClick={recenter}
          className={`absolute top-3 end-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-md border transition ${
            showRecenter ? 'bg-[#1B3B69] text-white border-[#1B3B69]' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Crosshair size={13} /> Re-center
        </button>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-50 text-center px-6">
          <MapPin size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">Couldn&apos;t load Google Maps</p>
          <p className="text-xs mt-1 opacity-70">
            {error === 'missing-key'
              ? 'NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set in this build.'
              : 'Check your Google Maps API key, referrer restrictions and billing status.'}
          </p>
        </div>
      )}
    </div>
  );
}
