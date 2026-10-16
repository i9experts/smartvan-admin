// Small geo + time helpers shared by Live Tracking and Trip History.

export type LatLng = { lat: number; lng: number };

/** Decode a Google-encoded polyline into [lat, lng] pairs. */
export function decodePolyline(encoded: string | null | undefined): [number, number][] {
  if (!encoded) return [];
  const out: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && index < encoded.length + 1);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta; else lng += delta;
    }
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}

export function isValidPoint(lat: unknown, lng: unknown): boolean {
  return typeof lat === 'number' && typeof lng === 'number' &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
}

export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Initial bearing a → b in degrees (0 = north). */
export function bearing(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * rad) * Math.cos(b.lat * rad);
  const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) -
    Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lng - a.lng) * rad);
  return ((Math.atan2(y, x) / rad) + 360) % 360;
}

// ─── Time (always Asia/Karachi) ───────────────────────────────────────────────

export const TZ = 'Asia/Karachi';

export function pktTime(iso?: string | null, seconds = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}), hour12: true,
  }).format(d);
}

export function pktDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

/** YYYY-MM-DD of "now" (or the given instant) in Asia/Karachi. */
export function pktYmd(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function formatDuration(seconds?: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function formatDistance(meters?: number | null): string {
  if (meters == null || !Number.isFinite(meters)) return '—';
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}
