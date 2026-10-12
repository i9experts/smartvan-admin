'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Calendar, ChevronLeft, ChevronRight, Gauge, Clock, Download } from 'lucide-react';
import { tripApi } from '@/lib/api';

interface OptimizationEntry {
  tripId: string;
  tripType: string;
  vanId: string;
  carNumber: string | null;
  driverId: string | null;
  driverName: string | null;
  requestedAt: string;
  baselineDistanceMeters: number;
  optimizedDistanceMeters: number;
  distanceSavedMeters: number;
  baselineDurationSeconds: number;
  optimizedDurationSeconds: number;
  durationSavedSeconds: number;
}

function km(meters: number) {
  return (meters / 1000).toFixed(1) + ' km';
}
function minutes(seconds: number) {
  return Math.round(seconds / 60) + ' min';
}

export default function RouteOptimizationPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<OptimizationEntry[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    tripApi.getRouteOptimizationLog({
      page, limit: 10,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
      .then(res => {
        setEntries(res.data?.data ?? []);
        setPagination(res.data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 1 });
      })
      .finally(() => setLoading(false));
  }, [page, startDate, endDate]);

  const totalDistanceSaved = entries.reduce((s, e) => s + (e.distanceSavedMeters || 0), 0);
  const totalDurationSaved = entries.reduce((s, e) => s + (e.durationSavedSeconds || 0), 0);

  const exportCSV = () => {
    const rows = [
      ['Date', 'Van', 'Driver', 'Trip Type', 'Baseline Distance (m)', 'Optimized Distance (m)', 'Distance Saved (m)', 'Baseline Duration (s)', 'Optimized Duration (s)', 'Duration Saved (s)'],
      ...entries.map(e => [
        new Date(e.requestedAt).toISOString(), e.carNumber || '', e.driverName || '', e.tripType,
        String(e.baselineDistanceMeters), String(e.optimizedDistanceMeters), String(e.distanceSavedMeters),
        String(e.baselineDurationSeconds), String(e.optimizedDurationSeconds), String(e.durationSavedSeconds),
      ]),
    ];
    const csv = rows.map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-optimization-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
            <Sparkles size={24} /> Route Optimization Log
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Individual "Optimize Route" events requested by drivers — see the Analytics page for the aggregate view.
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={!entries.length}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B3B69] text-white rounded-xl text-sm font-semibold hover:bg-[#111d4a] transition-colors disabled:opacity-40"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <Calendar size={15} className="text-gray-400" />
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }}
            className="text-sm text-gray-700 bg-transparent outline-none" />
          <span className="text-gray-300">→</span>
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }}
            className="text-sm text-gray-700 bg-transparent outline-none" />
        </div>
        {entries.length > 0 && (
          <div className="flex items-center gap-4 ml-auto text-xs text-gray-500">
            <span className="flex items-center gap-1"><Gauge size={13} className="text-emerald-500" /> {km(totalDistanceSaved)} saved this page</span>
            <span className="flex items-center gap-1"><Clock size={13} className="text-emerald-500" /> {minutes(totalDurationSaved)} saved this page</span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Sparkles size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No optimize-route events in this range</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Date</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Van</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Driver</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Trip</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Distance Saved</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Time Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.tripId + e.requestedAt} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {new Date(e.requestedAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-gray-800">{e.carNumber || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">{e.driverName || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-500 capitalize">{e.tripType}</td>
                      <td className="px-5 py-3.5">
                        <span className={e.distanceSavedMeters > 0 ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>
                          {km(e.distanceSavedMeters)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={e.durationSavedSeconds > 0 ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>
                          {minutes(e.durationSavedSeconds)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
