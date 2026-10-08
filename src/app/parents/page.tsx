'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, X, Phone, Mail, Users,
  ChevronLeft, ChevronRight, Eye, Pencil, Loader2, ClipboardList, Camera,
  GraduationCap, Bus, CheckCircle2, XCircle,
} from 'lucide-react';
import { api, uploadApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkedKid {
  _id: string;
  fullname: string;
  grade?: number;
  VanId?: string;
  status: string;
}

interface ParentRow {
  _id: string;
  fullname?: string;
  email: string;
  phoneNo?: string;
  alternatePhoneNo?: string;
  address?: string;
  image?: string;
  kids: LinkedKid[];
}

interface EditParentForm {
  fullname: string;
  email: string;
  phoneNo: string;
  alternatePhoneNo: string;
  address: string;
  image?: string;
}

const parentApi = {
  getAll: (params: { page: number; limit: number; search?: string }) =>
    api.get('/Admin/getAllParents', { params }),
  edit: (parentId: string, data: EditParentForm) =>
    api.patch(`/Admin/editParentByAdmin/${parentId}`, data),
};

// ─── Build parent rows from students ─────────────────────────────────────────


// ─── Parent Detail Drawer ─────────────────────────────────────────────────────

function ParentDetailDrawer({
  parent, onClose, onEdit,
}: { parent: ParentRow; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Parent Profile</h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B3B69] border border-[#1B3B69]/20 rounded-lg hover:bg-[#1B3B69]/5 transition"
            >
              <Pencil size={12} /> Edit
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center pt-8 pb-6 px-5 border-b border-gray-100">
          <div className="w-20 h-20 rounded-full bg-[#1B3B69]/10 flex items-center justify-center text-[#1B3B69] text-3xl font-bold mb-3 overflow-hidden">
            {parent.image ? (
              <img src={parent.image} alt={parent.fullname} className="w-full h-full object-cover" />
            ) : (
              (parent.fullname ?? parent.email)?.charAt(0)?.toUpperCase() ?? 'P'
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900">{parent.fullname ?? 'Unknown Parent'}</h3>
          <p className="text-sm text-gray-400 mt-1">{parent.email}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-3 py-1 bg-[#1B3B69]/10 text-[#1B3B69] text-xs font-medium rounded-full">
              {parent.kids.length} student{parent.kids.length !== 1 ? 's' : ''}
            </span>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
              {parent.kids.filter(k => k.status === 'active').length} active
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
          {parent.alternatePhoneNo && (
            <div className="flex items-center gap-3">
              <Phone size={14} className="text-gray-300 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Alternate Phone</p>
                <p className="text-sm text-gray-800">{parent.alternatePhoneNo}</p>
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
                <div className="w-8 h-8 rounded-full bg-[#1B3B69]/10 flex items-center justify-center text-[#1B3B69] font-semibold text-xs shrink-0">
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

// ─── Edit Parent Modal ──────────────────────────────────────────────────────

function EditParentModal({
  parent, onClose, onSuccess,
}: { parent: ParentRow; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<EditParentForm>({
    fullname: parent.fullname ?? '',
    email: parent.email ?? '',
    phoneNo: parent.phoneNo ?? '',
    alternatePhoneNo: parent.alternatePhoneNo ?? '',
    address: parent.address ?? '',
    image: parent.image,
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => parentApi.edit(parent._id, form),
    onSuccess: () => onSuccess(),
    onError: (e: any) => setError(e?.response?.data?.message || 'Failed to save. Please try again.'),
  });

  async function handlePhotoSelected(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setError('Photo must be under 2MB.');
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const res = await uploadApi.image(file);
      const url = res.data?.url ?? res.data?.data?.url ?? '';
      setForm((f) => ({ ...f, image: url }));
    } catch {
      setError('Photo upload failed. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullname.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    setError('');
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Edit Parent</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex justify-center mb-1">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#1B3B69]/10 flex items-center justify-center overflow-hidden">
                {form.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image} alt="Parent" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold text-[#1B3B69]">
                    {(form.fullname || form.email).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="parent-photo-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoSelected(file);
                }}
              />
              <label
                htmlFor="parent-photo-input"
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#1B3B69] rounded-full flex items-center justify-center shadow-md cursor-pointer"
              >
                {isUploadingPhoto ? (
                  <Loader2 size={12} className="text-white animate-spin" />
                ) : (
                  <Camera size={12} className="text-white" />
                )}
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">Full Name</label>
            <input
              value={form.fullname}
              onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))}
              className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B69]/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B69]/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Phone</label>
              <input
                value={form.phoneNo}
                onChange={(e) => setForm((f) => ({ ...f, phoneNo: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B69]/30"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Alternate Phone</label>
              <input
                value={form.alternatePhoneNo}
                onChange={(e) => setForm((f) => ({ ...f, alternatePhoneNo: e.target.value }))}
                className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B69]/30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full mt-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B69]/30"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || isUploadingPhoto}
              className="flex-1 px-4 py-2.5 bg-[#1B3B69] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 12;

export default function ParentsPage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [detailParent, setDetailParent] = useState<ParentRow | null>(null);
  const [editParent, setEditParent] = useState<ParentRow | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['parents', page, search],
    queryFn: () => parentApi.getAll({ page, limit: PAGE_SIZE, search: search || undefined }),
    select: r => r.data,
    staleTime: 30_000,
  });

  const parents: ParentRow[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function handleEditSuccess() {
    queryClient.invalidateQueries({ queryKey: ['parents'] });
    setEditParent(null);
    setDetailParent(null);
  }

  return (
    <>
      {detailParent && (
        <ParentDetailDrawer
          parent={detailParent}
          onClose={() => setDetailParent(null)}
          onEdit={() => setEditParent(detailParent)}
        />
      )}
      {editParent && (
        <EditParentModal
          parent={editParent}
          onClose={() => setEditParent(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parents</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {total} parent{total !== 1 ? 's' : ''} registered
            </p>
          </div>
          <Link
            href="/parents/register"
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
          >
            <ClipboardList size={16} />
            Register Report
          </Link>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email or phone…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B69]/30"
          />
        </form>

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
        ) : parents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Users size={40} className="mb-3 opacity-30" />
            <p className="text-sm">{search ? 'No parents match your search.' : 'No parents yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {parents.map(parent => (
              <div
                key={parent._id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#1B3B69]/20 transition-all cursor-pointer group"
                onClick={() => setDetailParent(parent)}
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#1B3B69]/10 flex items-center justify-center text-[#1B3B69] text-lg font-bold shrink-0 overflow-hidden">
                    {parent.image ? (
                      <img src={parent.image} alt={parent.fullname} className="w-full h-full object-cover" />
                    ) : (
                      (parent.fullname ?? parent.email)?.charAt(0)?.toUpperCase() ?? 'P'
                    )}
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
                    <Users size={12} className="text-[#1B3B69]" />
                    <span>
                      <span className="font-semibold text-gray-800">{parent.kids.length}</span> student{parent.kids.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex -space-x-1.5">
                    {parent.kids.slice(0, 3).map(k => (
                      <div
                        key={k._id}
                        title={k.fullname}
                        className="w-6 h-6 rounded-full bg-[#FEC610]/20 border-2 border-white flex items-center justify-center text-[8px] font-bold text-[#FEC610]"
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
                  <Eye size={14} className="text-gray-300 group-hover:text-[#1B3B69] transition" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
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
                      page === p ? 'bg-[#1B3B69] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
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
