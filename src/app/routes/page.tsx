'use client';

import { useState, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, X, AlertCircle,
  MapPin, Bus, Clock, Calendar, ChevronRight,
  ArrowUp, ArrowDown, Navigation, CheckCircle2,
  Route, Eye, Loader2,
} from 'lucide-react';
import { api, vanApi, studentApi } from '@/lib/api';
import type { PickedLocation } from '@/components/MapPicker';

// Lazy load MapPicker so Google Maps script loads only when needed
const MapPicker = lazy(() => import('@/components/MapPicker'));

// ─── Types ────────────────────────────────────────────────────────────────────

interface KidStop {
  kidId: string;
  lat: number;
  long: number;
  kidName?: string;
}

interface RouteData {
  _id: string;
  title?: string;
  vanId?: string;
  tripType?: 'pick' | 'drop';
  startTime?: string;
  tripDays?: Record<string, boolean>;
  startPoint?: { lat: number; long: number; address?: string };
  endPoint?: { lat: number; long: number; address?: string };
  kidLocations?: KidStop[];
  createdAt: string;
  van?: { carNumber?: string; vehicleType?: string };
}

interface RouteForm {
  title: string;
  vanId: string;
  tripType: 'pick' | 'drop';
  startTime: string;
  tripDays: Record<string, boolean>;
  startPoint: { lat: number; long: number; address: string } | null;
  endPoint: { lat: number; long: number; address: string } | null;
  kidLocations: KidStop[];
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const EMPTY_FORM: RouteForm = {
  title: '',
  vanId: '',
  tripType: 'pick',
  startTime: '',
  tripDays: Object.fromEntries(DAYS.map(d => [d, false])),
  startPoint: null,
  endPoint: null,
  kidLocations: [],
};

const routeApi = {
  getAll: (params?: any) => api.get('/route/getRoutes', { params }),
  create: (data: any) => api.post('/route/createRoute', data),
  edit: (routeId: string, data: any) => api.post('/route/editRoute', { routeId, ...data }),
  delete: (routeId: string) => api.post('/route/deleteRouteByAdmin', { routeId }),
};

// ─── Map Trigger Button ───────────────────────────────────────────────────────

function MapTriggerButton({
  label,
  value,
  onClick,
}: {
  label: string;
  value: { lat: number; long: number; address?: string } | null;
  onClick: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 border rounded-xl text-left transition ${
          value
            ? 'border-[#1B2B6B]/40 bg-[#1B2B6B]/5'
            : 'border-gray-200 hover:border-[#1B2B6B]/30 hover:bg-gray-50'
        }`}
      >
        <MapPin size={18} className={value ? 'text-[#1B2B6B] shrink-0' : 'text-gray-400 shrink-0'} />
        <div className="flex-1 min-w-0">
          {value ? (
            <>
              <p className="text-sm font-medium text-gray-800 truncate">
                {(value as any).address ?? `${value.lat.toFixed(5)}, ${value.long.toFixed(5)}`}
              </p>
              <p className="text-xs font-mono text-gray-400">
                {value.lat.toFixed(6)}, {value.long.toFixed(6)}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Tap to pick on map</p>
          )}
        </div>
        {value && (
          <span className="text-xs text-[#1B2B6B] font-medium shrink-0">Change</span>
        )}
      </button>
    </div>
  );
}

// ─── Day Pills ────────────────────────────────────────────────────────────────

function DayPills({ days }: { days?: Record<string, boolean> }) {
  if (!days) return <span className="text-gray-400 text-xs">No schedule</span>;
  const active = DAYS.filter(d => days[d]);
  if (active.length === 0) return <span className="text-gray-400 text-xs">No days set</span>;
  if (active.length === 7) return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">Every day</span>;
  return (
    <div className="flex gap-1 flex-wrap">
      {active.map(d => (
        <span key={d} className="px-1.5 py-0.5 bg-[#1B2B6B]/10 text-[#1B2B6B] text-xs font-medium rounded">
          {DAY_LABELS[d]}
        </span>
      ))}
    </div>
  );
}

// ─── Route Detail Drawer ──────────────────────────────────────────────────────

function RouteDetailDrawer({ route, onClose, onEdit }: { route: RouteData; onClose: () => void; onEdit: () => void }) {
  const stops = route.kidLocations ?? [];
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1B2B6B]/10 rounded-xl flex items-center justify-center">
              <Route size={18} className="text-[#1B2B6B]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{route.title ?? 'Untitled Route'}</h2>
              <p className="text-xs text-gray-400">#{route._id?.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B2B6B] text-white text-xs font-medium rounded-lg">
              <Pencil size={12} /> Edit
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">Trip Type</p>
                <p className={`text-sm font-semibold ${route.tripType === 'pick' ? 'text-blue-600' : 'text-amber-600'}`}>
                  {route.tripType === 'pick' ? '🚐 Pick Up' : '🏠 Drop Off'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-400 mb-1">Start Time</p>
                <p className="text-sm font-semibold text-gray-800">
                  {route.startTime ? new Date(route.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>
              </div>
            </div>
          </div>
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Assigned Van</h4>
            {route.van || route.vanId ? (
              <div className="flex items-center gap-3 p-3 bg-[#FFB800]/10 rounded-xl">
                <Bus size={20} className="text-[#FFB800]" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{route.van?.carNumber ?? route.vanId?.slice(-8)}</p>
                  <p className="text-xs text-gray-500">{route.van?.vehicleType ?? ''}</p>
                </div>
              </div>
            ) : <p className="text-sm text-gray-400">No van assigned</p>}
          </div>
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Schedule</h4>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map(day => (
                <span key={day} className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${route.tripDays?.[day] ? 'bg-[#1B2B6B] text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {DAY_LABELS[day]}
                </span>
              ))}
            </div>
          </div>
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Route Points</h4>
            <div className="space-y-2">
              {route.startPoint && (
                <div className="flex items-center gap-3 p-2.5 bg-emerald-50 rounded-xl">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">S</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-emerald-700">Start Point</p>
                    {route.startPoint.address ? (
                      <p className="text-xs text-emerald-600">{route.startPoint.address}</p>
                    ) : (
                      <p className="text-xs font-mono text-emerald-600">{route.startPoint.lat.toFixed(6)}, {route.startPoint.long.toFixed(6)}</p>
                    )}
                  </div>
                </div>
              )}
              {route.endPoint && (
                <div className="flex items-center gap-3 p-2.5 bg-red-50 rounded-xl">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">E</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-red-700">End Point</p>
                    {route.endPoint.address ? (
                      <p className="text-xs text-red-600">{route.endPoint.address}</p>
                    ) : (
                      <p className="text-xs font-mono text-red-600">{route.endPoint.lat.toFixed(6)}, {route.endPoint.long.toFixed(6)}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="p-5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Student Stops ({stops.length})</h4>
            {stops.length === 0 ? <p className="text-sm text-gray-400">No stops added yet</p> : (
              <div className="space-y-2">
                {stops.map((stop, i) => (
                  <div key={String(stop.kidId)} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-7 h-7 bg-[#1B2B6B] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">{i + 1}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{stop.kidName ?? `Stop ${i + 1}`}</p>
                      <p className="text-xs font-mono text-gray-400">{stop.lat.toFixed(5)}, {stop.long.toFixed(5)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Route Modal ──────────────────────────────────────────────────────────────

type MapTarget = 'startPoint' | 'endPoint' | { kidId: string };

// datetime-local inputs expect local wall-clock time with no timezone info.
// Using toISOString() here would convert to UTC first, shifting the
// displayed time by the server/browser's UTC offset — this builds the
// string from local getters instead, matching what the input actually shows.
function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function RouteModal({ mode, route, vans, students, onClose, onSuccess }: {
  mode: 'add' | 'edit';
  route?: RouteData | null;
  vans: any[];
  students: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<RouteForm>(() => {
    if (route) {
      return {
        title: route.title ?? '',
        vanId: route.vanId ?? '',
        tripType: route.tripType ?? 'pick',
        startTime: route.startTime ? toLocalDatetimeInputValue(new Date(route.startTime)) : '',
        tripDays: route.tripDays ?? Object.fromEntries(DAYS.map(d => [d, false])),
        startPoint: route.startPoint ? { ...route.startPoint, lng: route.startPoint.long, address: route.startPoint.address ?? '' } as any : null,
        endPoint: route.endPoint ? { ...route.endPoint, lng: route.endPoint.long, address: route.endPoint.address ?? '' } as any : null,
        kidLocations: route.kidLocations ?? [],
      };
    }
    return EMPTY_FORM;
  });

  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'schedule' | 'stops'>('basic');

  const createMutation = useMutation({
    mutationFn: () => routeApi.create({
      title: form.title,
      vanId: form.vanId || undefined,
      tripType: form.tripType,
      startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
      tripDays: form.tripDays,
      startPoint: form.startPoint ? { lat: form.startPoint.lat, long: form.startPoint.long, address: form.startPoint.address } : undefined,
      endPoint: form.endPoint ? { lat: form.endPoint.lat, long: form.endPoint.long, address: form.endPoint.address } : undefined,
      kidLocations: form.kidLocations.map(k => ({ kidId: k.kidId, lat: k.lat, long: k.long })),
    }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => {
        const msg = e?.response?.data?.message ?? '';
        if (msg.includes('School not found') || msg.includes('school')) {
          setError('Your admin account has no school linked. Please contact your superadmin to link a school.');
        } else if (msg.includes('kidId')) {
          setError('One or more student stops are missing a location. Please pick a map location for each stop.');
        } else if (msg.includes('Van already')) {
          setError('This van is already assigned to another route. Please choose a different van.');
        } else {
          setError(msg || 'Failed to create route. Please check all fields.');
        }
      },
  });

  const editMutation = useMutation({
    mutationFn: () => routeApi.edit(route!._id, {
      title: form.title,
      vanId: form.vanId || undefined,
      tripType: form.tripType,
      startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
      tripDays: form.tripDays,
      startPoint: form.startPoint ? { lat: form.startPoint.lat, long: form.startPoint.long, address: form.startPoint.address } : undefined,
      endPoint: form.endPoint ? { lat: form.endPoint.lat, long: form.endPoint.long, address: form.endPoint.address } : undefined,
      kidLocations: form.kidLocations.map(k => ({ kidId: k.kidId, lat: k.lat, long: k.long })),
    }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => {
        const msg = e?.response?.data?.message ?? '';
        if (msg.includes('School not found') || msg.includes('school')) {
          setError('Your admin account has no school linked. Please contact your superadmin to link a school.');
        } else if (msg.includes('kidId')) {
          setError('One or more student stops are missing a location. Please pick a map location for each stop.');
        } else {
          setError(msg || 'Failed to update route.');
        }
      },
  });

  const isLoading = createMutation.isPending || editMutation.isPending;

  function handleMapConfirm(loc: PickedLocation) {
    if (!mapTarget) return;
    if (mapTarget === 'startPoint') {
      setForm(f => ({ ...f, startPoint: { lat: loc.lat, long: loc.lng, address: loc.address } as any }));
    } else if (mapTarget === 'endPoint') {
      setForm(f => ({ ...f, endPoint: { lat: loc.lat, long: loc.lng, address: loc.address } as any }));
    } else if (typeof mapTarget === 'object' && 'kidId' in mapTarget) {
      const kidId = mapTarget.kidId;
      setForm(f => ({
        ...f,
        kidLocations: f.kidLocations.map(k =>
          k.kidId === kidId ? { ...k, lat: loc.lat, long: loc.lng } : k
        ),
      }));
    }
    setMapTarget(null);
  }

  function toggleDay(day: string) {
    setForm(f => ({ ...f, tripDays: { ...f.tripDays, [day]: !f.tripDays[day] } }));
  }

  function addStop(student: any) {
    const sId = student._id || student.id; if (form.kidLocations.find(k => k.kidId === sId)) return;
    setForm(f => ({
      ...f,
      kidLocations: [...f.kidLocations, {
        kidId: sId,
        // Auto-fill from the student's saved pickup point (set via the
        // map picker in the parent/admin Add Kid flow) — falls back to
        // 0,0 (requiring a manual map pick) only if none was ever saved.
        lat: student.homeLat ?? 0,
        long: student.homeLng ?? 0,
        kidName: student.fullname,
      }],
    }));
  }

  function removeStop(kidId: string) {
    setForm(f => ({ ...f, kidLocations: f.kidLocations.filter(k => k.kidId !== kidId) }));
  }

  function moveStop(idx: number, dir: 'up' | 'down') {
    const arr = [...form.kidLocations];
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
    setForm(f => ({ ...f, kidLocations: arr }));
  }

  function handleSubmit() {
    if (!form.title.trim()) { setError('Route title is required.'); return; }
    setError('');
    mode === 'add' ? createMutation.mutate() : editMutation.mutate();
  }

  const availableStudents = students
    .filter(s => !form.kidLocations.find(k => k.kidId === (s._id || s.id)))
    .filter(s => !form.vanId || s.VanId === form.vanId);
  const TABS = [
    { key: 'basic' as const, label: 'Basic Info', icon: <Route size={13} /> },
    { key: 'schedule' as const, label: 'Schedule', icon: <Calendar size={13} /> },
    { key: 'stops' as const, label: `Stops (${form.kidLocations.length})`, icon: <MapPin size={13} /> },
  ];

  return (
    <>
      {mapTarget !== null && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl p-8 flex items-center gap-3">
              <Loader2 size={24} className="animate-spin text-[#1B2B6B]" />
              <span className="text-sm font-medium text-gray-700">Loading map…</span>
            </div>
          </div>
        }>
          <MapPicker
            title={
              mapTarget === 'startPoint' ? 'Pick Start Point' :
              mapTarget === 'endPoint' ? 'Pick End Point' :
              `Pick Stop Location`
            }
            initial={
              mapTarget === 'startPoint' && form.startPoint
                ? { lat: form.startPoint.lat, lng: form.startPoint.long }
                : mapTarget === 'endPoint' && form.endPoint
                ? { lat: form.endPoint.lat, lng: form.endPoint.long }
                : typeof mapTarget === 'object' && 'kidId' in mapTarget
                ? (() => {
                    const stop = form.kidLocations.find(k => k.kidId === (mapTarget as any).kidId);
                    return stop && stop.lat ? { lat: stop.lat, lng: stop.long } : undefined;
                  })()
                : undefined
            }
            onConfirm={handleMapConfirm}
            onClose={() => setMapTarget(null)}
          />
        </Suspense>
      )}

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl mx-4 flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{mode === 'add' ? 'Create Route' : 'Edit Route'}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
              <X size={16} />
            </button>
          </div>

          <div className="flex border-b border-gray-100 px-5">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition -mb-px ${
                  activeTab === tab.key ? 'border-[#1B2B6B] text-[#1B2B6B]' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* ── Basic Info ── */}
            {activeTab === 'basic' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Route Title *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Morning Route A"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Trip Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['pick', 'drop'] as const).map(t => (
                        <button key={t} onClick={() => setForm(f => ({ ...f, tripType: t }))}
                          className={`py-2 rounded-xl text-xs font-medium transition ${form.tripType === t ? t === 'pick' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                          {t === 'pick' ? '🚐 Pick Up' : '🏠 Drop Off'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Time</label>
                    <input type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Assign Van</label>
                  <select value={form.vanId} onChange={e => setForm(f => ({ ...f, vanId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30">
                    <option value="">No van assigned</option>
                    {vans.map(v => <option key={v._id} value={v._id}>{v.carNumber ?? v._id?.slice(-6)} {v.vehicleType ? `· ${v.vehicleType}` : ''}</option>)}
                  </select>
                </div>

                {/* Google Map pickers */}
                <MapTriggerButton
                  label="Start Point"
                  value={form.startPoint}
                  onClick={() => setMapTarget('startPoint')}
                />
                <MapTriggerButton
                  label="End Point"
                  value={form.endPoint}
                  onClick={() => setMapTarget('endPoint')}
                />
              </>
            )}

            {/* ── Schedule ── */}
            {activeTab === 'schedule' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-3">Active Days</label>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map(day => (
                    <button key={day} onClick={() => toggleDay(day)}
                      className={`flex flex-col items-center py-3 rounded-xl text-xs font-medium transition ${form.tripDays[day] ? 'bg-[#1B2B6B] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      <span>{DAY_LABELS[day]}</span>
                      {form.tripDays[day] && <CheckCircle2 size={12} className="mt-1" />}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => setForm(f => ({ ...f, tripDays: Object.fromEntries(DAYS.map(d => [d, true])) }))}
                    className="px-3 py-1.5 text-xs font-medium bg-[#1B2B6B]/10 text-[#1B2B6B] rounded-lg hover:bg-[#1B2B6B]/20 transition">Select All</button>
                  <button onClick={() => setForm(f => ({ ...f, tripDays: Object.fromEntries(DAYS.map(d => [d, false])) }))}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">Clear All</button>
                  <button onClick={() => setForm(f => ({ ...f, tripDays: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false } }))}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">Weekdays</button>
                </div>
              </div>
            )}

            {/* ── Stops ── */}
            {activeTab === 'stops' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Add Student Stop</label>
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 rounded-xl p-2">
                    {!form.vanId ? (
                      <p className="text-xs text-gray-400 text-center py-2">Select a van in Basic Info first — only students assigned to that van will appear here.</p>
                    ) : availableStudents.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">No unassigned students found for this van. Assign students to it from Student Management first.</p>
                    ) : (
                      availableStudents.map(s => (
                        <button key={s._id} onClick={() => addStop(s)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1B2B6B]/5 text-left transition">
                          <div className="w-6 h-6 rounded-full bg-[#1B2B6B]/10 flex items-center justify-center text-[#1B2B6B] text-xs font-bold shrink-0">
                            {s.fullname?.charAt(0) ?? '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{s.fullname}</p>
                            <p className="text-xs text-gray-400">Grade {s.grade}</p>
                          </div>
                          <Plus size={14} className="text-[#1B2B6B] shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {form.kidLocations.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-600">Stop Order & Locations</label>
                    {form.kidLocations.map((stop, i) => (
                      <div key={stop.kidId} className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 bg-[#1B2B6B] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">{i + 1}</span>
                          <p className="text-sm font-medium text-gray-800 flex-1">{stop.kidName ?? stop.kidId?.slice(-6)}</p>
                          <div className="flex gap-1">
                            <button onClick={() => moveStop(i, 'up')} disabled={i === 0} className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-30">
                              <ArrowUp size={12} />
                            </button>
                            <button onClick={() => moveStop(i, 'down')} disabled={i === form.kidLocations.length - 1} className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-30">
                              <ArrowDown size={12} />
                            </button>
                            <button onClick={() => removeStop(stop.kidId)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 text-red-400">
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => setMapTarget({ kidId: stop.kidId })}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition ${
                            stop.lat ? 'border-[#1B2B6B]/30 bg-[#1B2B6B]/5' : 'border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <MapPin size={14} className={stop.lat ? 'text-[#1B2B6B]' : 'text-gray-400'} />
                          {stop.lat ? (
                            <span className="text-xs font-mono text-gray-600">{stop.lat.toFixed(5)}, {stop.long.toFixed(5)}</span>
                          ) : (
                            <span className="text-xs text-gray-400">Tap to pick location on map</span>
                          )}
                          {stop.lat && <span className="text-xs text-[#1B2B6B] font-medium ml-auto">Change</span>}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs">
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>

          <div className="p-5 border-t border-gray-100 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
            <button onClick={handleSubmit} disabled={isLoading}
              className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] transition disabled:opacity-50">
              {isLoading ? 'Saving…' : mode === 'add' ? 'Create Route' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ title, onConfirm, onCancel, loading }: { title: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 mx-4 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Route?</h3>
        <p className="text-sm text-gray-500 mb-6">"{title}" will be permanently removed.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition disabled:opacity-50">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoutesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<RouteData | null>(null);
  const [detailRoute, setDetailRoute] = useState<RouteData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RouteData | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['routes', typeFilter],
    queryFn: () => routeApi.getAll({ tripType: typeFilter || undefined }),
    select: (r: any) => {
      const raw = r.data?.data ?? [];
      // API returns array of { routes: [...], van: {...}, createdAt }
      // Flatten all routes from all van groups
      const allRoutes: any[] = [];
      raw.forEach((group: any) => {
        if (group.routes) {
          group.routes.forEach((route: any) => {
            allRoutes.push({
              _id: route.id,
              title: route.title || 'Untitled Route',
              tripType: route.tripType,
              startTime: route.startTime,
              tripDays: route.tripDays,
              startPoint: route.startPoint,
              endPoint: route.endPoint,
              kidLocations: route.kidLocations ?? [],
              createdAt: group.createdAt,
              van: group.van,
              vanId: group.van?.id,
            });
          });
        }
      });
      return allRoutes;
    },
    staleTime: 30_000,
  });

  const { data: vans = [] } = useQuery({
    queryKey: ['vans-for-routes'],
    queryFn: () => vanApi.getByAdmin({ page: 1, limit: 100 }),
    select: (r: any) => {
      const raw = r.data?.data ?? [];
      return raw.map((item: any) => ({
        _id: item.van?.id,
        carNumber: item.van?.carNumber ?? '',
        vehicleType: item.van?.vehicleType ?? '',
        status: item.van?.status ?? 'inactive',
      }));
    },
    staleTime: 120_000,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-for-routes'],
    queryFn: () => studentApi.getAll({ page: 1, limit: 500 }),
    select: (r: any) => (r.data?.data ?? []).map((item: any) => ({
      _id: item.student?.id,
      fullname: item.student?.fullname,
      grade: item.student?.grade,
      VanId: item.van?.id,
      homeAddress: item.student?.homeAddress,
      homeLat: item.student?.homeLat,
      homeLng: item.student?.homeLng,
    })),
    staleTime: 120_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (routeId: string) => routeApi.delete(routeId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['routes'] }); setDeleteTarget(null); },
    onError: (e: any) => alert(e?.response?.data?.message ?? 'Failed to delete route. Please try again.'),
  });

  const routes: RouteData[] = Array.isArray(data) ? data : [];
  const filtered = routes.filter(r => !search || r.title?.toLowerCase().includes(search.toLowerCase()));

  function openEdit(route: RouteData) {
    setDetailRoute(null);
    setEditTarget(route);
    setModal('edit');
  }

  return (
    <>
      {modal && (
        <RouteModal
          mode={modal}
          route={editTarget}
          vans={vans}
          students={students}
          onClose={() => { setModal(null); setEditTarget(null); }}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['routes'] })}
        />
      )}
      {detailRoute && (
        <RouteDetailDrawer
          route={detailRoute}
          onClose={() => setDetailRoute(null)}
          onEdit={() => openEdit(detailRoute)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          title={deleteTarget.title ?? 'this route'}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Route Planner</h1>
            <p className="text-sm text-gray-400 mt-0.5">{filtered.length} route{filtered.length !== 1 ? 's' : ''} configured</p>
          </div>
          <button onClick={() => { setEditTarget(null); setModal('add'); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2B6B] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition">
            <Plus size={16} /> Create Route
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search routes…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
          </div>
          <div className="flex gap-2">
            {[{ value: '', label: 'All' }, { value: 'pick', label: '🚐 Pick Up' }, { value: 'drop', label: '🏠 Drop Off' }].map(f => (
              <button key={f.value} onClick={() => setTypeFilter(f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${typeFilter === f.value ? 'bg-[#1B2B6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
                <div className="h-8 bg-gray-100 rounded mb-3" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Navigation size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">{search ? 'No routes match your search.' : 'No routes yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(route => (
              <div key={route._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#1B2B6B]/20 transition-all group">
                <div className="p-4 border-b border-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{route.title ?? 'Untitled Route'}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${route.tripType === 'pick' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>
                          {route.tripType === 'pick' ? '🚐 Pick Up' : '🏠 Drop Off'}
                        </span>
                        {route.startTime && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={11} />
                            {new Date(route.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => setDetailRoute(route)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                        <Eye size={13} />
                      </button>
                      <button onClick={() => openEdit(route)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(route)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Bus size={14} className="text-[#FFB800] shrink-0" />
                    <span className="text-xs text-gray-600">{route.van?.carNumber ?? (route.vanId ? route.vanId?.slice(-8) : 'No van assigned')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-[#1B2B6B] shrink-0" />
                    <span className="text-xs text-gray-600">{route.kidLocations?.length ?? 0} student stop{(route.kidLocations?.length ?? 0) !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar size={14} className="text-gray-400 shrink-0 mt-0.5" />
                    <DayPills days={route.tripDays} />
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition rounded-b-2xl" onClick={() => setDetailRoute(route)}>
                  <span className="text-xs text-gray-400">Created {new Date(route.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-[#1B2B6B] transition" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
