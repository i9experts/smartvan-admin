'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { Bus, Wifi, WifiOff, Users, RefreshCw, Navigation, Clock, MapPin, AlertTriangle } from 'lucide-react';
import { adminTripApi, BASE_URL } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import LiveMap, { MapPlan, MapVan } from '@/components/maps/LiveMap';
import { decodePolyline, distanceMeters, isValidPoint, pktTime } from '@/lib/geo';

// ─── Types ────────────────────────────────────────────────────────────────────

type TripStatus = 'moving' | 'stopped' | 'delayed' | 'weak_signal' | 'offline';

interface ActiveTrip {
  tripId: string;
  driverName: string;
  vanNumber: string;
  routeName: string;
  tripType: 'pick' | 'drop';
  startedAt: string;
  lastLocation: { lat: number; lng: number; heading: number | null; speed: number | null; t: string } | null;
  status: TripStatus;
  studentsOnBoard: number;
}

interface LivePoint {
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  t: string;
  status: string;
}

const STATUS_UI: Record<TripStatus, { label: string; chip: string; ring: string }> = {
  moving:      { label: 'Moving',         chip: 'bg-emerald-50 text-emerald-700', ring: '#fff' },
  stopped:     { label: 'Stopped',        chip: 'bg-gray-100 text-gray-600',      ring: '#fff' },
  delayed:     { label: 'Delayed',        chip: 'bg-amber-50 text-amber-700',     ring: '#f59e0b' },
  weak_signal: { label: 'Weak signal',    chip: 'bg-orange-50 text-orange-700',   ring: '#fb923c' },
  offline:     { label: 'Driver offline', chip: 'bg-red-50 text-red-600',         ring: '#ef4444' },
};

const OFFLINE_AFTER_MS = 4 * 60_000;  // matches backend TRACKING_LOST_MINUTES
const WEAK_AFTER_MS = 45_000;         // matches backend weak_signal threshold
const POLL_MS = 10_000;               // fallback poll while the socket is down

// Socket events can make a status stale between API polls (no event fires when a
// driver goes silent), so the age of the last fix is re-evaluated on a timer.
function effectiveStatus(trip: ActiveTrip, live: LivePoint | undefined, now: number): TripStatus {
  const lastT = live?.t ?? trip.lastLocation?.t;
  const base = (live && ['moving', 'stopped', 'delayed'].includes(live.status) ? live.status : trip.status) as TripStatus;
  if (!lastT) return base === 'offline' ? 'offline' : 'weak_signal';
  const age = now - new Date(lastT).getTime();
  if (age >= OFFLINE_AFTER_MS) return 'offline';
  if (base === 'offline') return 'offline';
  if (age >= WEAK_AFTER_MS) return 'weak_signal';
  return base;
}

// ─── Socket ───────────────────────────────────────────────────────────────────

function useAdminSocket(token: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;
    const s = io(BASE_URL, { auth: { token }, reconnectionAttempts: Infinity, reconnectionDelay: 2000, reconnectionDelayMax: 10000 });
    const onConnect = () => { setConnected(true); s.emit('joinSchoolAlerts', {}); };
    const onDisconnect = () => setConnected(false);
    const onError = (err: any) => console.error('[Tracking] Socket error:', err?.message ?? err?.msg ?? err);
    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onDisconnect);
    s.on('error', onError);
    setSocket(s);
    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onDisconnect);
      s.off('error', onError);
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [token]);

  return { socket, connected };
}

// ─── Trip card ────────────────────────────────────────────────────────────────

function TripCard({ trip, status, last, isSelected, onClick }: {
  trip: ActiveTrip; status: TripStatus; last: LivePoint | ActiveTrip['lastLocation']; isSelected: boolean; onClick: () => void;
}) {
  const ui = STATUS_UI[status];
  return (
    <button
      onClick={onClick}
      className={`w-full text-start p-3 rounded-xl transition-all ${
        isSelected ? 'bg-[#1B3B69] text-white shadow-md shadow-blue-900/20' : 'hover:bg-gray-50 border border-gray-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/20' : 'bg-[#1B3B69]/10'}`}>
          <Bus size={18} className={isSelected ? 'text-[#FEC610]' : 'text-[#1B3B69]'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-800'}`}>{trip.driverName || 'Driver'}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${ui.chip}`}>{ui.label}</span>
          </div>
          <p className={`text-xs truncate ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
            {trip.vanNumber} · {trip.routeName} · {trip.tripType === 'pick' ? 'Pick' : 'Drop'}
          </p>
          <div className={`flex items-center justify-between mt-1 text-[11px] ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
            <span className="flex items-center gap-1"><Users size={11} />{trip.studentsOnBoard}</span>
            <span className="flex items-center gap-1"><Clock size={11} />{last ? pktTime(last.t, true) : 'No fix yet'}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiveTrackingClient() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const { socket, connected } = useAdminSocket(token);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;
  const [live, setLive] = useState<Record<string, LivePoint>>({});
  const [appended, setAppended] = useState<[number, number][]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // Active trips — polled every 10 s only while the socket is down (30 s safety refresh otherwise,
  // so trips that start/finish and status changes with no socket event still show up).
  const activeQ = useQuery({
    queryKey: ['admin-active-trips'],
    queryFn: async () => (await adminTripApi.getActive()).data?.data?.items as ActiveTrip[] ?? [],
    refetchInterval: connected ? 30_000 : POLL_MS,
    staleTime: 0,
  });
  const trips = useMemo(() => activeQ.data ?? [], [activeQ.data]);

  // Drop live state of trips that finished.
  useEffect(() => {
    const ids = new Set(trips.map((t) => t.tripId));
    setLive((prev) => {
      const keys = Object.keys(prev);
      if (keys.every((k) => ids.has(k))) return prev;
      const next: Record<string, LivePoint> = {};
      for (const k of keys) if (ids.has(k)) next[k] = prev[k];
      return next;
    });
    if (selectedRef.current && activeQ.isSuccess && !ids.has(selectedRef.current)) setSelectedId(null);
  }, [trips, activeQ.isSuccess]);

  // Live socket events.
  useEffect(() => {
    if (!socket) return;
    const refetchActive = () => qc.invalidateQueries({ queryKey: ['admin-active-trips'] });

    const onLocation = (p: { tripId: string; lat: number; lng: number; heading: number | null; speed: number | null; t: string; status: string }) => {
      if (!p?.tripId || !isValidPoint(p.lat, p.lng)) return;
      setLive((prev) => {
        const old = prev[p.tripId];
        if (old && new Date(old.t) > new Date(p.t)) return prev; // out-of-order
        return { ...prev, [p.tripId]: { lat: p.lat, lng: p.lng, heading: p.heading ?? old?.heading ?? null, speed: p.speed, t: p.t, status: p.status } };
      });
      if (p.tripId === selectedRef.current) {
        setAppended((prev) => {
          const last = prev[prev.length - 1];
          if (last && distanceMeters({ lat: last[0], lng: last[1] }, p) < 2) return prev;
          const next = [...prev, [p.lat, p.lng] as [number, number]];
          return next.length > 3000 ? next.slice(-3000) : next;
        });
      }
    };
    const onNewReality = () => { refetchActive(); };

    socket.on('adminTripLocation', onLocation);
    socket.on('trackingLostAlert', onNewReality);
    socket.on('trackingRestored', onNewReality);
    socket.on('trafficDelayAlert', onNewReality);
    return () => {
      socket.off('adminTripLocation', onLocation);
      socket.off('trackingLostAlert', onNewReality);
      socket.off('trackingRestored', onNewReality);
      socket.off('trafficDelayAlert', onNewReality);
    };
  }, [socket, qc]);

  // Re-sync after the socket (re)connects — we may have missed points while it was down.
  useEffect(() => {
    if (connected) {
      qc.invalidateQueries({ queryKey: ['admin-active-trips'] });
      if (selectedRef.current) qc.invalidateQueries({ queryKey: ['admin-trip-trail', selectedRef.current] });
    }
  }, [connected, qc]);

  // Selected trip: trip room gives us `trailBackfilled` (driver uploaded offline points → reload trail).
  useEffect(() => {
    if (!socket || !selectedId) return;
    const join = () => socket.emit('joinTrip', { tripId: selectedId });
    if (socket.connected) join();
    socket.on('connect', join);
    const onBackfill = (p: { tripId: string }) => {
      if (p?.tripId === selectedId) qc.invalidateQueries({ queryKey: ['admin-trip-trail', selectedId] });
    };
    socket.on('trailBackfilled', onBackfill);
    return () => { socket.off('connect', join); socket.off('trailBackfilled', onBackfill); };
  }, [socket, selectedId, qc]);

  // Trail: initial load, then socket points are appended (or re-polled while disconnected).
  const trailQ = useQuery({
    queryKey: ['admin-trip-trail', selectedId],
    queryFn: async () => (await adminTripApi.getTrail(selectedId!)).data?.data as { polyline: string } | undefined,
    enabled: !!selectedId,
    refetchInterval: connected ? false : POLL_MS,
    staleTime: 0,
  });
  useEffect(() => { setAppended([]); }, [selectedId, trailQ.dataUpdatedAt]);
  const baseTrail = useMemo(() => decodePolyline(trailQ.data?.polyline), [trailQ.data]);
  const trail = useMemo(() => (appended.length ? [...baseTrail, ...appended] : baseTrail), [baseTrail, appended]);

  // Planned road route + stops for the selected trip.
  const planQ = useQuery({
    queryKey: ['admin-trip-plan', selectedId],
    queryFn: async () => (await adminTripApi.getRoutePlan(selectedId!)).data?.data,
    enabled: !!selectedId,
    refetchInterval: 90_000,
    staleTime: 0,
  });
  const plan: MapPlan | null = useMemo(() => {
    const d: any = planQ.data;
    if (!d) return null;
    return { stops: d.stops ?? [], school: d.school ?? null, plannedPolyline: d.plannedPath?.polyline ?? null };
  }, [planQ.data]);

  // Merge API snapshot + live socket points.
  const rows = useMemo(() => trips.map((t) => {
    const lv = live[t.tripId];
    const apiNewer = !lv || (t.lastLocation && new Date(t.lastLocation.t) > new Date(lv.t));
    const last = apiNewer ? t.lastLocation : lv;
    return { trip: t, last, status: effectiveStatus(t, lv, now) };
  }), [trips, live, now]);

  const vans: MapVan[] = useMemo(() => rows
    .filter((r) => r.last && isValidPoint(r.last.lat, r.last.lng))
    .map((r) => ({
      id: r.trip.tripId,
      lat: r.last!.lat,
      lng: r.last!.lng,
      heading: r.last!.heading ?? live[r.trip.tripId]?.heading ?? null,
      label: r.trip.vanNumber,
      ringColor: STATUS_UI[r.status].ring,
      dim: r.status === 'offline',
    })), [rows, live]);

  const selectedRow = rows.find((r) => r.trip.tripId === selectedId) ?? null;
  const onSelect = useCallback((id: string) => setSelectedId((p) => (p === id ? null : id)), []);
  const movingCount = rows.filter((r) => r.status === 'moving').length;
  const attention = rows.filter((r) => r.status === 'offline' || r.status === 'weak_signal' || r.status === 'delayed').length;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Live Tracking</h1>
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {connected ? 'Live' : 'Reconnecting — refreshing every 10 s'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={12} /> Updated {activeQ.dataUpdatedAt ? pktTime(new Date(activeQ.dataUpdatedAt).toISOString(), true) : '—'} PKT
          </span>
          <button onClick={() => activeQ.refetch()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            <RefreshCw size={12} className={activeQ.isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 flex flex-col border-e border-gray-100 bg-white">
          <div className="grid grid-cols-3 gap-2 p-4 border-b border-gray-100">
            <div className="p-2.5 bg-[#1B3B69]/5 rounded-xl text-center">
              <p className="text-[11px] text-gray-500 mb-0.5">Active</p>
              <p className="text-xl font-bold text-[#1B3B69]">{trips.length}</p>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-center">
              <p className="text-[11px] text-gray-500 mb-0.5">Moving</p>
              <p className="text-xl font-bold text-emerald-700">{movingCount}</p>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl text-center">
              <p className="text-[11px] text-gray-500 mb-0.5">Attention</p>
              <p className="text-xl font-bold text-amber-700">{attention}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeQ.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />)
            ) : activeQ.isError && !trips.length ? (
              <div className="flex flex-col items-center justify-center h-40 text-center text-red-500 px-4">
                <AlertTriangle size={24} className="mb-2" />
                <p className="text-sm font-medium">Couldn&apos;t load active trips</p>
                <button onClick={() => activeQ.refetch()} className="mt-2 text-xs underline">Try again</button>
              </div>
            ) : trips.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Navigation size={24} className="mb-2 opacity-30" />
                <p className="text-sm">No active trips</p>
              </div>
            ) : (
              rows.map((r) => (
                <TripCard key={r.trip.tripId} trip={r.trip} status={r.status} last={r.last} isSelected={selectedId === r.trip.tripId} onClick={() => onSelect(r.trip.tripId)} />
              ))
            )}
          </div>
        </div>

        <div className="flex-1 relative">
          <LiveMap vans={vans} selectedId={selectedId} onSelect={onSelect} trail={trail} plan={plan} />

          {!activeQ.isLoading && trips.length > 0 && vans.length === 0 && (
            <div className="absolute top-3 start-3 bg-white/95 rounded-lg shadow px-3 py-2 text-xs text-gray-600 flex items-center gap-2">
              <MapPin size={13} /> Waiting for the first GPS fix from active trips…
            </div>
          )}
          {!activeQ.isLoading && trips.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 pointer-events-none">
              <div className="bg-white/90 rounded-2xl px-6 py-5 shadow text-center">
                <MapPin size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No active trips to display</p>
                <p className="text-xs mt-1 opacity-70">Vans appear here when drivers start a trip</p>
              </div>
            </div>
          )}

          {selectedRow && (
            <div className="absolute bottom-4 start-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-72">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 bg-[#1B3B69] rounded-lg flex items-center justify-center shrink-0"><Bus size={16} className="text-[#FEC610]" /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{selectedRow.trip.driverName}</p>
                    <p className="text-xs text-gray-400 truncate">Van {selectedRow.trip.vanNumber} · {selectedRow.trip.routeName}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_UI[selectedRow.status].chip}`}>{STATUS_UI[selectedRow.status].label}</span>
              </div>
              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between"><span className="text-gray-400">Last update</span><span>{selectedRow.last ? `${pktTime(selectedRow.last.t, true)} PKT` : '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Speed</span><span>{selectedRow.last?.speed != null ? `${selectedRow.last.speed} km/h` : '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Started</span><span>{pktTime(selectedRow.trip.startedAt)} PKT</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Students on board</span><span>{selectedRow.trip.studentsOnBoard}</span></div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
                {trailQ.isLoading || planQ.isLoading ? <span>Loading route…</span> : null}
                {trailQ.isError && <span className="text-red-500">Trail unavailable</span>}
                {planQ.isError && <span className="text-red-500">Route plan unavailable</span>}
                {planQ.data && !(planQ.data as any).plannedPath && <span>No planned road route right now</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
