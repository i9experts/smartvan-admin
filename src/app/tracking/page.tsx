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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Trip {
  _id: string;
  status: 'start' | 'ongoing' | 'end';
  driverId: string;
  vanId: string;
  locations: Array<{ lat: number; long: number; time: string }>;
  createdAt: string;
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
  return res.data?.data ?? [];
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://72.61.119.165:3002';

function useSocket(token: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
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

// ─── Simple Map Placeholder (until Mapbox/Google Maps is configured) ──────────

interface MapPlaceholderProps {
  trips: TrackedTrip[];
  selectedTripId: string | null;
  onSelectTrip: (id: string) => void;
}

function MapPlaceholder({ trips, selectedTripId, onSelectTrip }: MapPlaceholderProps) {
  // Compute bounding box of all locations
  const allLocations = trips.flatMap((t) => {
    const base = t.locations ?? [];
    const live = t.liveLocation ? [{ lat: t.liveLocation.lat, long: t.liveLocation.long }] : [];
    return [...base.slice(-1), ...live];
  });

  if (allLocations.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gradient-to-br from-slate-100 to-blue-50">
        <MapPin size={40} className="mb-3 opacity-30" />
        <p className="text-sm font-medium">No active trips to display</p>
        <p className="text-xs mt-1 opacity-60">Drivers will appear here when trips are started</p>
      </div>
    );
  }

  const lats = allLocations.map((l) => l.lat);
  const lngs = allLocations.map((l) => l.long);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;

  // Convert lat/lng to SVG canvas percentages (with padding)
  function toXY(lat: number, lng: number) {
    const x = ((lng - minLng) / lngRange) * 80 + 10;
    const y = ((maxLat - lat) / latRange) * 80 + 10; // flip y
    return { x, y };
  }

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 overflow-hidden">
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        {Array.from({ length: 10 }).map((_, i) => (
          <g key={i}>
            <line x1={`${i * 10}%`} y1="0" x2={`${i * 10}%`} y2="100%" stroke="#1B2B6B" strokeWidth="0.5" />
            <line x1="0" y1={`${i * 10}%`} x2="100%" y2={`${i * 10}%`} stroke="#1B2B6B" strokeWidth="0.5" />
          </g>
        ))}
      </svg>

      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {trips.map((trip) => {
          const pts = [...(trip.locations ?? []).slice(-20)];
          if (trip.liveLocation) pts.push({ lat: trip.liveLocation.lat, long: trip.liveLocation.long, time: '' });
          if (pts.length < 2) return null;
          const d = pts
            .map((p, i) => {
              const { x, y } = toXY(p.lat, p.long);
              return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            })
            .join(' ');
          return (
            <path
              key={trip._id}
              d={d}
              fill="none"
              stroke={selectedTripId === trip._id ? '#FFB800' : '#1B2B6B'}
              strokeWidth={selectedTripId === trip._id ? '1' : '0.5'}
              strokeDasharray="2 1"
              opacity="0.6"
            />
          );
        })}
      </svg>

      {trips.map((trip) => {
        const loc = trip.liveLocation ?? trip.locations?.slice(-1)?.[0];
        if (!loc) return null;
        const { x, y } = toXY(loc.lat, loc.long);
        const isSelected = selectedTripId === trip._id;
        return (
          <button
            key={trip._id}
            onClick={() => onSelectTrip(trip._id)}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div
              className={`relative flex items-center justify-center rounded-full transition-all ${
                isSelected
                  ? 'w-10 h-10 bg-[#FFB800] shadow-lg shadow-amber-300/50'
                  : 'w-8 h-8 bg-[#1B2B6B] shadow-md'
              }`}
            >
              <Bus size={isSelected ? 18 : 14} className="text-white" />
              {trip.liveLocation && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
              )}
            </div>
            {isSelected && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl px-3 py-2 text-xs whitespace-nowrap z-10 border border-gray-100">
                <p className="font-semibold text-gray-800">{trip.driverName ?? 'Driver'}</p>
                <p className="text-gray-400">{trip.vanNumber ?? trip._id.slice(-6)}</p>
              </div>
            )}
          </button>
        );
      })}

      {/* Map attribution note */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-400 bg-white/80 rounded px-2 py-0.5">
        Schematic view · Connect Mapbox for satellite map
      </div>
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

export default function LiveTrackingPage() {
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

  // Listen for live location updates
  useEffect(() => {
    if (!socket) return;

    const handleLocation = (data: { userId: string; location: { lat: number; long: number }; at: string }) => {
      setTrackedTrips((prev) => {
        const next = new Map(prev);
        // Find which trip this update belongs to by scanning rooms — simplified:
        // In production, backend should include tripId in the locationUpdated payload
        const entries = Array.from(next.entries()); for (const [tripId, trip] of entries) {
          next.set(tripId, {
            ...trip,
            liveLocation: data.location,
            lastSeen: data.at,
          });
          break; // for now, assume single trip per connected socket
        }
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
          <MapPlaceholder
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
