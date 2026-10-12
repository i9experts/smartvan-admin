'use client';

import { useEffect, useState } from 'react';
import { Star, Calendar, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { ratingApi } from '@/lib/api';

interface RatingEntry {
  id: string;
  tripId: string;
  vanId: string;
  stars: number;
  comment?: string;
  raterRole: 'parent' | 'driver';
  raterName: string | null;
  rateeRole: 'parent' | 'driver';
  rateeName: string | null;
  createdAt: string;
}

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={14} className={i < count ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
      ))}
    </div>
  );
}

export default function RatingsPage() {
  const [rateeRole, setRateeRole] = useState<'all' | 'driver' | 'parent'>('all');
  const [minStars, setMinStars] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [ratings, setRatings] = useState<RatingEntry[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    ratingApi.getAllForSchool({
      page, limit: 10,
      rateeRole: rateeRole === 'all' ? undefined : rateeRole,
      minStars: minStars === '' ? undefined : minStars,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
      .then(res => {
        setRatings(res.data?.data ?? []);
        setPagination(res.data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 1 });
      })
      .finally(() => setLoading(false));
  }, [page, rateeRole, minStars, startDate, endDate]);

  const avg = ratings.length
    ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
          <Star size={24} /> Ratings
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Two-way trip ratings between drivers and parents, school-wide.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center">
        <select value={rateeRole} onChange={e => { setRateeRole(e.target.value as any); setPage(1); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-gray-50 outline-none">
          <option value="all">Driver & parent ratings</option>
          <option value="driver">Driver ratings only</option>
          <option value="parent">Parent ratings only</option>
        </select>
        <select value={minStars} onChange={e => { setMinStars(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-gray-50 outline-none">
          <option value="">Any rating</option>
          <option value="4">4★ and up</option>
          <option value="3">3★ and up</option>
          <option value="1">Show low ratings (1★+)</option>
        </select>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <Calendar size={15} className="text-gray-400" />
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }}
            className="text-sm text-gray-700 bg-transparent outline-none" />
          <span className="text-gray-300">→</span>
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }}
            className="text-sm text-gray-700 bg-transparent outline-none" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : ratings.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No ratings found</p>
            <p className="text-sm mt-1">Try different filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Rating</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Rated</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">By</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Comment</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.map(r => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5"><Stars count={r.stars} /></td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-gray-800">{r.rateeName || 'Unknown'}</span>
                        <span className="text-xs text-gray-400 ml-1.5">({r.rateeRole})</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {r.raterName || 'Unknown'} <span className="text-xs text-gray-400">({r.raterRole})</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate">{r.comment || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">
                        {new Date(r.createdAt).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
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
                {avg ? ` · this page avg ${avg}★` : ''}
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
