'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, X, AlertCircle,
  ChevronLeft, ChevronRight, FileText,
  CheckCircle2, Clock, XCircle, DollarSign,
  Building2, Calendar, CreditCard,
} from 'lucide-react';
import { invoiceApi, schoolApi } from '@/lib/api';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  _id: string;
  schoolId: string;
  billingCycle?: string;
  planType?: string;
  startDate?: string;
  paymentMethod?: string;
  amount?: string;
  invoiceStatus?: string;
  notes?: string;
  createdAt: string;
  school?: { name?: string; email?: string };
}

interface InvoiceForm {
  schoolId: string;
  billingCycle: string;
  planType: string;
  startDate: string;
  paymentMethod: string;
  amount: string;
  invoiceStatus: string;
  notes: string;
}

const EMPTY_FORM: InvoiceForm = {
  schoolId: '',
  billingCycle: 'Monthly',
  planType: 'Per Student',
  startDate: '',
  paymentMethod: 'Stripe',
  amount: '',
  invoiceStatus: 'Pending',
  notes: '',
};

const BILLING_CYCLES = ['Monthly', 'Quarterly', 'Annually'];
const PLAN_TYPES = ['Per Student', 'Flat Rate', 'Per Van', 'Enterprise'];
const PAYMENT_METHODS = ['Stripe', 'Bank Transfer', 'Cash', 'Cheque'];
const INVOICE_STATUSES = ['Pending', 'Paid', 'Overdue', 'Cancelled'];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function InvoiceStatusBadge({ status }: { status?: string }) {
  const s = status?.toLowerCase() ?? 'pending';
  if (s === 'paid') return <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full"><CheckCircle2 size={11} /> Paid</span>;
  if (s === 'overdue') return <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-full"><XCircle size={11} /> Overdue</span>;
  if (s === 'cancelled') return <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full"><X size={11} /> Cancelled</span>;
  return <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full"><Clock size={11} /> Pending</span>;
}

// ─── Invoice Modal ────────────────────────────────────────────────────────────

interface InvoiceModalProps {
  mode: 'add' | 'edit';
  invoice?: Invoice | null;
  schools: any[];
  onClose: () => void;
  onSuccess: () => void;
}

function InvoiceModal({ mode, invoice, schools, onClose, onSuccess }: InvoiceModalProps) {
  const [form, setForm] = useState<InvoiceForm>(
    invoice
      ? {
          schoolId: invoice.schoolId ?? '',
          billingCycle: invoice.billingCycle ?? 'Monthly',
          planType: invoice.planType ?? 'Per Student',
          startDate: invoice.startDate ?? '',
          paymentMethod: invoice.paymentMethod ?? 'Stripe',
          amount: invoice.amount ?? '',
          invoiceStatus: invoice.invoiceStatus ?? 'Pending',
          notes: invoice.notes ?? '',
        }
      : EMPTY_FORM
  );
  const [error, setError] = useState('');

  const addMutation = useMutation({
    mutationFn: () => api.post('/Invoice/createInvoice', form),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to create invoice'),
  });

  const editMutation = useMutation({
    mutationFn: () => api.post('/Invoice/editInvoice', { invoiceId: invoice!._id, ...form }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to update invoice'),
  });

  function handleSubmit() {
    if (!form.schoolId) { setError('School is required.'); return; }
    if (!form.amount) { setError('Amount is required.'); return; }
    setError('');
    mode === 'add' ? addMutation.mutate() : editMutation.mutate();
  }

  const isLoading = addMutation.isPending || editMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1B2B6B]/10 rounded-xl flex items-center justify-center">
              <FileText size={18} className="text-[#1B2B6B]" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">{mode === 'add' ? 'Create Invoice' : 'Edit Invoice'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">School *</label>
            <select
              value={form.schoolId}
              onChange={e => setForm(f => ({ ...f, schoolId: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
            >
              <option value="">Select school…</option>
              {schools.map((s: any) => (
                <option key={s._id} value={s._id}>{s.name ?? s.email ?? s._id}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Billing Cycle</label>
              <select value={form.billingCycle} onChange={e => setForm(f => ({ ...f, billingCycle: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30">
                {BILLING_CYCLES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Plan Type</label>
              <select value={form.planType} onChange={e => setForm(f => ({ ...f, planType: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30">
                {PLAN_TYPES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount *</label>
              <input
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="e.g. 450.00 USD"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Payment Method</label>
              <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30">
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <select value={form.invoiceStatus} onChange={e => setForm(f => ({ ...f, invoiceStatus: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30">
                {INVOICE_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Optional notes…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={isLoading} className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] transition disabled:opacity-50">
            {isLoading ? 'Saving…' : mode === 'add' ? 'Create Invoice' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Invoice | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['invoices', page, search],
    queryFn: () => api.get('/Invoice/getAllInvoicesBySuperAdmin', { params: { page, limit: 10, search: search || undefined } }),
    select: r => r.data,
    staleTime: 30_000,
  });

  const { data: schools = [] } = useQuery({
    queryKey: ['schools-list'],
    queryFn: () => schoolApi.getAll({ page: 1, limit: 100 }),
    select: r => r.data?.data ?? [],
    staleTime: 120_000,
  });

  const invoices: Invoice[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  // Summary stats
  const paid = invoices.filter(i => i.invoiceStatus?.toLowerCase() === 'paid').length;
  const pending = invoices.filter(i => i.invoiceStatus?.toLowerCase() === 'pending').length;
  const overdue = invoices.filter(i => i.invoiceStatus?.toLowerCase() === 'overdue').length;

  return (
    <>
      {modal === 'add' && (
        <InvoiceModal mode="add" schools={schools} onClose={() => setModal(null)} onSuccess={() => qc.invalidateQueries({ queryKey: ['invoices'] })} />
      )}
      {modal === 'edit' && editTarget && (
        <InvoiceModal mode="edit" invoice={editTarget} schools={schools} onClose={() => setModal(null)} onSuccess={() => qc.invalidateQueries({ queryKey: ['invoices'] })} />
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
            <p className="text-sm text-gray-400 mt-0.5">{total} invoice{total !== 1 ? 's' : ''} total</p>
          </div>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2B6B] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition"
          >
            <Plus size={16} /> Create Invoice
          </button>
        </div>

        {/* Summary cards */}
        {!isLoading && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Paid', value: paid, icon: <CheckCircle2 size={18} />, color: '#10B981', bg: '#F0FDF4' },
              { label: 'Pending', value: pending, icon: <Clock size={18} />, color: '#F59E0B', bg: '#FFFBEB' },
              { label: 'Overdue', value: overdue, icon: <XCircle size={18} />, color: '#EF4444', bg: '#FEF2F2' },
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

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by school…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">School</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Start Date</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="p-4 w-16" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 animate-pulse">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="p-4"><div className="h-4 bg-gray-100 rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <FileText size={32} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-sm text-gray-400">{search ? 'No invoices match your search.' : 'No invoices yet. Create one above.'}</p>
                    </td>
                  </tr>
                ) : (
                  invoices.map(invoice => (
                    <tr key={invoice._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[#1B2B6B]/10 rounded-lg flex items-center justify-center shrink-0">
                            <Building2 size={14} className="text-[#1B2B6B]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {invoice.school?.name ?? invoice.schoolId?.slice(-8) ?? '—'}
                            </p>
                            <p className="text-xs text-gray-400">{invoice.billingCycle ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{invoice.planType ?? '—'}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                          <DollarSign size={13} className="text-gray-400" />
                          {invoice.amount ?? '—'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <CreditCard size={13} className="text-gray-400" />
                          {invoice.paymentMethod ?? '—'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar size={12} className="text-gray-400" />
                          {invoice.startDate ?? new Date(invoice.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="p-4">
                        <InvoiceStatusBadge status={invoice.invoiceStatus} />
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => { setEditTarget(invoice); setModal('edit'); }}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition"
                        >
                          <Pencil size={14} />
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
