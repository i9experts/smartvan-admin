'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Plus, Trash2, X, AlertCircle, Users,
  Bus, User, Send, ChevronLeft, ChevronRight, Megaphone,
} from 'lucide-react';
import { alertApi, vanApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Alert {
  _id: string;
  alertType?: string;
  message?: string;
  recipientType: 'ALL_PARENTS' | 'ALL_DRIVERS' | 'SPECIFIC_VAN';
  vanId?: string;
  adminId?: string;
  createdAt: string;
}

interface AlertForm {
  alertType: string;
  message: string;
  recipientType: 'ALL_PARENTS' | 'ALL_DRIVERS' | 'SPECIFIC_VAN';
  vanId: string;
}

const EMPTY_FORM: AlertForm = {
  alertType: '',
  message: '',
  recipientType: 'ALL_PARENTS',
  vanId: '',
};

const ALERT_TYPES = [
  'Safety Alert',
  'Route Change',
  'Delay Notice',
  'School Closure',
  'Emergency',
  'General Announcement',
];

// ─── Recipient config ─────────────────────────────────────────────────────────

const RECIPIENT_CONFIG = {
  ALL_PARENTS: { label: 'All Parents', icon: <User size={16} />, color: 'text-blue-600', bg: 'bg-blue-50' },
  ALL_DRIVERS: { label: 'All Drivers', icon: <Users size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  SPECIFIC_VAN: { label: 'Specific Van', icon: <Bus size={16} />, color: 'text-amber-600', bg: 'bg-amber-50' },
};

// ─── Send Alert Modal ─────────────────────────────────────────────────────────

function SendAlertModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<AlertForm>(EMPTY_FORM);
  const [error, setError] = useState('');

  const { data: vansData } = useQuery({
    queryKey: ['vans-list'],
    queryFn: () => vanApi.getByAdmin({ page: 1, limit: 100 }),
    select: (r: any) => (r.data?.data ?? []).map((item: any) => ({
      _id: item.van?.id || item._id,
      carNumber: item.van?.carNumber || item.carNumber || '',
      vehicleType: item.van?.vehicleType || item.vehicleType || '',
    })),
    staleTime: 60_000,
  });

  const sendMutation = useMutation({
    mutationFn: () => alertApi.add({
      alertType: form.alertType,
      message: form.message,
      recipientType: form.recipientType,
      ...(form.recipientType === 'SPECIFIC_VAN' ? { vanId: form.vanId } : {}),
    }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to send alert'),
  });

  function handleSend() {
    if (!form.message.trim()) { setError('Message is required.'); return; }
    if (form.recipientType === 'SPECIFIC_VAN' && !form.vanId) { setError('Please select a van.'); return; }
    setError('');
    sendMutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1B2B6B]/10 rounded-xl flex items-center justify-center">
              <Megaphone size={18} className="text-[#1B2B6B]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Send Alert</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Recipient Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Send To *</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(RECIPIENT_CONFIG) as [keyof typeof RECIPIENT_CONFIG, typeof RECIPIENT_CONFIG[keyof typeof RECIPIENT_CONFIG]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setForm(f => ({ ...f, recipientType: key, vanId: '' }))}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition ${
                    form.recipientType === key
                      ? `${cfg.bg} ${cfg.color} border-current`
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {cfg.icon}
                  <span className="text-xs font-medium">{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Specific Van selector */}
          {form.recipientType === 'SPECIFIC_VAN' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Van *</label>
              <select
                value={form.vanId}
                onChange={e => setForm(f => ({ ...f, vanId: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
              >
                <option value="">Choose a van…</option>
                {(vansData ?? []).map((v: any) => (
                  <option key={v._id} value={v._id}>
                    {v.carNumber ?? v._id.slice(-6)} {v.vehicleType ? `· ${v.vehicleType}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Alert Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Alert Type</label>
            <select
              value={form.alertType}
              onChange={e => setForm(f => ({ ...f, alertType: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
            >
              <option value="">Select type…</option>
              {ALERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Message *</label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              rows={4}
              placeholder="Type your alert message here…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">{form.message.length} characters</p>
          </div>

          {/* Preview */}
          {form.message && (
            <div className="p-3 bg-[#1B2B6B]/5 rounded-xl border border-[#1B2B6B]/10">
              <p className="text-xs font-semibold text-[#1B2B6B] mb-1">Preview</p>
              <p className="text-xs text-gray-700 leading-relaxed">{form.message}</p>
              <div className="flex items-center gap-2 mt-2">
                <Bell size={10} className="text-gray-400" />
                <span className="text-xs text-gray-400">
                  → {RECIPIENT_CONFIG[form.recipientType].label}
                </span>
              </div>
            </div>
          )}

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
            onClick={handleSend}
            disabled={sendMutation.isPending}
            className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sendMutation.isPending ? 'Sending…' : <><Send size={14} /> Send Alert</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 mx-4 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Alert?</h3>
        <p className="text-sm text-gray-500 mb-6">This alert will be permanently removed.</p>
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

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({ alert, onDelete }: { alert: Alert; onDelete: (id: string) => void }) {
  const cfg = RECIPIENT_CONFIG[alert.recipientType] ?? RECIPIENT_CONFIG.ALL_PARENTS;
  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${mins}m ago`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
            <span className={cfg.color}>{cfg.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {alert.alertType && (
                <span className="px-2 py-0.5 bg-[#1B2B6B]/10 text-[#1B2B6B] text-xs font-medium rounded-full">
                  {alert.alertType}
                </span>
              )}
              <span className={`flex items-center gap-1 px-2 py-0.5 ${cfg.bg} ${cfg.color} text-xs font-medium rounded-full`}>
                {cfg.icon} {cfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{alert.message ?? '—'}</p>
            <p className="text-xs text-gray-400 mt-1.5">{timeAgo(alert.createdAt)}</p>
          </div>
        </div>
        <button
          onClick={() => onDelete(alert._id)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['alerts', page],
    queryFn: () => alertApi.getAll({ page, limit: 12 }),
    select: (r: any) => ({
      ...r.data,
      data: (r.data?.data ?? []).map((a: any) => ({
        ...a,
        createdAt: a.createdAt || a.date || new Date().toISOString(),
      })),
    }),
    staleTime: 30_000,
  });

  const alerts: Alert[] = data?.data ?? [];
  const total: number = data?.total ?? alerts.length ?? 0;
  const totalPages = Math.ceil(total / 12);

  const deleteMutation = useMutation({
    mutationFn: (alertId: string) => alertApi.delete(alertId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      setDeleteTarget(null);
    },
  });

  // Stats
  const parentAlerts = alerts.filter(a => a.recipientType === 'ALL_PARENTS').length;
  const driverAlerts = alerts.filter(a => a.recipientType === 'ALL_DRIVERS').length;
  const vanAlerts = alerts.filter(a => a.recipientType === 'SPECIFIC_VAN').length;

  return (
    <>
      {showModal && (
        <SendAlertModal
          onClose={() => setShowModal(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['alerts'] })}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
            <p className="text-sm text-gray-400 mt-0.5">{total} alert{total !== 1 ? 's' : ''} sent</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2B6B] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition"
          >
            <Plus size={16} /> Send Alert
          </button>
        </div>

        {/* Stats */}
        {!isLoading && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'To Parents', value: parentAlerts, icon: <User size={18} />, color: '#3B82F6', bg: '#EFF6FF' },
              { label: 'To Drivers', value: driverAlerts, icon: <Users size={18} />, color: '#10B981', bg: '#F0FDF4' },
              { label: 'To Specific Van', value: vanAlerts, icon: <Bus size={18} />, color: '#F59E0B', bg: '#FFFBEB' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.bg }}>
                    <span style={{ color: item.color }}>{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{item.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Alerts list */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-full mb-1" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Bell size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No alerts sent yet</p>
            <p className="text-xs mt-1 opacity-60">Click "Send Alert" to notify parents or drivers</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map(alert => (
              <AlertCard
                key={alert._id}
                alert={alert}
                onDelete={id => setDeleteTarget(id)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
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
    </>
  );
}
