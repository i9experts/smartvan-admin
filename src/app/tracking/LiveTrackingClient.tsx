'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import {
  MapPin,
  Bus,
  Wifi,
  WifiOff,
  Users,
  RefreshCw,
  Navigation,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { loadGoogleMaps } from '@/components/MapPicker';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Trip {
  _id: string;
  status: 'start' | 'ongoing' | 'end';
  driverId: string;
  vanId: string;
  locations: Array<{ lat: number; long: number; time: string }>;
  createdAt: string;
  van?: { _id?: string; carNumber?: string; vehicleType?: string };
  driver?: { _id?: string; fullname?: string; phoneNo?: string };
  route?: { _id?: string; title?: string; tripType?: string };
  schoolName?: string;
  kids?: Array<{ kidId?: string; fullname?: string; image?: string; status?: string }>;
}

interface LiveLocation {
  tripId: string;
  location: { lat: number; long: number };
  at: string;
}

interface TrackedTrip extends Trip {
  liveLocation?: LiveLocation['location'];
  lastSeen?: string;
  driverName?: string;
  vanNumber?: string;
  kidCount?: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchActiveTrips(): Promise<Trip[]> {
  const res = await api.get('/trips/Get-Trips-By-Admin?page=1&limit=50&status=ongoing');
  const raw: Trip[] = res.data?.data ?? [];
  // The backend already joins van/driver/route/school/kids — just wasn't
  // being read here before, so every trip showed generic placeholders
  // ("Driver 1d84") instead of real names.
  return raw.map((trip) => ({
    ...trip,
    driverName: trip.driver?.fullname,
    vanNumber: trip.van?.carNumber,
    kidCount: trip.kids?.length ?? 0,
  } as any));
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.smartvan.pk';

function useSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      // Forcing websocket-only here caused a connect/disconnect loop —
      // Railway's reverse proxy doesn't always cleanly pass through raw
      // WebSocket upgrades. Letting it negotiate normally (starts on
      // polling, upgrades to websocket when possible) is the same fix
      // already applied elsewhere for this exact symptom.
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Error:', err.message);
      setConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return { socket: socketRef.current, connected };
}

// ─── Real Google Map ──────────────────────────────────────────────────────────

interface GoogleTrackingMapProps {
  trips: TrackedTrip[];
  selectedTripId: string | null;
  onSelectTrip: (id: string) => void;
}

function markerIcon(color: string, selected: boolean): any {
  const size = selected ? 44 : 36;
  // A rounded badge with a simple bus glyph — matches the same bus-icon
  // style already used for vans/drivers elsewhere in the admin panel,
  // instead of a generic map pin that doesn't read as "moving vehicle".
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>
      <g transform="translate(9.5, 10.5)" fill="#ffffff">
        <rect x="0" y="0" width="21" height="14" rx="3"/>
        <rect x="2.5" y="2.5" width="6" height="4.5" rx="1" fill="${color}"/>
        <rect x="10" y="2.5" width="6" height="4.5" rx="1" fill="${color}"/>
        <circle cx="5" cy="16.5" r="2.3" fill="${color === '#FFB800' ? '#1B2B6B' : '#FFB800'}"/>
        <circle cx="16" cy="16.5" r="2.3" fill="${color === '#FFB800' ? '#1B2B6B' : '#FFB800'}"/>
      </g>
    </svg>
  `.trim();
  const g = (window as any).google;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new g.maps.Size(size, size),
    anchor: new g.maps.Point(size / 2, size / 2),
  };
}

function GoogleTrackingMap({ trips, selectedTripId, onSelectTrip }: GoogleTrackingMapProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const hasFitBoundsRef = useRef(false);

  // Load the script + init the map once.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapDivRef.current) return;
        const g = (window as any).google;
        mapRef.current = new g.maps.Map(mapDivRef.current, {
          center: { lat: 24.8607, lng: 67.0011 }, // Karachi default
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
        });
        setReady(true);

        // Google Maps can end up thinking its container is 0x0 if it
        // initializes before the surrounding flex layout has settled
        // (a well-known React timing issue) — the map then renders
        // completely blank with no error. Forcing a resize once layout
        // has actually painted, and again on any later container
        // resize, fixes this reliably.
        requestAnimationFrame(() => {
          if (!mapRef.current) return;
          g.maps.event.trigger(mapRef.current, 'resize');
          mapRef.current.setCenter({ lat: 24.8607, lng: 67.0011 });
        });
      })
      .catch(() => setLoadError(true));
    return () => { cancelled = true; };
  }, []);

  // Re-trigger a resize whenever the map container's actual size changes
  // (e.g. sidebar collapse/expand, window resize) — without this the map
  // can stay visually "stuck" at whatever size it first measured.
  useEffect(() => {
    if (!mapDivRef.current) return;
    const observer = new ResizeObserver(() => {
      if (!mapRef.current) return;
      const g = (window as any).google;
      g.maps.event.trigger(mapRef.current, 'resize');
    });
    observer.observe(mapDivRef.current);
    return () => observer.disconnect();
  }, [ready]);

  // Sync markers whenever trips change.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as any).google;
    const map = mapRef.current;
    const seen = new Set<string>();

    trips.forEach((trip) => {
      const loc = trip.liveLocation ?? trip.locations?.slice(-1)?.[0];
      if (!loc) return;
      seen.add(trip._id);
      const position = { lat: loc.lat, lng: loc.long };
      const isSelected = selectedTripId === trip._id;
      const color = isSelected ? '#FFB800' : '#1B2B6B';

      let marker = markersRef.current.get(trip._id);
      if (!marker) {
        marker = new g.maps.Marker({
          position,
          map,
          icon: markerIcon(color, isSelected),
          title: trip.driverName ?? 'Driver',
        });
        marker.addListener('click', () => onSelectTrip(trip._id));
        markersRef.current.set(trip._id, marker);
      } else {
        marker.setPosition(position);
        marker.setIcon(markerIcon(color, isSelected));
      }
    });

    // Remove markers for trips no longer present.
    for (const [tripId, marker] of Array.from(markersRef.current.entries())) {
      if (!seen.has(tripId)) {
        marker.setMap(null);
        markersRef.current.delete(tripId);
      }
    }

    // Fit bounds once, the first time we have real positions — don't
    // keep re-fitting on every subsequent live update, or the map would
    // constantly yank the admin's view around while watching a trip.
    if (!hasFitBoundsRef.current && seen.size > 0) {
      const bounds = new g.maps.LatLngBounds();
      markersRef.current.forEach((m) => { const pos = m.getPosition(); if (pos) bounds.extend(pos); });
      map.fitBounds(bounds, 80);
      hasFitBoundsRef.current = true;
    }
  }, [trips, selectedTripId, ready, onSelectTrip]);

  const hasAnyLiveTrip = trips.filter((t) => t.liveLocation || t.locations?.length).length > 0;

  // The map div must always be in the DOM from the very first render —
  // this component used to conditionally return a placeholder instead of
  // the map div whenever there was no trip data yet, and since the trips
  // list is empty on first mount (before the query resolves), the one-time
  // effect that creates the Google Map ran while mapDivRef was still null
  // and gave up. By the time real trip data arrived and the map div
  // finally existed, nothing was left to retry creating the map into it.
  // Overlaying the placeholder on top (instead of replacing the div)
  // keeps mapDivRef permanently attached so map creation always succeeds.
  return (
    <div className="w-full h-full relative">
      <div ref={mapDivRef} className="w-full h-full" />

      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
          <MapPin size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">Couldn&apos;t load Google Maps</p>
          <p className="text-xs mt-1 opacity-60">Check your Google Maps API key / billing status</p>
        </div>
      )}

      {!loadError && !hasAnyLiveTrip && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-slate-100 to-blue-50 pointer-events-none">
          <MapPin size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">No active trips to display</p>
          <p className="text-xs mt-1 opacity-60">Drivers will appear here when trips are started</p>
        </div>
      )}
    </div>
  );
}

// ─── Trip List Item ───────────────────────────────────────────────────────────

function TripItem({
  trip,
  isSelected,
  onClick,
  isLive,
}: {
  trip: TrackedTrip;
  isSelected: boolean;
  onClick: () => void;
  isLive: boolean;
}) {
  const lastLocation = trip.liveLocation ?? trip.locations?.slice(-1)?.[0];
  const lastSeen = trip.lastSeen
    ? new Date(trip.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl transition-all ${
        isSelected
          ? 'bg-[#1B2B6B] text-white shadow-md shadow-blue-900/20'
          : 'hover:bg-gray-50 border border-gray-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isSelected ? 'bg-white/20' : 'bg-[#1B2B6B]/10'
          }`}
        >
          <Bus size={18} className={isSelected ? 'text-white' : 'text-[#1B2B6B]'} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-800'}`}>
              {trip.driverName ?? `Driver ${trip._id.slice(-4)}`}
            </p>
            {isLive && (
              <span className="flex items-center gap-0.5 shrink-0">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className={`text-[10px] font-medium ${isSelected ? 'text-emerald-300' : 'text-emerald-600'}`}>
                  LIVE
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {lastLocation && (
              <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                {lastLocation.lat.toFixed(4)}, {lastLocation.long.toFixed(4)}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {lastSeen && (
            <p className={`text-xs ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>{lastSeen}</p>
          )}
          <ChevronRight size={14} className={isSelected ? 'text-white/60 ml-auto' : 'text-gray-300 ml-auto'} />
        </div>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LiveTrackingClient() {
  const { token } = useAuth();
  const { socket, connected } = useSocket(token);
  const [trackedTrips, setTrackedTrips] = useState<Map<string, TrackedTrip>>(new Map());
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: tripsData = [], isLoading, refetch } = useQuery({
    queryKey: ['active-trips'],
    queryFn: fetchActiveTrips,
    refetchInterval: 60_000,
  });

  // Initialize tracked trips from API data
  useEffect(() => {
    setTrackedTrips((prev) => {
      const next = new Map(prev);
      for (const trip of tripsData) {
        next.set(trip._id, { ...trip, ...prev.get(trip._id) });
      }
      return next;
    });
  }, [tripsData]);

  // Subscribe to all active trip rooms
  useEffect(() => {
    if (!socket || !connected) return;
    for (const trip of tripsData) {
      socket.emit('joinTrip', { tripId: trip._id });
    }
  }, [socket, connected, tripsData]);

  // Surface join/auth failures instead of failing silently — this exact
  // class of bug (admin's joinTrip rejected server-side with no visible
  // sign of it) is why the map appeared to work but never showed motion.
  useEffect(() => {
    if (!socket) return;
    const handleError = (err: { msg?: string }) => {
      console.error('[Tracking] Socket error:', err?.msg ?? err);
    };
    socket.on('error', handleError);
    return () => { socket.off('error', handleError); };
  }, [socket]);

  // Listen for live location updates
  useEffect(() => {
    if (!socket) return;

    const handleLocation = (data: { tripId?: string; userId: string; location: { lat: number; long: number }; at: string }) => {
      // Backend now includes tripId directly in the broadcast — previously
      // this blindly applied every update to whichever trip happened to be
      // first in the map, silently corrupting positions the moment two
      // vans were live at the same time.
      if (!data.tripId) return;
      setTrackedTrips((prev) => {
        if (!prev.has(data.tripId!)) return prev;
        const next = new Map(prev);
        const trip = next.get(data.tripId!)!;
        next.set(data.tripId!, {
          ...trip,
          liveLocation: data.location,
          lastSeen: data.at,
        });
        return next;
      });
      setLastRefresh(new Date());
    };

    socket.on('locationUpdated', handleLocation);
    return () => { socket.off('locationUpdated', handleLocation); };
  }, [socket]);

  const trips = Array.from(trackedTrips.values());
  const selectedTrip = selectedTripId ? trackedTrips.get(selectedTripId) : null;
  const liveCount = trips.filter((t) => t.liveLocation).length;

  const handleRefresh = useCallback(() => {
    refetch();
    setLastRefresh(new Date());
  }, [refetch]);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Live Tracking</h1>
          <span
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              connected
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
            {connected ? 'Socket Connected' : 'Disconnected'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock size={12} />
            Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 flex flex-col border-r border-gray-100 bg-white">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 p-4 border-b border-gray-100">
            <div className="p-3 bg-[#1B2B6B]/5 rounded-xl text-center">
              <p className="text-xs text-gray-500 mb-1">Active Trips</p>
              <p className="text-2xl font-bold text-[#1B2B6B]">{trips.length}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-center">
              <p className="text-xs text-gray-500 mb-1">Live Now</p>
              <p className="text-2xl font-bold text-emerald-700">{liveCount}</p>
            </div>
          </div>

          {/* Trip list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
              ))
            ) : trips.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Navigation size={24} className="mb-2 opacity-30" />
                <p className="text-sm">No active trips</p>
              </div>
            ) : (
              trips.map((trip) => (
                <TripItem
                  key={trip._id}
                  trip={trip}
                  isSelected={selectedTripId === trip._id}
                  onClick={() =>
                    setSelectedTripId((prev) => (prev === trip._id ? null : trip._id))
                  }
                  isLive={!!trip.liveLocation}
                />
              ))
            )}
          </div>
        </div>

        {/* Map area */}
        <div className="flex-1 relative">
          <GoogleTrackingMap
            trips={trips}
            selectedTripId={selectedTripId}
            onSelectTrip={(id) => setSelectedTripId((prev) => (prev === id ? null : id))}
          />

          {/* Selected trip detail panel */}
          {selectedTrip && (
            <div className="absolute bottom-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-72">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#1B2B6B] rounded-lg flex items-center justify-center">
                    <Bus size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {selectedTrip.driverName ?? 'Driver'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Van {selectedTrip.vanNumber ?? selectedTrip._id.slice(-6)}
                    </p>
                  </div>
                </div>
                {selectedTrip.liveLocation && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs text-emerald-700 font-medium">Live</span>
                  </span>
                )}
              </div>

              {selectedTrip.liveLocation && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <MapPin size={13} className="text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Current Location</p>
                      <p className="text-xs font-mono text-gray-700">
                        {selectedTrip.liveLocation.lat.toFixed(6)},{' '}
                        {selectedTrip.liveLocation.long.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  {selectedTrip.lastSeen && (
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <Clock size={13} className="text-gray-400 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Last Update</p>
                        <p className="text-xs text-gray-700">
                          {new Date(selectedTrip.lastSeen).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <Users size={13} className="text-gray-400" />
                <span className="text-xs text-gray-500">
                  {selectedTrip.kidCount ?? '?'} students on board
                </span>
                <span className="ml-auto text-xs font-medium text-[#1B2B6B] capitalize">
                  {selectedTrip.status}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
