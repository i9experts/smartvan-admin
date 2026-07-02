'use client';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign, Users, CheckCircle2, Clock, AlertCircle,
  Search, Bell, Plus, Download, X, RefreshCw, Receipt,
  CreditCard, Banknote, Smartphone, Building2,
  Filter, FileText, Settings, Bus, MapPin, Percent,
  Calendar, Phone, Wallet, TrendingUp, ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api';

const CURRENCIES = ['PKR', 'SAR', 'AED', 'QAR', 'USD'];
const BILLING_CYCLES = ['monthly', 'quarterly', 'yearly', 'one_time'];
const SERVICE_TYPES = [
  { value: 'both', label: 'Pick & Drop', desc: 'Full service' },
  { value: 'pick_only', label: 'Pick Only', desc: 'Morning only' },
  { value: 'drop_only', label: 'Drop Only', desc: 'Afternoon only' },
];
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'jazzcash', label: 'JazzCash', icon: Smartphone },
  { value: 'easypaisa', label: 'EasyPaisa', icon: Smartphone },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'other', label: 'Other', icon: Wallet },
];

function getCurrentMonth() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

function formatCurrency(amount: number, currency = 'PKR') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch { return `${currency} ${amount.toLocaleString()}`; }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    overdue: 'bg-red-50 text-red-600 border-red-200',
  };
  const Icon = status === 'paid' ? CheckCircle2 : status === 'overdue' ? AlertCircle : Clock;
  return (
    <span className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border ${map[status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      <Icon size={10} />{status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PayMethodBadge({ method }: { method: string }) {
  const map: Record<string, string> = {
    cash: 'bg-green-50 text-green-700',
    jazzcash: 'bg-red-50 text-red-700',
    easypaisa: 'bg-emerald-50 text-emerald-700',
    bank_transfer: 'bg-blue-50 text-blue-700',
    card: 'bg-purple-50 text-purple-700',
    other: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full capitalize ${map[method] ?? 'bg-gray-100 text-gray-600'}`}>
      {method.replace(/_/g, ' ')}
    </span>
  );
}

function ServiceTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    both: 'bg-blue-50 text-blue-700',
    pick_only: 'bg-purple-50 text-purple-700',
    drop_only: 'bg-orange-50 text-orange-700',
  };
  const labels: Record<string, string> = { both: 'Pick & Drop', pick_only: 'Pick Only', drop_only: 'Drop Only' };
  return (
    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${map[type] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[type] ?? type}
    </span>
  );
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────
function RecordPaymentModal({ payment, onClose }: { payment: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.post('/fees/record-payment', { paymentId: payment._id, paymentMethod: method, notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fees'] }); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to record payment'),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
            <p className="text-xs text-gray-400 mt-0.5">{payment.studentName || 'Student'} · {payment.month}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="p-4 bg-[#1B2B6B]/5 rounded-xl mb-5 border border-[#1B2B6B]/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Amount Due</p>
              <p className="text-2xl font-bold text-[#1B2B6B]">{formatCurrency(payment.amount, payment.currency)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Service</p>
              <ServiceTypeBadge type={payment.serviceType || 'both'} />
            </div>
          </div>
          {payment.receiptNumber && <p className="text-xs text-gray-400 mt-2 font-mono">#{payment.receiptNumber}</p>}
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Payment Method *</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button key={m.value} onClick={() => setMethod(m.value)}
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-xs font-medium transition ${method === m.value ? 'border-[#1B2B6B] bg-[#1B2B6B]/5 text-[#1B2B6B]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <m.icon size={16} />{m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 resize-none"
              placeholder="Add payment notes..." />
          </div>
          {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs"><AlertCircle size={14} />{error}</div>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] disabled:opacity-50 flex items-center justify-center gap-2">
            {mutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {mutation.isPending ? 'Recording…' : 'Mark as Paid'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fee Config Modal ─────────────────────────────────────────────────────────
function FeeConfigModal({ existing, schoolId, defaultCurrency = 'PKR', onClose }: { existing?: any; schoolId: string; defaultCurrency?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    amount: existing?.amount ? String(existing.amount) : '',
    currency: existing?.currency || defaultCurrency,
    billingCycle: existing?.billingCycle || 'monthly',
    serviceType: existing?.serviceType || 'both',
    pickOnlyAmount: existing?.pickOnlyAmount ? String(existing.pickOnlyAmount) : '',
    dropOnlyAmount: existing?.dropOnlyAmount ? String(existing.dropOnlyAmount) : '',
    description: existing?.description || '',
    siblingDiscountPercent: existing?.siblingDiscountPercent ? String(existing.siblingDiscountPercent) : '',
    earlyPaymentDiscountPercent: existing?.earlyPaymentDiscountPercent ? String(existing.earlyPaymentDiscountPercent) : '',
    earlyPaymentDeadlineDay: existing?.earlyPaymentDeadlineDay ? String(existing.earlyPaymentDeadlineDay) : '5',
    lateFeeAmount: existing?.lateFeeAmount ? String(existing.lateFeeAmount) : '',
    lateFeeAfterDay: existing?.lateFeeAfterDay ? String(existing.lateFeeAfterDay) : '10',
    notes: existing?.notes || '',
  });
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.post('/fees/set', {
      schoolId,
      amount: Number(form.amount),
      currency: form.currency,
      billingCycle: form.billingCycle,
      serviceType: form.serviceType,
      pickOnlyAmount: form.pickOnlyAmount ? Number(form.pickOnlyAmount) : undefined,
      dropOnlyAmount: form.dropOnlyAmount ? Number(form.dropOnlyAmount) : undefined,
      description: form.description || `${form.billingCycle} transport fee`,
      siblingDiscountPercent: form.siblingDiscountPercent ? Number(form.siblingDiscountPercent) : undefined,
      earlyPaymentDiscountPercent: form.earlyPaymentDiscountPercent ? Number(form.earlyPaymentDiscountPercent) : undefined,
      earlyPaymentDeadlineDay: form.earlyPaymentDeadlineDay ? Number(form.earlyPaymentDeadlineDay) : undefined,
      lateFeeAmount: form.lateFeeAmount ? Number(form.lateFeeAmount) : undefined,
      lateFeeAfterDay: form.lateFeeAfterDay ? Number(form.lateFeeAfterDay) : undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fees'] }); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to save fee'),
  });

  const f = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{existing ? 'Edit Fee Structure' : 'Configure Fee Structure'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Set transport fee rates and discount policies</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          {/* Service Type */}
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Service Type</p>
            <div className="grid grid-cols-3 gap-2">
              {SERVICE_TYPES.map(s => (
                <button key={s.value} onClick={() => f('serviceType', s.value)}
                  className={`p-3 rounded-xl border-2 text-left transition ${form.serviceType === s.value ? 'border-[#1B2B6B] bg-[#1B2B6B]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className={`text-xs font-semibold ${form.serviceType === s.value ? 'text-[#1B2B6B]' : 'text-gray-700'}`}>{s.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Base Fees */}
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Fee Rates</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
                <select value={form.currency} onChange={e => f('currency', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white">
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Billing Cycle</label>
                <select value={form.billingCycle} onChange={e => f('billingCycle', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white capitalize">
                  {BILLING_CYCLES.map(c => <option key={c} value={c} className="capitalize">{c.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pick & Drop Amount *</label>
                <input type="number" value={form.amount} onChange={e => f('amount', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white"
                  placeholder="e.g. 3000" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pick Only</label>
                <input type="number" value={form.pickOnlyAmount} onChange={e => f('pickOnlyAmount', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white"
                  placeholder="e.g. 1800" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Drop Only</label>
                <input type="number" value={form.dropOnlyAmount} onChange={e => f('dropOnlyAmount', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white"
                  placeholder="e.g. 1800" />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input value={form.description} onChange={e => f('description', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white"
                placeholder="e.g. Monthly transport fee - Gulshan Route" />
            </div>
          </div>

          {/* Discounts */}
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Discount Policy</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sibling Discount %</label>
                <input type="number" min="0" max="100" value={form.siblingDiscountPercent} onChange={e => f('siblingDiscountPercent', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white"
                  placeholder="e.g. 10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Early Payment Discount %</label>
                <input type="number" min="0" max="100" value={form.earlyPaymentDiscountPercent} onChange={e => f('earlyPaymentDiscountPercent', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white"
                  placeholder="e.g. 5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Early Payment Before Day</label>
                <input type="number" min="1" max="31" value={form.earlyPaymentDeadlineDay} onChange={e => f('earlyPaymentDeadlineDay', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white"
                  placeholder="5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Late Payment Deadline Day</label>
                <input type="number" min="1" max="31" value={form.lateFeeAfterDay} onChange={e => f('lateFeeAfterDay', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white"
                  placeholder="10" />
              </div>
            </div>
          </div>

          {/* Late Fee */}
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Late Fee</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Late Fee Amount ({form.currency})</label>
              <input type="number" value={form.lateFeeAmount} onChange={e => f('lateFeeAmount', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white"
                placeholder="e.g. 200" />
              <p className="text-xs text-gray-400 mt-1">Applied after day {form.lateFeeAfterDay} of each month</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Internal Notes</label>
            <textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 resize-none"
              placeholder="Any internal notes about this fee structure..." />
          </div>

          {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs"><AlertCircle size={14} />{error}</div>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { if (!form.amount) { setError('Base amount is required'); return; } setError(''); mutation.mutate(); }}
            disabled={mutation.isPending}
            className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] disabled:opacity-50 flex items-center justify-center gap-2">
            {mutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {mutation.isPending ? 'Saving…' : existing ? 'Update Fee' : 'Save Fee Structure'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FeesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'overview' | 'payments' | 'unpaid' | 'settings'>('overview');
  const [month, setMonth] = useState(getCurrentMonth());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showFeeConfig, setShowFeeConfig] = useState(false);
  const [editingFee, setEditingFee] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [genMsg, setGenMsg] = useState('');

  const { data: profileData } = useQuery({
    queryKey: ['school-profile'],
    queryFn: () => api.get('/Admin/getProfile').then(r => r.data?.data),
    staleTime: 300_000,
  });
  const schoolId = profileData?._id ?? '';
  const schoolCurrency = profileData?.currency ?? 'PKR';
  const isProfileLoading = !profileData;

  const { data: summaryData, isLoading: loadingSummary, refetch: refetchAll } = useQuery({
    queryKey: ['fees', 'summary', month],
    queryFn: () => api.get(`/fees/summary?month=${month}`).then(r => r.data?.data),
    staleTime: 30_000,
  });

  const { data: paymentsData, isLoading: loadingPayments } = useQuery({
    queryKey: ['fees', 'payments', month, statusFilter],
    queryFn: () => api.get(`/fees/payments?month=${month}${statusFilter ? `&status=${statusFilter}` : ''}`).then(r => r.data),
    staleTime: 30_000,
  });

  const { data: unpaidData, isLoading: loadingUnpaid } = useQuery({
    queryKey: ['fees', 'unpaid', month],
    queryFn: () => api.get(`/fees/unpaid?month=${month}`).then(r => r.data),
    staleTime: 30_000,
  });

  const { data: feeConfigs, isLoading: loadingConfigs } = useQuery({
    queryKey: ['fees', 'configs'],
    queryFn: () => api.get('/fees/school').then(r => r.data?.data ?? []),
    staleTime: 60_000,
  });

  const payments: any[] = paymentsData?.data ?? [];
  const unpaid: any[] = unpaidData?.data ?? [];
  const summary = summaryData ?? { total: 0, paid: 0, pending: 0, overdue: 0, totalCollected: 0, totalPending: 0, totalOverdue: 0, collectionRate: 0 };

  const filteredPayments = useMemo(() => {
    if (!search) return payments;
    const q = search.toLowerCase();
    return payments.filter((p: any) =>
      p.studentName?.toLowerCase().includes(q) ||
      p.parentName?.toLowerCase().includes(q) ||
      p.receiptNumber?.toLowerCase().includes(q)
    );
  }, [payments, search]);

  const filteredUnpaid = useMemo(() => {
    if (!search) return unpaid;
    const q = search.toLowerCase();
    return unpaid.filter((u: any) =>
      u.studentName?.toLowerCase().includes(q) ||
      u.parentName?.toLowerCase().includes(q)
    );
  }, [unpaid, search]);

  async function generateMonthly() {
    setGenerating(true);
    setGenMsg('');
    try {
      const res = await api.post('/fees/generate-monthly', { month });
      setGenMsg(`✓ ${res.data?.created ?? 0} records created, ${res.data?.skipped ?? 0} already existed`);
      qc.invalidateQueries({ queryKey: ['fees'] });
    } catch (e: any) {
      setGenMsg('✗ ' + (e?.response?.data?.message ?? 'Failed to generate'));
    } finally { setGenerating(false); }
  }

  async function sendReminders() {
    setSendingReminders(true);
    try {
      await api.post('/fees/send-reminders', { month });
      setGenMsg('✓ Payment reminders sent to all unpaid parents');
      setTimeout(() => setGenMsg(''), 4000);
    } catch (e: any) {
      setGenMsg('✗ ' + (e?.response?.data?.message ?? 'Failed to send'));
    } finally { setSendingReminders(false); }
  }

  function exportCSV() {
    const data = tab === 'unpaid' ? filteredUnpaid : filteredPayments;
    if (!data.length) return;
    const headers = tab === 'unpaid'
      ? ['Student', 'Parent', 'Phone', 'Month', 'Amount', 'Currency', 'Service Type']
      : ['Receipt', 'Student', 'Parent', 'Amount', 'Currency', 'Method', 'Status', 'Service Type', 'Month', 'Paid At'];
    const rows = tab === 'unpaid'
      ? data.map((u: any) => [u.studentName, u.parentName, u.parentPhone, u.month, u.amount, u.currency, u.serviceType])
      : data.map((p: any) => [p.receiptNumber, p.studentName, p.parentName, p.amount, p.currency, p.paymentMethod, p.status, p.serviceType, p.month, p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '']);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `smartvan-fees-${month}.csv`; a.click();
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: DollarSign },
    { id: 'payments', label: `All Payments ${summary.total > 0 ? `(${summary.total})` : ''}`, icon: Receipt },
    { id: 'unpaid', label: `Unpaid ${summary.pending + summary.overdue > 0 ? `(${summary.pending + summary.overdue})` : ''}`, icon: AlertCircle },
    { id: 'settings', label: 'Fee Structure', icon: Settings },
  ] as const;

  return (
    <>
      {selectedPayment && <RecordPaymentModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />}
      {showFeeConfig && <FeeConfigModal schoolId={schoolId} defaultCurrency={schoolCurrency} onClose={() => { setShowFeeConfig(false); setEditingFee(null); }} existing={editingFee} />}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fee Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">Transport fee collection, tracking & reporting</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
              <Download size={14} /> Export CSV
            </button>
            <button onClick={() => { refetchAll(); qc.invalidateQueries({ queryKey: ['fees'] }); }}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={() => { setEditingFee(null); setShowFeeConfig(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#1B2B6B] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition disabled:opacity-50"
              disabled={isProfileLoading}>
              {isProfileLoading ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              {isProfileLoading ? 'Loading…' : 'Configure Fee'}
            </button>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white">
            <Calendar size={14} className="text-gray-400" />
            <input type="month" value={month} onChange={e => setMonth(e.target.value)}
              className="text-sm text-gray-700 focus:outline-none" />
          </div>
          <button onClick={generateMonthly} disabled={generating}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium hover:bg-emerald-100 transition disabled:opacity-50">
            {generating ? <RefreshCw size={14} className="animate-spin" /> : <Users size={14} />}
            {generating ? 'Generating…' : 'Generate Monthly Bills'}
          </button>
          <button onClick={sendReminders} disabled={sendingReminders}
            className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 transition disabled:opacity-50">
            {sendingReminders ? <RefreshCw size={14} className="animate-spin" /> : <Bell size={14} />}
            {sendingReminders ? 'Sending…' : 'Send Reminders'}
          </button>
          {genMsg && (
            <span className={`text-xs font-medium px-3 py-1.5 rounded-lg ${genMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {genMsg}
            </span>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Billed', value: formatCurrency(summary.totalCollected + summary.totalPending + summary.totalOverdue), sub: `${summary.total} students`, icon: DollarSign, color: 'text-[#1B2B6B]', light: 'bg-blue-50' },
            { label: 'Collected', value: formatCurrency(summary.totalCollected), sub: `${summary.paid} payments · ${summary.collectionRate}% rate`, icon: CheckCircle2, color: 'text-emerald-600', light: 'bg-emerald-50' },
            { label: 'Pending', value: formatCurrency(summary.totalPending), sub: `${summary.pending} students`, icon: Clock, color: 'text-amber-600', light: 'bg-amber-50' },
            { label: 'Overdue', value: formatCurrency(summary.totalOverdue), sub: `${summary.overdue} students`, icon: AlertCircle, color: 'text-red-600', light: 'bg-red-50' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                </div>
                <div className={`w-10 h-10 ${card.light} rounded-xl flex items-center justify-center`}>
                  <card.icon size={20} className={card.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Collection Rate Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Collection Rate — {month}</p>
            <p className="text-sm font-bold text-[#1B2B6B]">{summary.collectionRate}%</p>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1B2B6B] rounded-full transition-all duration-700" style={{ width: `${summary.collectionRate}%` }} />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span>{summary.paid} paid</span>
            <span>{summary.pending} pending · {summary.overdue} overdue</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.id ? 'bg-white text-[#1B2B6B] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <t.icon size={14} />{t.label}
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        {tab !== 'settings' && tab !== 'overview' && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student or parent…"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
            </div>
            {tab === 'payments' && (
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-400" />
                {['', 'paid', 'pending', 'overdue'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${statusFilter === s ? 'bg-[#1B2B6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment Method Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Payment Method Breakdown</h3>
              {payments.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-sm text-gray-400">No payments this month</div>
              ) : (
                <div className="space-y-3">
                  {PAYMENT_METHODS.map(m => {
                    const count = payments.filter((p: any) => p.paymentMethod === m.value && p.status === 'paid').length;
                    const pct = payments.filter((p: any) => p.status === 'paid').length > 0
                      ? Math.round((count / payments.filter((p: any) => p.status === 'paid').length) * 100) : 0;
                    if (count === 0) return null;
                    return (
                      <div key={m.value} className="flex items-center gap-3">
                        <m.icon size={14} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-600 w-24 capitalize">{m.label}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#1B2B6B] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Service Type Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Service Type Distribution</h3>
              <div className="space-y-3">
                {SERVICE_TYPES.map(s => {
                  const count = payments.filter((p: any) => (p.serviceType || 'both') === s.value).length;
                  const pct = payments.length > 0 ? Math.round((count / payments.length) * 100) : 0;
                  return (
                    <div key={s.value} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-24">{s.label}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#FFB800] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── PAYMENTS TAB ──────────────────────────────────────────────────── */}
        {tab === 'payments' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {loadingPayments ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading payments…</div>
            ) : filteredPayments.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">No payments found for {month}</p>
                <p className="text-gray-300 text-sm mt-1">Click "Generate Monthly Bills" to create payment records</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {['Receipt', 'Student', 'Amount', 'Service', 'Method', 'Status', 'Date', ''].map(h => (
                        <th key={h} className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p: any) => (
                      <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="p-4 font-mono text-xs text-gray-500">{p.receiptNumber || '—'}</td>
                        <td className="p-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.studentName || '—'}</p>
                            <p className="text-xs text-gray-400">{p.parentName || ''}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.amount, p.currency)}</p>
                          {p.discountAmount > 0 && <p className="text-xs text-emerald-600">-{formatCurrency(p.discountAmount, p.currency)} discount</p>}
                        </td>
                        <td className="p-4"><ServiceTypeBadge type={p.serviceType || 'both'} /></td>
                        <td className="p-4"><PayMethodBadge method={p.paymentMethod} /></td>
                        <td className="p-4"><StatusBadge status={p.status} /></td>
                        <td className="p-4 text-xs text-gray-400">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td className="p-4">
                          {p.status !== 'paid' && (
                            <button onClick={() => setSelectedPayment(p)}
                              className="px-3 py-1.5 bg-[#1B2B6B] text-white text-xs font-medium rounded-lg hover:bg-[#162356] transition">
                              Collect
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── UNPAID TAB ────────────────────────────────────────────────────── */}
        {tab === 'unpaid' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            {loadingUnpaid ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : filteredUnpaid.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 size={32} className="text-emerald-300 mx-auto mb-3" />
                <p className="text-emerald-600 font-medium">All students have paid!</p>
                <p className="text-gray-300 text-sm mt-1">No unpaid records for {month}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {['Student', 'Parent', 'Amount', 'Service', 'Status', 'WhatsApp', ''].map(h => (
                        <th key={h} className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnpaid.map((u: any) => (
                      <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#1B2B6B]/10 flex items-center justify-center text-[#1B2B6B] font-bold text-sm">
                              {u.studentName?.[0]?.toUpperCase() || '?'}
                            </div>
                            <p className="text-sm font-medium text-gray-900">{u.studentName || '—'}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-gray-700">{u.parentName || '—'}</p>
                          {u.parentPhone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{u.parentPhone}</p>}
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(u.amount, u.currency)}</p>
                        </td>
                        <td className="p-4"><ServiceTypeBadge type={u.serviceType || 'both'} /></td>
                        <td className="p-4"><StatusBadge status={u.status} /></td>
                        <td className="p-4">
                          {u.parentPhone && (
                            <a href={`https://wa.me/${u.parentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Dear Parent, this is a reminder that the transport fee of ${formatCurrency(u.amount, u.currency)} for ${u.studentName} is due for ${u.month}. Please contact the school to arrange payment. Thank you.`)}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-medium hover:bg-green-100 transition">
                              <Smartphone size={12} /> WhatsApp
                            </a>
                          )}
                        </td>
                        <td className="p-4">
                          <button onClick={() => setSelectedPayment(u)}
                            className="px-3 py-1.5 bg-[#1B2B6B] text-white text-xs font-medium rounded-lg hover:bg-[#162356] transition">
                            Collect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ─────────────────────────────────────────────────── */}
        {tab === 'settings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{(feeConfigs ?? []).length} fee structure{(feeConfigs ?? []).length !== 1 ? 's' : ''} configured</p>
              <button onClick={() => { setEditingFee(null); setShowFeeConfig(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#1B2B6B] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition disabled:opacity-50"
                disabled={isProfileLoading}>
                <Plus size={15} /> Add Fee Structure
              </button>
            </div>
            {loadingConfigs ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
            ) : !feeConfigs || feeConfigs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <Settings size={32} className="text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No fee structure configured</p>
                <p className="text-gray-300 text-sm mt-1">Click "Add Fee Structure" to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(feeConfigs ?? []).map((fee: any) => (
                  <div key={fee._id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{fee.description || 'Transport Fee'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <ServiceTypeBadge type={fee.serviceType || 'both'} />
                          <span className="text-xs text-gray-400 capitalize">{fee.billingCycle}</span>
                          <span className="text-xs font-medium text-gray-500">{fee.currency}</span>
                        </div>
                      </div>
                      <button onClick={() => { setEditingFee(fee); setShowFeeConfig(true); }}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                        Edit
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-[#1B2B6B]/5 rounded-xl text-center">
                        <p className="text-xs text-gray-400">Pick & Drop</p>
                        <p className="text-lg font-bold text-[#1B2B6B]">{formatCurrency(fee.amount, fee.currency)}</p>
                      </div>
                      {fee.pickOnlyAmount && (
                        <div className="p-3 bg-purple-50 rounded-xl text-center">
                          <p className="text-xs text-gray-400">Pick Only</p>
                          <p className="text-lg font-bold text-purple-700">{formatCurrency(fee.pickOnlyAmount, fee.currency)}</p>
                        </div>
                      )}
                      {fee.dropOnlyAmount && (
                        <div className="p-3 bg-orange-50 rounded-xl text-center">
                          <p className="text-xs text-gray-400">Drop Only</p>
                          <p className="text-lg font-bold text-orange-700">{formatCurrency(fee.dropOnlyAmount, fee.currency)}</p>
                        </div>
                      )}
                    </div>
                    {(fee.siblingDiscountPercent || fee.earlyPaymentDiscountPercent || fee.lateFeeAmount) && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                        {fee.siblingDiscountPercent && <div className="flex items-center gap-2 text-xs text-gray-500"><Percent size={11} className="text-emerald-500" />Sibling discount: {fee.siblingDiscountPercent}%</div>}
                        {fee.earlyPaymentDiscountPercent && <div className="flex items-center gap-2 text-xs text-gray-500"><Percent size={11} className="text-blue-500" />Early payment (before day {fee.earlyPaymentDeadlineDay}): {fee.earlyPaymentDiscountPercent}% off</div>}
                        {fee.lateFeeAmount && <div className="flex items-center gap-2 text-xs text-gray-500"><AlertCircle size={11} className="text-red-500" />Late fee after day {fee.lateFeeAfterDay}: {formatCurrency(fee.lateFeeAmount, fee.currency)}</div>}
                      </div>
                    )}
                    {fee.notes && <p className="mt-2 text-xs text-gray-400 italic">{fee.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
