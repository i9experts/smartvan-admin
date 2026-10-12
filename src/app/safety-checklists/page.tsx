'use client';

import { Fragment, useEffect, useState } from 'react';
import {
  ClipboardCheck, CheckCircle2, AlertTriangle, Clock, Bus,
  Calendar, ChevronLeft, ChevronRight, ShieldAlert,
} from 'lucide-react';
import { checklistApi } from '@/lib/api';

interface ComplianceSummary {
  date: string;
  activeVanCount: number;
  submittedCount: number;
  pendingCount: number;
  flaggedCount: number;
  vansNotSubmitted: { vanId: string; carNumber: string | null; driverId: string | null; driverName: string | null }[];
  flaggedChecklists: { vanId: string; driverId: string; issues: { key: string; label: string; note: string | null }[] }[];
}

interface ChecklistLogEntry {
  id: string;
  date: string;
  vanId: string;
  carNumber: string | null;
  driverId: string;
  driverName: string | null;
  allOk: boolean;
  items: { key: string; ok: boolean; note?: string; label: string }[];
  photoUrl: string | null;
  submittedAt: string;
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

export default function SafetyChecklistsPage() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [startDate, setStartDate] = useState(getToday());
  const [endDate, setEndDate] = useState(getToday());
  const [status, setStatus] = useState<'all' | 'ok' | 'issues'>('all');
  const [page, setPage] = useState(1);
  const [log, setLog] = useState<ChecklistLogEntry[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [logLoading, setLogLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    checklistApi.getComplianceSummary()
      .then(res => setSummary(res.data?.data ?? null))
      .finally(() => setSummaryLoading(false));
  }, []);

  useEffect(() => {
    setLogLoading(true);
    checklistApi.getLog({
      page, limit: 10, startDate, endDate,
      status: status === 'all' ? undefined : status,
    })
      .then(res => {
        setLog(res.data?.data ?? []);
        setPagination(res.data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 1 });
      })
      .finally(() => setLogLoading(false));
  }, [page, startDate, endDate, status]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
          <ClipboardCheck size={24} /> Safety Checklists
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          The pre-trip vehicle check every driver completes before starting a route — so everything is safe for the children before the van leaves.
        </p>
      </div>

      {/* Today's compliance */}
      {summaryLoading ? (
        <div className="text-center py-10 text-gray-400">Loading today's compliance…</div>
      ) : summary && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Active Vans', value: summary.activeVanCount, color: '#1B3B69', icon: <Bus size={18} /> },
              { label: 'Submitted Today', value: summary.submittedCount, color: '#10b981', icon: <CheckCircle2 size={18} /> },
              { label: 'Pending', value: summary.pendingCount, color: '#f59e0b', icon: <Clock size={18} /> },
              { label: 'Flagged', value: summary.flaggedCount, color: '#ef4444', icon: <AlertTriangle size={18} /> },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">{s.label}</span>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.color + '15' }}>
                    <div style={{ color: s.color }}>{s.icon}</div>
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Vans not submitted — safety-critical, shown prominently */}
          {summary.vansNotSubmitted.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
              <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-3">
                <Clock size={15} /> Vans that haven't submitted today's checklist ({summary.vansNotSubmitted.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {summary.vansNotSubmitted.map(v => (
                  <div key={v.vanId} className="bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs">
                    <span className="font-semibold text-gray-700">{v.carNumber || 'Unknown van'}</span>
                    <span className="text-gray-400"> · {v.driverName || 'No driver'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flagged today */}
          {summary.flaggedChecklists.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 mb-5">
              <h3 className="text-sm font-semibold text-red-800 flex items-center gap-2 mb-3">
                <ShieldAlert size={15} /> Issues reported today ({summary.flaggedChecklists.length})
              </h3>
              <div className="space-y-2">
                {summary.flaggedChecklists.map((c, i) => (
                  <div key={i} className="bg-white border border-red-200 rounded-xl px-3 py-2 text-xs text-gray-600">
                    {c.issues.map(iss => iss.label + (iss.note ? ` (${iss.note})` : '')).join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

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
        <select value={status} onChange={e => { setStatus(e.target.value as any); setPage(1); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-gray-50 outline-none">
          <option value="all">All submissions</option>
          <option value="ok">OK only</option>
          <option value="issues">Issues only</option>
        </select>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {logLoading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : log.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ClipboardCheck size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No checklists in this range</p>
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
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Submitted</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody>
                  {log.map(entry => (
                    <Fragment key={entry.id}>
                      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5 text-gray-600">{entry.date}</td>
                        <td className="px-5 py-3.5 font-semibold text-gray-800">{entry.carNumber || '—'}</td>
                        <td className="px-5 py-3.5 text-gray-600">{entry.driverName || '—'}</td>
                        <td className="px-5 py-3.5">
                          {entry.allOk ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                              <CheckCircle2 size={11} /> OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              <AlertTriangle size={11} /> Issues
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs">
                          {new Date(entry.submittedAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                            className="text-xs font-medium text-[#1B3B69] hover:underline"
                          >
                            {expanded === entry.id ? 'Hide' : 'Details'}
                          </button>
                        </td>
                      </tr>
                      {expanded === entry.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              {entry.items.map(item => (
                                <span
                                  key={item.key}
                                  className={`text-xs px-2.5 py-1 rounded-lg ${item.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                                >
                                  {item.ok ? '✓' : '✗'} {item.label}{item.note ? ` — ${item.note}` : ''}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
