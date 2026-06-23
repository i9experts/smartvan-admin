'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, X, Filter, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle2, Clock, Eye,
  MessageSquare, User, Calendar, Tag, Image,
} from 'lucide-react';
import { reportApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Complaint {
  _id: string;
  parentId?: string;
  driverId?: string;
  schoolId?: string;
  kidId?: string;
  status: string;
  issueType?: string;
  description?: string;
  type?: string;
  image?: string;
  audio?: string;
  video?: string;
  adminRemarks?: string;
  dateOfIncident?: string;
  createdAt: string;
  parent?: { fullname?: string; email?: string; phoneNo?: string };
  driver?: { fullname?: string; email?: string; phoneNo?: string };
  kid?: { fullname?: string; grade?: number };
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'text-amber-700', bg: 'bg-amber-50', icon: <Clock size={11} /> },
  reviewed: { label: 'Reviewed', color: 'text-blue-700', bg: 'bg-blue-50', icon: <Eye size={11} /> },
  resolved: { label: 'Resolved', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <CheckCircle2 size={11} /> },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50', icon: <X size={11} /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span className={`flex items-center gap-1 px-2.5 py-1 ${cfg.bg} ${cfg.color} text-xs font-medium rounded-full`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

interface DetailDrawerProps {
  complaint: Complaint;
  onClose: () => void;
  onStatusChange: () => void;
}

function DetailDrawer({ complaint, onClose, onStatusChange }: DetailDrawerProps) {
  const qc = useQueryClient();
  const [newStatus, setNewStatus] = useState(complaint.status);
  const [remarks, setRemarks] = useState(complaint.adminRemarks ?? '');
  const [saving, setSaving] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () => reportApi.changeStatus(complaint._id, newStatus, remarks),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      onStatusChange();
      onClose();
    },
  });

  const reporter = complaint.parent ?? complaint.driver;
  const reporterLabel = complaint.parent ? 'Parent' : 'Driver';

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Complaint Detail</h2>
              <p className="text-xs text-gray-400">#{complaint._id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Status + Type */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <StatusBadge status={complaint.status} />
              {complaint.type && (
                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full capitalize">
                  {complaint.type}
                </span>
              )}
            </div>
            {complaint.issueType && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Tag size={13} className="text-gray-400" />
                <span className="font-medium">{complaint.issueType}</span>
              </div>
            )}
          </div>

          {/* Reporter */}
          {reporter && (
            <div className="p-5 border-b border-gray-100">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{reporterLabel}</h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1B2B6B]/10 flex items-center justify-center text-[#1B2B6B] font-bold">
                  {(reporter.fullname ?? reporter.email)?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{reporter.fullname ?? '—'}</p>
                  <p className="text-xs text-gray-400">{reporter.email}</p>
                  {reporter.phoneNo && <p className="text-xs text-gray-400">{reporter.phoneNo}</p>}
                </div>
              </div>
              {complaint.kid && (
                <div className="mt-3 flex items-center gap-2 p-2.5 bg-blue-50 rounded-xl">
                  <User size={13} className="text-blue-500" />
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Student</p>
                    <p className="text-xs text-blue-800">{complaint.kid.fullname} · Grade {complaint.kid.grade}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {complaint.description && (
            <div className="p-5 border-b border-gray-100">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Description</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{complaint.description}</p>
            </div>
          )}

          {/* Dates */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Reported</p>
                  <p className="text-xs font-medium text-gray-700">
                    {new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              {complaint.dateOfIncident && (
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Incident date</p>
                    <p className="text-xs font-medium text-gray-700">
                      {new Date(complaint.dateOfIncident).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Media */}
          {complaint.image && (
            <div className="p-5 border-b border-gray-100">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Attachment</h4>
              <a href={complaint.image} target="_blank" rel="noopener noreferrer">
                <div className="relative w-full h-40 bg-gray-100 rounded-xl overflow-hidden">
                  <img src={complaint.image} alt="Complaint attachment" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition">
                    <Image size={24} className="text-white" />
                  </div>
                </div>
              </a>
            </div>
          )}

          {/* Admin action */}
          <div className="p-5">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Admin Action</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Update Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setNewStatus(key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition ${
                        newStatus === key
                          ? `${cfg.bg} ${cfg.color} border-current`
                          : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  <MessageSquare size={11} className="inline mr-1" />
                  Remarks (optional)
                </label>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="Add admin remarks or resolution notes…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || (newStatus === complaint.status && remarks === (complaint.adminRemarks ?? ''))}
            className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] transition disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ComplaintsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Complaint | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['complaints', page, statusFilter],
    queryFn: () => reportApi.getByAdmin({ page, limit: 10, status: statusFilter || undefined }),
    select: r => r.data,
    staleTime: 30_000,
  });

  const complaints: Complaint[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  // Client-side search filter
  const filtered = search.trim()
    ? complaints.filter(c =>
        c.issueType?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase()) ||
        c._id.includes(search)
      )
    : complaints;

  return (
    <>
      {selected && (
        <DetailDrawer
          complaint={selected}
          onClose={() => setSelected(null)}
          onStatusChange={() => setSelected(null)}
        />
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Complaints</h1>
            <p className="text-sm text-gray-400 mt-0.5">{total} total complaint{total !== 1 ? 's' : ''}</p>
          </div>
          {/* Status summary */}
          <div className="flex items-center gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => { setStatusFilter(statusFilter === key ? '' : key); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  statusFilter === key ? `${cfg.bg} ${cfg.color}` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by issue or ID…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Issue</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Reporter</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="p-4 w-16" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 animate-pulse">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="p-4"><div className="h-4 bg-gray-100 rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <AlertTriangle size={32} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-sm text-gray-400">{search ? 'No complaints match your search.' : 'No complaints found.'}</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(complaint => (
                    <tr
                      key={complaint._id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition cursor-pointer"
                      onClick={() => setSelected(complaint)}
                    >
                      <td className="p-4">
                        <span className="text-xs font-mono text-gray-400">#{complaint._id.slice(-8).toUpperCase()}</span>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-medium text-gray-800">{complaint.issueType ?? 'General Issue'}</p>
                        {complaint.description && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-[200px]">{complaint.description}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-700">
                          {complaint.parent?.fullname ?? complaint.driver?.fullname ?? '—'}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">
                          {complaint.parent ? 'Parent' : complaint.driver ? 'Driver' : '—'}
                        </p>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full capitalize">
                          {complaint.type ?? 'General'}
                        </span>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={complaint.status} />
                      </td>
                      <td className="p-4 text-xs text-gray-400">
                        {new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="p-4">
                        <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">Page {page} of {totalPages} · {total} total</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isFetching} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || isFetching} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
