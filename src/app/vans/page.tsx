'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, X, AlertCircle,
  Bus, Users, Filter, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, UserCheck, UserX,
} from 'lucide-react';
import { vanApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Van {
  _id: string;
  carNumber?: string;
  vehicleType?: string;
  venCapacity?: number;
  condition?: string;
  status: string;
  ownVan: boolean;
  driverId?: string;
  schoolId?: string;
  createdAt: string;
  driver?: { fullname?: string; email?: string; phoneNo?: string };
}

interface VanForm {
  carNumber: string;
  vehicleType: string;
  venCapacity: string;
  condition: string;
}

const EMPTY_FORM: VanForm = { carNumber: '', vehicleType: '', venCapacity: '', condition: '' };
const VEHICLE_TYPES = ['Mehran', 'Cultus', 'Corolla', 'Alto', 'WagonR'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function VanStatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
        <CheckCircle2 size={11} /> Active
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
      <XCircle size={11} /> Inactive
    </span>
  );
}

// ─── Van Modal ────────────────────────────────────────────────────────────────

interface VanModalProps {
  mode: 'add' | 'edit';
  van?: Van | null;
  onClose: () => void;
  onSuccess: () => void;
}

function VanModal({ mode, van, onClose, onSuccess }: VanModalProps) {
  const [form, setForm] = useState<VanForm>(
    van
      ? {
          carNumber: van.carNumber ?? '',
          vehicleType: van.vehicleType ?? '',
          venCapacity: String(van.venCapacity ?? ''),
          condition: van.condition ?? '',
        }
      : EMPTY_FORM
  );
  const [error, setError] = useState('');

  const addMutation = useMutation({
    mutationFn: (f: VanForm) =>
      vanApi.addByAdmin({
        carNumber: f.carNumber,
        vehicleType: f.vehicleType,
        venCapacity: Number(f.venCapacity),
        condition: f.condition,
      }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to add van'),
  });

  const editMutation = useMutation({
    mutationFn: (f: VanForm) =>
      vanApi.editByAdmin({
        vanId: van!._id,
        carNumber: f.carNumber,
        vehicleType: f.vehicleType,
        venCapacity: Number(f.venCapacity),
        condition: f.condition,
      }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to update van'),
  });

  const isLoading = addMutation.isPending || editMutation.isPending;

  function handleSubmit() {
    if (!form.carNumber || !form.vehicleType) {
      setError('Car number and vehicle type are required.');
      return;
    }
    setError('');
    mode === 'add' ? addMutation.mutate(form) : editMutation.mutate(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === 'add' ? 'Add Van' : 'Edit Van'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Car Number / Plate *</label>
            <input
              value={form.carNumber}
              onChange={(e) => setForm(f => ({ ...f, carNumber: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
              placeholder="e.g. ABC-123"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Type *</label>
              <select
                value={form.vehicleType}
                onChange={(e) => setForm(f => ({ ...f, vehicleType: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
              >
                <option value="">Select</option>
                {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Capacity</label>
              <input
                type="number"
                min={1}
                max={50}
                value={form.venCapacity}
                onChange={(e) => setForm(f => ({ ...f, venCapacity: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
                placeholder="e.g. 12"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Condition</label>
            <select
              value={form.condition}
              onChange={(e) => setForm(f => ({ ...f, condition: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
            >
              <option value="">Select</option>
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs">
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
            disabled={isLoading}
            className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] transition disabled:opacity-50"
          >
            {isLoading ? 'Saving…' : mode === 'add' ? 'Add Van' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Assign Driver Modal ──────────────────────────────────────────────────────

interface AssignDriverModalProps {
  van: Van;
  drivers: any[];
  onClose: () => void;
  onSuccess: () => void;
}

function AssignDriverModal({ van, drivers, onClose, onSuccess }: AssignDriverModalProps) {
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [error, setError] = useState('');
  const qc = useQueryClient();

  const assignMutation = useMutation({
    mutationFn: () => vanApi.assignVanToDriver(selectedDriverId, van._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vans'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      onSuccess();
      onClose();
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Assignment failed'),
  });

  const removeMutation = useMutation({
    mutationFn: () => vanApi.removeDriverFromVan(van._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vans'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      onClose();
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Remove failed'),
  });

  const unassignedDrivers = drivers.filter(d => d.status === 'active');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assign Driver</h2>
            <p className="text-xs text-gray-400 mt-0.5">Van: {van.carNumber ?? van._id.slice(-6)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>

        {van.driver && (
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl mb-4">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-amber-600" />
              <div>
                <p className="text-xs font-medium text-amber-800">Currently assigned</p>
                <p className="text-xs text-amber-700">{van.driver.fullname ?? 'Driver'}</p>
              </div>
            </div>
            <button
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200 transition"
            >
              <UserX size={12} /> Remove
            </button>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Select Driver</label>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {unassignedDrivers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No active drivers available</p>
            ) : (
              unassignedDrivers.map(d => (
                <label
                  key={d._id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    selectedDriverId === d._id
                      ? 'border-[#1B2B6B] bg-[#1B2B6B]/5'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="driver"
                    value={d._id}
                    checked={selectedDriverId === d._id}
                    onChange={() => setSelectedDriverId(d._id)}
                    className="accent-[#1B2B6B]"
                  />
                  <div className="w-8 h-8 rounded-full bg-[#1B2B6B]/10 flex items-center justify-center text-[#1B2B6B] font-semibold text-sm shrink-0">
                    {d.fullname?.charAt(0)?.toUpperCase() ?? 'D'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.fullname ?? '—'}</p>
                    <p className="text-xs text-gray-400">{d.phoneNo ?? d.email ?? '—'}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs mt-3">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={() => assignMutation.mutate()}
            disabled={!selectedDriverId || assignMutation.isPending}
            className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] transition disabled:opacity-50"
          >
            {assignMutation.isPending ? 'Assigning…' : 'Assign Driver'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ vanId, onConfirm, onCancel, loading }: { vanId: string; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 mx-4 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Van?</h3>
        <p className="text-sm text-gray-500 mb-6">This will permanently remove the van and unassign any linked driver.</p>
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

export default function VansPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | 'assign' | null>(null);
  const [target, setTarget] = useState<Van | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['vans', page, search, statusFilter],
    queryFn: () => vanApi.getByAdmin({ page, limit: 10, search: search || undefined, vanOwn: undefined }),
    select: (r) => r.data,
    staleTime: 30_000,
  });

  const { data: driversData } = useQuery({
    queryKey: ['drivers-list'],
    queryFn: () => vanApi.getDrivers({ page: 1, limit: 100 }),
    select: (r) => r.data?.data ?? [],
    staleTime: 60_000,
  });

  const vans: Van[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  const deleteMutation = useMutation({
    mutationFn: (vanId: string) => vanApi.deleteByAdmin(vanId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vans'] });
      setDeleteTarget(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      vanApi.changeStatus(ids, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vans'] });
      setSelected(new Set());
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
    setSelected(selected.size === vans.length ? new Set() : new Set(vans.map(v => v._id)));
  }

  const selectedArr = Array.from(selected);

  return (
    <>
      {modal === 'add' && (
        <VanModal mode="add" onClose={() => setModal(null)} onSuccess={() => qc.invalidateQueries({ queryKey: ['vans'] })} />
      )}
      {modal === 'edit' && target && (
        <VanModal mode="edit" van={target} onClose={() => setModal(null)} onSuccess={() => qc.invalidateQueries({ queryKey: ['vans'] })} />
      )}
      {modal === 'assign' && target && (
        <AssignDriverModal van={target} drivers={driversData ?? []} onClose={() => setModal(null)} onSuccess={() => {}} />
      )}
      {deleteTarget && (
        <DeleteConfirm
          vanId={deleteTarget}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fleet</h1>
            <p className="text-sm text-gray-400 mt-0.5">{total} van{total !== 1 ? 's' : ''} registered</p>
          </div>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2B6B] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition"
          >
            <Plus size={16} /> Add Van
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by plate or type…"
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
                    <input type="checkbox" checked={selected.size === vans.length && vans.length > 0} onChange={toggleAll} className="rounded border-gray-300" />
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Van</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Capacity</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Condition</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Driver</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="p-4 w-28" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 animate-pulse">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="p-4"><div className="h-4 bg-gray-100 rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : vans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center">
                      <Bus size={32} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-sm text-gray-400">{search ? 'No vans match your search.' : 'No vans yet. Add one above.'}</p>
                    </td>
                  </tr>
                ) : (
                  vans.map(van => (
                    <tr key={van._id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition ${selected.has(van._id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="p-4">
                        <input type="checkbox" checked={selected.has(van._id)} onChange={() => toggleSelect(van._id)} className="rounded border-gray-300" />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#FFB800]/10 flex items-center justify-center shrink-0">
                            <Bus size={18} className="text-[#FFB800]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{van.carNumber ?? '—'}</p>
                            <p className="text-xs text-gray-400">{van.ownVan ? 'Owner van' : 'School van'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{van.vehicleType ?? '—'}</td>
                      <td className="p-4">
                        {van.venCapacity ? (
                          <span className="flex items-center gap-1 text-sm text-gray-600">
                            <Users size={13} className="text-gray-400" /> {van.venCapacity}
                          </span>
                        ) : <span className="text-gray-400 text-sm">—</span>}
                      </td>
                      <td className="p-4 text-sm text-gray-600">{van.condition ?? '—'}</td>
                      <td className="p-4">
                        {van.driver ? (
                          <div>
                            <p className="text-sm font-medium text-gray-800">{van.driver.fullname ?? '—'}</p>
                            <p className="text-xs text-gray-400">{van.driver.phoneNo ?? van.driver.email ?? ''}</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setTarget(van); setModal('assign'); }}
                            className="text-xs text-[#1B2B6B] font-medium hover:underline"
                          >
                            + Assign driver
                          </button>
                        )}
                      </td>
                      <td className="p-4"><VanStatusBadge status={van.status} /></td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setTarget(van); setModal('assign'); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                            title="Assign driver"
                          >
                            <UserCheck size={14} />
                          </button>
                          <button
                            onClick={() => { setTarget(van); setModal('edit'); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
                            title="Edit van"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(van._id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                            title="Delete van"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
