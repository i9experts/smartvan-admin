'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search, X, Phone, Mail, Users,
  ChevronLeft, ChevronRight, Eye,
  GraduationCap, Bus, CheckCircle2, XCircle,
} from 'lucide-react';
import { studentApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  _id: string;
  fullname: string;
  grade: number;
  gender: string;
  age: number;
  status: string;
  verifiedBySchool: boolean;
  VanId?: string;
  parentId: string;
  createdAt: string;
  parent?: ParentInfo;
}

interface ParentInfo {
  _id: string;
  fullname?: string;
  email: string;
  phoneNo?: string;
  address?: string;
  image?: string;
}

interface ParentRow {
  parentId: string;
  fullname?: string;
  email: string;
  phoneNo?: string;
  address?: string;
  kids: Student[];
  activeKids: number;
}

// ─── Build parent rows from students ─────────────────────────────────────────

function buildParentRows(students: Student[]): ParentRow[] {
  const map = new Map<string, ParentRow>();

  for (const s of students) {
    if (!s.parentId) continue;
    const key = s.parentId;
    if (!map.has(key)) {
      map.set(key, {
        parentId: key,
        fullname: s.parent?.fullname,
        email: s.parent?.email ?? '—',
        phoneNo: s.parent?.phoneNo,
        address: s.parent?.address,
        kids: [],
        activeKids: 0,
      });
    }
    const row = map.get(key)!;
    row.kids.push(s);
    if (s.status === 'active') row.activeKids++;
  }

  return Array.from(map.values());
}

// ─── Parent Detail Drawer ─────────────────────────────────────────────────────

function ParentDetailDrawer({ parent, onClose }: { parent: ParentRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Parent Profile</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center pt-8 pb-6 px-5 border-b border-gray-100">
          <div className="w-20 h-20 rounded-full bg-[#1B2B6B]/10 flex items-center justify-center text-[#1B2B6B] text-3xl font-bold mb-3">
            {(parent.fullname ?? parent.email)?.charAt(0)?.toUpperCase() ?? 'P'}
          </div>
          <h3 className="text-xl font-bold text-gray-900">{parent.fullname ?? 'Unknown Parent'}</h3>
          <p className="text-sm text-gray-400 mt-1">{parent.email}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-3 py-1 bg-[#1B2B6B]/10 text-[#1B2B6B] text-xs font-medium rounded-full">
              {parent.kids.length} student{parent.kids.length !== 1 ? 's' : ''}
            </span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
              {parent.activeKids} active
            </span>
          </div>
        </div>

        {/* Contact info */}
        <div className="p-5 space-y-3 border-b border-gray-100">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</h4>
          {parent.phoneNo && (
            <div className="flex items-center gap-3">
              <Phone size={14} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-sm text-gray-800">{parent.phoneNo}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Mail size={14} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-sm text-gray-800">{parent.email}</p>
            </div>
          </div>
          {parent.address && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5 text-xs">📍</span>
              <div>
                <p className="text-xs text-gray-400">Address</p>
                <p className="text-sm text-gray-800">{parent.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Linked students */}
        <div className="p-5">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Linked Students
          </h4>
          <div className="space-y-2">
            {parent.kids.map(kid => (
              <div key={kid._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-[#1B2B6B]/10 flex items-center justify-center text-[#1B2B6B] font-semibold text-xs shrink-0">
                  {kid.fullname?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{kid.fullname}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-0.5 text-xs text-gray-400">
                      <GraduationCap size={11} /> Grade {kid.grade}
                    </span>
                    {kid.VanId && (
                      <span className="flex items-center gap-0.5 text-xs text-blue-500">
                        <Bus size={11} /> Van
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  {kid.status === 'active' ? (
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  ) : (
                    <XCircle size={14} className="text-gray-300" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

export default function ParentsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailParent, setDetailParent] = useState<ParentRow | null>(null);

  // Fetch all students (with parent info populated by backend)
  const { data: studentsRaw = [], isLoading } = useQuery({
    queryKey: ['students-all-for-parents'],
    queryFn: async () => {
      const res = await studentApi.getAll({ page: 1, limit: 1000 });
      return res.data?.data ?? [];
    },
    staleTime: 60_000,
  });

  const allParents = useMemo(() => buildParentRows(studentsRaw), [studentsRaw]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allParents;
    const q = search.toLowerCase();
    return allParents.filter(
      p =>
        p.fullname?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.phoneNo?.includes(q) ||
        p.kids.some(k => k.fullname?.toLowerCase().includes(q))
    );
  }, [allParents, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      {detailParent && (
        <ParentDetailDrawer parent={detailParent} onClose={() => setDetailParent(null)} />
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parents</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {allParents.length} parent{allParents.length !== 1 ? 's' : ''} registered
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, email or student…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
          />
        </div>

        {/* Cards grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-gray-100 rounded w-full mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Users size={40} className="mb-3 opacity-30" />
            <p className="text-sm">{search ? 'No parents match your search.' : 'No parents yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map(parent => (
              <div
                key={parent.parentId}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#1B2B6B]/20 transition-all cursor-pointer group"
                onClick={() => setDetailParent(parent)}
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#1B2B6B]/10 flex items-center justify-center text-[#1B2B6B] text-lg font-bold shrink-0">
                    {(parent.fullname ?? parent.email)?.charAt(0)?.toUpperCase() ?? 'P'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {parent.fullname ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{parent.email}</p>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-1.5 mb-4">
                  {parent.phoneNo && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone size={11} className="text-gray-400 shrink-0" />
                      <span className="truncate">{parent.phoneNo}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail size={11} className="text-gray-400 shrink-0" />
                    <span className="truncate">{parent.email}</span>
                  </div>
                </div>

                {/* Kids summary */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users size={12} className="text-[#1B2B6B]" />
                    <span>
                      <span className="font-semibold text-gray-800">{parent.kids.length}</span> student{parent.kids.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex -space-x-1.5">
                    {parent.kids.slice(0, 3).map(k => (
                      <div
                        key={k._id}
                        title={k.fullname}
                        className="w-6 h-6 rounded-full bg-[#FFB800]/20 border-2 border-white flex items-center justify-center text-[8px] font-bold text-[#FFB800]"
                      >
                        {k.fullname?.charAt(0)?.toUpperCase()}
                      </div>
                    ))}
                    {parent.kids.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[8px] font-medium text-gray-500">
                        +{parent.kids.length - 3}
                      </div>
                    )}
                  </div>
                  <Eye size={14} className="text-gray-300 group-hover:text-[#1B2B6B] transition" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition ${
                      page === p ? 'bg-[#1B2B6B] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
