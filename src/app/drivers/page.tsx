'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, X, AlertCircle, Filter,
  ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  Phone, Mail, MapPin, FileText, Eye, UserMinus, Bus,
  Smartphone, RefreshCw, Pencil,
} from 'lucide-react';
import { vanApi, api, uploadApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Driver {
  _id: string;
  fullname?: string;
  email: string;
  phoneNo?: string;
  alternatePhoneNo?: string;
  NIC?: string;
  address?: string;
  status: string;
  isVerified: boolean;
  image?: string;
  schoolId?: string;
  licenceImageFront?: string;
  licenceImageBack?: string;
  vehicleCardImageFront?: string;
  vehicleCardImageBack?: string;
  expiryDateLicense?: string;
  expiryDateVehicleCard?: string;
  createdAt: string;
  lastLoginAt?: string | null;
  van?: { carNumber?: string; vehicleType?: string; _id: string };
}

function timeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function AppConnectionBadge({ lastLoginAt }: { lastLoginAt?: string | null }) {
  if (lastLoginAt) {
    return (
      <span className="flex items-center gap-1.5 text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="text-emerald-700 font-medium">Connected</span>
        <span className="text-gray-400">· {timeAgo(lastLoginAt)}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
      <span className="text-gray-400 font-medium">Not connected yet</span>
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function DriverStatusBadge({ status, verified }: { status: string; verified: boolean }) {
  if (status === 'active' && verified) {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
        <CheckCircle2 size={11} /> Active
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
        <CheckCircle2 size={11} /> Unverified
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
      <XCircle size={11} /> Inactive
    </span>
  );
}

// ─── Driver Detail Drawer ─────────────────────────────────────────────────────

function DriverDetailDrawer({ driver, onClose, onEdit }: { driver: Driver; onClose: () => void; onEdit: () => void }) {
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [resetError, setResetError] = useState('');

  const resetMutation = useMutation({
    mutationFn: () => api.post('/van/resetDriverPassword', { driverId: driver._id }),
    onSuccess: (res: any) => {
      const tempPassword = res?.data?.data?.temporaryPassword;
      setResetResult(
        tempPassword
          ? `New password sent via WhatsApp to ${driver.phoneNo}. If delivery fails, share this manually: ${tempPassword}`
          : `New password sent via WhatsApp to ${driver.phoneNo}.`
      );
      setResetError('');
    },
    onError: (e: any) => {
      setResetError(e?.response?.data?.message ?? 'Failed to reset password');
      setResetResult(null);
    },
  });

  const docs = [
    { label: 'Licence Front', url: driver.licenceImageFront },
    { label: 'Licence Back', url: driver.licenceImageBack },
    { label: 'Vehicle Card Front', url: driver.vehicleCardImageFront },
    { label: 'Vehicle Card Back', url: driver.vehicleCardImageBack },
  ].filter(d => d.url);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Driver Profile</h2>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-1.5 border border-[#1B2B6B]/20 text-[#1B2B6B] rounded-lg text-xs font-medium hover:bg-[#1B2B6B]/5 transition">
              <Pencil size={12} /> Edit
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Avatar + name */}
        <div className="flex flex-col items-center pt-8 pb-6 px-5 border-b border-gray-100">
          <div className="w-20 h-20 rounded-full bg-[#1B2B6B]/10 flex items-center justify-center text-[#1B2B6B] text-3xl font-bold mb-3 overflow-hidden">
            {driver.image ? (
              <img src={driver.image} alt={driver.fullname} className="w-full h-full object-cover" />
            ) : (
              driver.fullname?.charAt(0)?.toUpperCase() ?? 'D'
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900">{driver.fullname ?? '—'}</h3>
          <div className="mt-2">
            <DriverStatusBadge status={driver.status} verified={driver.isVerified} />
          </div>
        </div>

        {/* Info */}
        <div className="p-5 space-y-3 border-b border-gray-100">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</h4>
          {[
            { icon: <Mail size={14} />, label: 'Email', val: driver.email },
            { icon: <Phone size={14} />, label: 'Phone', val: driver.phoneNo },
            { icon: <MapPin size={14} />, label: 'Address', val: driver.address },
          ].map(item => item.val ? (
            <div key={item.label} className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5">{item.icon}</span>
              <div>
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="text-sm text-gray-800">{item.val}</p>
              </div>
            </div>
          ) : null)}
          {driver.NIC && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5"><FileText size={14} /></span>
              <div>
                <p className="text-xs text-gray-400">NIC</p>
                <p className="text-sm text-gray-800">{driver.NIC}</p>
              </div>
            </div>
          )}
        </div>

        {/* App Account */}
        <div className="p-5 border-b border-gray-100">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">App Account</h4>
          <div className="p-3.5 bg-gray-50 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smartphone size={16} className="text-[#1B2B6B]" />
                <div>
                  <p className="text-xs text-gray-400">Login Username</p>
                  <p className="text-sm font-medium text-gray-800">{driver.phoneNo || driver.NIC || driver.email}</p>
                </div>
              </div>
              <AppConnectionBadge lastLoginAt={driver.lastLoginAt} />
            </div>

            <button
              onClick={() => { setResetResult(null); setResetError(''); resetMutation.mutate(); }}
              disabled={resetMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-2 border border-[#1B2B6B]/20 text-[#1B2B6B] rounded-lg text-sm font-medium hover:bg-[#1B2B6B]/5 transition disabled:opacity-50"
            >
              <RefreshCw size={13} className={resetMutation.isPending ? 'animate-spin' : ''} />
              {resetMutation.isPending ? 'Resetting…' : 'Reset Password & Resend via WhatsApp'}
            </button>

            {resetResult && (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2.5">{resetResult}</p>
            )}
            {resetError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2.5">{resetError}</p>
            )}
          </div>
        </div>

        {/* Van */}
        {driver.van && (
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Assigned Van</h4>
            <div className="flex items-center gap-3 p-3 bg-[#FFB800]/10 rounded-xl">
              <Bus size={20} className="text-[#FFB800]" />
              <div>
                <p className="text-sm font-semibold text-gray-800">{driver.van.carNumber ?? '—'}</p>
                <p className="text-xs text-gray-500">{driver.van.vehicleType ?? ''}</p>
              </div>
            </div>
          </div>
        )}

        {/* Documents */}
        {docs.length > 0 && (
          <div className="p-5 border-b border-gray-100">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Documents</h4>
            <div className="grid grid-cols-2 gap-2">
              {docs.map(doc => (
                <a
                  key={doc.label}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                >
                  <FileText size={20} className="text-[#1B2B6B]" />
                  <span className="text-xs text-gray-600 text-center">{doc.label}</span>
                </a>
              ))}
            </div>
            {driver.expiryDateLicense && (
              <p className="text-xs text-gray-400 mt-3">Licence expiry: {new Date(driver.expiryDateLicense).toLocaleDateString()}</p>
            )}
          </div>
        )}

        <div className="p-5">
          <p className="text-xs text-gray-400">Joined {new Date(driver.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Driver ──────────────────────────────────────────────────────────────

function EditDriverModal({ driver, onClose, onSuccess }: { driver: Driver; onClose: () => void; onSuccess: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    fullname: driver.fullname ?? '',
    phoneNo: driver.phoneNo ?? '',
    alternatePhoneNo: driver.alternatePhoneNo ?? '',
    NIC: driver.NIC ?? '',
    address: driver.address ?? '',
    expiryDateLicense: driver.expiryDateLicense ? driver.expiryDateLicense.split('T')[0] : '',
    expiryDateVehicleCard: driver.expiryDateVehicleCard ? driver.expiryDateVehicleCard.split('T')[0] : '',
    image: driver.image ?? '',
  });
  const [error, setError] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const f = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  async function handlePhotoSelected(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setError('Photo must be under 2MB.');
      return;
    }
    setIsUploadingPhoto(true);
    try {
      const res = await uploadApi.image(file);
      const url = res.data?.url ?? res.data?.data?.url ?? '';
      f('image', url);
    } catch (e) {
      setError('Photo upload failed. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  const mutation = useMutation({
    mutationFn: () => api.post('/van/editDriverByAdmin', { driverId: driver._id, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      onSuccess();
      onClose();
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to update driver'),
  });

  function handleSubmit() {
    if (!form.fullname.trim()) { setError('Full name is required.'); return; }
    setError('');
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Edit Driver</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex justify-center mb-1">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#1B2B6B]/10 flex items-center justify-center overflow-hidden">
                {form.image ? (
                  <img src={form.image} alt="Driver" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-semibold text-[#1B2B6B]">
                    {form.fullname?.charAt(0)?.toUpperCase() ?? 'D'}
                  </span>
                )}
              </div>
              <input
                id="driver-photo-input"
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoSelected(file);
                  e.target.value = '';
                }}
              />
              <label
                htmlFor="driver-photo-input"
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#1B2B6B] rounded-full flex items-center justify-center shadow-md cursor-pointer">
                {isUploadingPhoto ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Pencil size={12} className="text-white" />
                )}
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
            <input
              value={form.fullname}
              onChange={e => f('fullname', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
              <input
                value={form.phoneNo}
                onChange={e => f('phoneNo', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
                placeholder="03xx-xxxxxxx"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Alternate Phone</label>
              <input
                value={form.alternatePhoneNo}
                onChange={e => f('alternatePhoneNo', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">NIC</label>
            <input
              value={form.NIC}
              onChange={e => f('NIC', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
            <input
              value={form.address}
              onChange={e => f('address', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Licence Expiry</label>
              <input
                type="date"
                value={form.expiryDateLicense}
                onChange={e => f('expiryDateLicense', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Card Expiry</label>
              <input
                type="date"
                value={form.expiryDateVehicleCard}
                onChange={e => f('expiryDateVehicleCard', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-lg p-2.5">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] transition disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Remove Confirm ───────────────────────────────────────────────────────────

function RemoveConfirm({ count, onConfirm, onCancel, loading }: { count: number; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 mx-4 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserMinus size={24} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Driver{count > 1 ? 's' : ''}?</h3>
        <p className="text-sm text-gray-500 mb-6">
          {count} driver{count > 1 ? 's' : ''} will be removed from your school. Their accounts will remain intact.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition disabled:opacity-50">
            {loading ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DriversPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailDriver, setDetailDriver] = useState<Driver | null>(null);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [showRemove, setShowRemove] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['drivers', page, search, statusFilter],
    queryFn: () => vanApi.getDrivers({
      page,
      limit: 10,
      search: search || undefined,
      status: (statusFilter as any) || undefined,
    }),
    select: r => r.data,
    staleTime: 30_000,
  });

  const drivers: Driver[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  const statusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      vanApi.changeDriverStatus(ids, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      setSelected(new Set());
    },
  });

  const removeMutation = useMutation({
    mutationFn: (ids: string[]) => vanApi.removeDriversFromSchool(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      setSelected(new Set());
      setShowRemove(false);
    },
  });

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(selected.size === drivers.length ? new Set() : new Set(drivers.map(d => d._id)));
  }

  const selectedArr = Array.from(selected);

  return (
    <>
      {detailDriver && (
        <DriverDetailDrawer
          driver={detailDriver}
          onClose={() => setDetailDriver(null)}
          onEdit={() => { setEditingDriver(detailDriver); setDetailDriver(null); }}
        />
      )}
      {editingDriver && (
        <EditDriverModal
          driver={editingDriver}
          onClose={() => setEditingDriver(null)}
          onSuccess={() => setEditingDriver(null)}
        />
      )}
      {showRemove && (
        <RemoveConfirm
          count={selectedArr.length}
          loading={removeMutation.isPending}
          onConfirm={() => removeMutation.mutate(selectedArr)}
          onCancel={() => setShowRemove(false)}
        />
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
            <p className="text-sm text-gray-400 mt-0.5">{total} driver{total !== 1 ? 's' : ''} registered</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            {(['', 'active', 'inActive'] as const).map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
                  statusFilter === s ? 'bg-[#1B2B6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === '' ? 'All' : s === 'active' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-[#1B2B6B]/5 rounded-xl">
            <span className="text-sm font-medium text-[#1B2B6B]">{selected.size} selected</span>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => statusMutation.mutate({ ids: selectedArr, status: 'active' })}
                disabled={statusMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition"
              >
                Activate
              </button>
              <button
                onClick={() => statusMutation.mutate({ ids: selectedArr, status: 'inActive' })}
                disabled={statusMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition"
              >
                Deactivate
              </button>
              <button
                onClick={() => setShowRemove(true)}
                className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
              >
                Remove from School
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="p-4 w-10">
                    <input type="checkbox" checked={selected.size === drivers.length && drivers.length > 0} onChange={toggleAll} className="rounded border-gray-300" />
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Driver</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">App Status</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Van</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Documents</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  <th className="p-4 w-16" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 animate-pulse">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="p-4"><div className="h-4 bg-gray-100 rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : drivers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center">
                      <p className="text-sm text-gray-400">{search ? 'No drivers match your search.' : 'No drivers registered yet.'}</p>
                    </td>
                  </tr>
                ) : (
                  drivers.map(driver => {
                    const hasLicence = !!(driver.licenceImageFront || driver.licenceImageBack);
                    const hasVehicleCard = !!(driver.vehicleCardImageFront || driver.vehicleCardImageBack);
                    return (
                      <tr key={driver._id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition ${selected.has(driver._id) ? 'bg-blue-50/30' : ''}`}>
                        <td className="p-4">
                          <input type="checkbox" checked={selected.has(driver._id)} onChange={() => toggleSelect(driver._id)} className="rounded border-gray-300" />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#1B2B6B]/10 flex items-center justify-center text-[#1B2B6B] font-semibold text-sm shrink-0 overflow-hidden">
                              {driver.image ? (
                                <img src={driver.image} alt={driver.fullname} className="w-full h-full object-cover" />
                              ) : (
                                driver.fullname?.charAt(0)?.toUpperCase() ?? 'D'
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{driver.fullname ?? '—'}</p>
                              <p className="text-xs text-gray-400">{driver.NIC ? `NIC: ${driver.NIC}` : 'No NIC on file'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-gray-700">{driver.phoneNo ?? '—'}</p>
                          <p className="text-xs text-gray-400">{driver.email}</p>
                        </td>
                        <td className="p-4">
                          <AppConnectionBadge lastLoginAt={driver.lastLoginAt} />
                        </td>
                        <td className="p-4">
                          {(driver as any).van ? (
                            <span className="flex items-center gap-1.5 text-sm text-gray-700">
                              <Bus size={13} className="text-[#FFB800]" />
                              {(driver as any).van.carNumber ?? 'Assigned'}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">No van</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <span className={`px-1.5 py-0.5 text-xs rounded ${hasLicence ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                              Licence
                            </span>
                            <span className={`px-1.5 py-0.5 text-xs rounded ${hasVehicleCard ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                              V-Card
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <DriverStatusBadge status={driver.status} verified={driver.isVerified} />
                        </td>
                        <td className="p-4 text-xs text-gray-400">
                          {new Date(driver.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => setDetailDriver(driver)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
                            title="View details"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
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
