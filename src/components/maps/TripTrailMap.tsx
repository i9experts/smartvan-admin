'use client';

import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import { useGoogleMap } from './useGoogleMap';
import { createPin, NAVY, PinHandle } from './overlays';
import { isValidPoint } from '@/lib/geo';

interface Props {
  trail: [number, number][];
  stops: { order: number; label: string; lat: number; lng: number; title?: string }[];
  school: { name: string; lat: number; lng: number } | null;
}

/** Read-only map of a finished trip: driven trail, A/B markers, numbered stops, school. */
export default function TripTrailMap({ trail, stops, school }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const { map, g, error } = useGoogleMap(divRef);

  useEffect(() => {
    if (!map || !g) return;
    const pins: PinHandle[] = [];
    const bounds = new g.maps.LatLngBounds();
    let n = 0;
    const ext = (lat: number, lng: number) => { bounds.extend({ lat, lng }); n++; };

    const line = new g.maps.Polyline({
      map, strokeColor: NAVY, strokeOpacity: 0.9, strokeWeight: 5,
      path: trail.map(([lat, lng]) => ({ lat, lng })),
    });
    trail.forEach(([la, ln]) => ext(la, ln));

    if (trail.length > 0) {
      const [sLat, sLng] = trail[0];
      const [eLat, eLng] = trail[trail.length - 1];
      pins.push(createPin(g, map, { lat: sLat, lng: sLng, glyph: 'Start', color: '#10b981', z: 9 }));
      pins.push(createPin(g, map, { lat: eLat, lng: eLng, glyph: 'End', color: '#ef4444', z: 9 }));
    }
    for (const s of stops) {
      if (!isValidPoint(s.lat, s.lng)) continue;
      ext(s.lat, s.lng);
      pins.push(createPin(g, map, { lat: s.lat, lng: s.lng, glyph: String(s.order), caption: s.label, color: '#2F80ED', title: s.title }));
    }
    if (school && isValidPoint(school.lat, school.lng)) {
      ext(school.lat, school.lng);
      pins.push(createPin(g, map, { lat: school.lat, lng: school.lng, glyph: 'School', caption: school.name, color: '#10b981', z: 8 }));
    }
    if (n > 1) map.fitBounds(bounds, 60);
    else if (n === 1) { map.setCenter(bounds.getCenter()); map.setZoom(15); }

    return () => { line.setMap(null); pins.forEach((p) => p.remove()); };
  }, [map, g, trail, stops, school]);

  return (
    <div className="w-full h-full relative">
      <div ref={divRef} className="w-full h-full" />
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-50 text-center px-6">
          <MapPin size={36} className="mb-2 opacity-30" />
          <p className="text-sm font-medium">Couldn&apos;t load Google Maps</p>
        </div>
      )}
    </div>
  );
}
