'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight, History } from 'lucide-react';
import { adminTripApi, routeApi, vanApi } from '@/lib/api';
import { formatDistance, formatDuration, pktDate, pktTime, pktYmd } from '@/lib/geo';

export interface CompletedTrip {
  id: string;
  routeName: string;
  tripType: 'pick' | 'drop';
  date: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  studentCount: number;
  pickedCount: number;
  droppedCount: number;
  absentCount: number;
  noShowCount: number;
  driverName: string;
  vanNumber: string;
}

const LIMIT = 20;
const selectCls = 'h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B3B69]/20';

export default function TripHistoryPage() {
  const router = useRouter();
  const today = pktYmd();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [driverId, setDriverId] = useState('');
  const [vanId, setVanId] = useState('');
  const [routeId, setRouteId] = useState('');
  const [tripType, setTripType] = useState<'' | 'pick' | 'drop'>('');
  const [page, setPage] = useState(1);

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(1); };
  const rangeInvalid = !!from && !!to && from > to;

  // Filter options.
  const { data: drivers = [] } = useQuery({
    queryKey: ['th-drivers'],
    queryFn: () => vanApi.getDrivers({ page: 1, limit: 100 }),
    select: (r: any): { _id: string; fullname: string }[] => r.data?.data ?? [],
    staleTime: 5 * 60_000,
  });
  const { data: vans = [] } = useQuery({
    queryKey: ['th-vans'],
    queryFn: () => vanApi.getByAdmin({ page: 1, limit: 100 }),
    select: (r: any): { id: string; carNumber: string }[] =>
      (r.data?.data ?? []).map((i: any) => ({ id: i.van?.id, carNumber: i.van?.carNumber })).filter((v: any) => v.id),
    staleTime: 5 * 60_000,
  });
  const { data: routes = [] } = useQuery({
    queryKey: ['th-routes'],
    queryFn: () => routeApi.getAll(),
    select: (r: any): { id: string; title: string }[] => {
      const out: { id: string; title: string }[] = [];
      for (const grp of r.data?.data ?? []) for (const rt of grp.routes ?? []) if (rt.id) out.push({ id: rt.id, title: rt.title || 'Untitled Route' });
      return out;
    },
    staleTime: 5 * 60_000,
  });

  const params = useMemo(() => ({
    from: from || undefined, to: to || undefined,
    driverId: driverId || undefined, vanId: vanId || undefined, routeId: routeId || undefined,
    tripType: tripType || undefined, page, limit: LIMIT,
  }), [from, to, driverId, vanId, routeId, tripType, page]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['admin-trips-completed', params],
    queryFn: async () => (await adminTripApi.getCompleted(params)).data?.data as { items: CompletedTrip[]; total: number; page: number; limit: number; hasMore: boolean },
    enabled: !rangeInvalid,
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1B3B69] flex items-center justify-center"><History size={20} className="text-[#FEC610]" /></div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Trip History</h1>
          <p className="text-xs text-gray-500">Completed trips · times in Pakistan Standard Time</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-wrap items-end gap-3">
        <label className="text-xs text-gray-500 flex flex-col gap-1">From
          <input type="date" className={selectCls} value={from} max={to || undefined} onChange={(e) => resetPage(setFrom)(e.target.value)} />
        </label>
        <label className="text-xs text-gray-500 flex flex-col gap-1">To
          <input type="date" className={selectCls} value={to} min={from || undefined} onChange={(e) => resetPage(setTo)(e.target.value)} />
        </label>
        <label className="text-xs text-gray-500 flex flex-col gap-1">Driver
          <select className={selectCls} value={driverId} onChange={(e) => resetPage(setDriverId)(e.target.value)}>
            <option value="">All drivers</option>
            {drivers.map((d) => <option key={d._id} value={d._id}>{d.fullname}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-500 flex flex-col gap-1">Van
          <select className={selectCls} value={vanId} onChange={(e) => resetPage(setVanId)(e.target.value)}>
            <option value="">All vans</option>
            {vans.map((v) => <option key={v.id} value={v.id}>{v.carNumber}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-500 flex flex-col gap-1">Route
          <select className={selectCls} value={routeId} onChange={(e) => resetPage(setRouteId)(e.target.value)}>
            <option value="">All routes</option>
            {routes.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-500 flex flex-col gap-1">Type
          <select className={selectCls} value={tripType} onChange={(e) => resetPage(setTripType)(e.target.value as any)}>
            <option value="">Pick &amp; drop</option>
            <option value="pick">Pick</option>
            <option value="drop">Drop</option>
          </select>
        </label>
        <button
          onClick={() => { setFrom(today); setTo(today); setDriverId(''); setVanId(''); setRouteId(''); setTripType(''); setPage(1); }}
          className="h-9 px-3 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
        >Reset</button>
      </div>

      {rangeInvalid && <p className="text-sm text-red-500">&quot;From&quot; must be on or before &quot;To&quot;.</p>}

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr className="text-start">
                {['Date', 'Route', 'Type', 'Driver', 'Van', 'Start – End', 'Duration', 'Distance', 'Picked', 'Dropped', 'Absent'].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium text-start whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={isFetching && !isLoading ? 'opacity-60 transition-opacity' : ''}>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={11} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              ) : isError ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-red-500">
                  <AlertTriangle className="mx-auto mb-2" size={22} />
                  <p className="text-sm font-medium">Couldn&apos;t load trips</p>
                  <button onClick={() => refetch()} className="mt-2 text-xs underline">Try again</button>
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                  <History className="mx-auto mb-2 opacity-30" size={26} />
                  <p className="text-sm">No completed trips for these filters</p>
                </td></tr>
              ) : items.map((t) => (
                <tr key={t.id} onClick={() => router.push(`/trip-history/${t.id}`)} className="border-t border-gray-50 hover:bg-[#1B3B69]/[0.03] cursor-pointer">
                  <td className="px-4 py-3 whitespace-nowrap">{pktDate(t.endedAt ?? t.date)}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.routeName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${t.tripType === 'pick' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                      {t.tripType === 'pick' ? 'Pick' : 'Drop'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{t.driverName || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{t.vanNumber || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{pktTime(t.startedAt)} – {pktTime(t.endedAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDuration(t.durationSeconds)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDistance(t.distanceMeters)}</td>
                  <td className="px-4 py-3 text-emerald-700 font-medium">{t.pickedCount}</td>
                  <td className="px-4 py-3 text-[#1B3B69] font-medium">{t.droppedCount}</td>
                  <td className="px-4 py-3 text-red-600 font-medium">{(t.absentCount ?? 0) + (t.noShowCount ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
          <span>{total} trip{total === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 rtl:rotate-180"><ChevronLeft size={14} /></button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={!data?.hasMore} onClick={() => setPage((p) => p + 1)} className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 rtl:rotate-180"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
