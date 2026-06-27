'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  DollarSign, Users, CheckCircle2, Clock,
  AlertCircle, Search, Bell, Plus, Download,
  Phone, MessageSquare, RefreshCw,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL;

const SCHOOLS = [
  { id: '69957df71a7d01775866f847', name: 'Bright Future School' },
  { id: '699ffeb62ae6a3d9f218bda0', name: 'Green Valley Public School' },
  { id: '69c2956facae7ff89be7bd2f', name: 'Ahad School' },
];

function getCurrentMonth() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

function Avatar({ name, image, size = 34 }: { name: string; image?: string | null; size?: number }) {
  if (image) return (
    <img src={image} alt={name}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
      onError={(e: any) => { e.target.style.display = 'none'; }}
    />
  );
  return (
    <div className="rounded-full bg-[#1B2B6B] flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function FeesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'unpaid' | 'settings'>('overview');
  const [schoolId, setSchoolId] = useState(SCHOOLS[0].id);
  const [month, setMonth] = useState(getCurrentMonth());
  const [search, setSearch] = useState('');

  // Data state
  const [payments, setPayments] = useState<any>(null);
  const [unpaid, setUnpaid] = useState<any>(null);
  const [feeConfig, setFeeConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fee settings form
  const [feeAmount, setFeeAmount] = useState('');
  const [feeCurrency, setFeeCurrency] = useState('PKR');
  const [feeDesc, setFeeDesc] = useState('');
  const [settingFee, setSettingFee] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  // Record payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedKid, setSelectedKid] = useState<any>(null);
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');
  const [recordingPay, setRecordingPay] = useState(false);

  const getToken = () => {
    const token = localStorage.getItem('smartvan_token');
    if (!token) { router.push('/auth/login'); return null; }
    return token;
  };

  useEffect(() => { fetchAll(); }, [schoolId, month]);

  const fetchAll = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [paymentsRes, unpaidRes, feeRes] = await Promise.all([
        axios.get(`${API}/fees/payments`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { schoolId, month },
        }),
        axios.get(`${API}/fees/unpaid`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { schoolId, month },
        }),
        axios.get(`${API}/fees/school`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { schoolId },
        }),
      ]);
      setPayments(paymentsRes.data);
      setUnpaid(unpaidRes.data);
      const fees = feeRes.data.data || [];
      if (fees.length > 0) {
        setFeeConfig(fees[0]);
        setFeeAmount(String(fees[0].amount));
        setFeeCurrency(fees[0].currency);
        setFeeDesc(fees[0].description || '');
      }
    } catch (err: any) {
      if (err.response?.status === 401) router.push('/auth/login');
      else setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetFee = async () => {
    const token = getToken();
    if (!token || !feeAmount) return;
    setSettingFee(true);
    try {
      await axios.post(`${API}/fees/set`, {
        schoolId, amount: Number(feeAmount),
        currency: feeCurrency, description: feeDesc,
      }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchAll();
      alert('Fee updated successfully!');
    } catch { alert('Failed to set fee.'); }
    finally { setSettingFee(false); }
  };

  const handleGenerateMonthly = async () => {
    const token = getToken();
    if (!token) return;
    if (!confirm('Generate payment records for all students this month?')) return;
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/fees/generate-monthly`,
        { schoolId, month },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchAll();
      alert(`Created ${res.data.created} records, skipped ${res.data.skipped} existing.`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate records.');
    } finally { setGenerating(false); }
  };

  const handleRecordPayment = async () => {
    if (!selectedKid) return;
    const token = getToken();
    if (!token) return;
    setRecordingPay(true);
    try {
      const res = await axios.post(`${API}/fees/record-payment`, {
        schoolId,
        kidId: selectedKid.kidId,
        parentId: selectedKid.parentId,
        month,
        paymentMethod: payMethod,
        notes: payNotes,
      }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchAll();
      setShowPayModal(false);
      setSelectedKid(null);
      setPayNotes('');
      alert('Payment recorded! Receipt: ' + res.data.data.receiptNumber);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment.');
    } finally { setRecordingPay(false); }
  };

  const handleSendReminders = async () => {
    const token = getToken();
    if (!token) return;
    if (!confirm('Send FCM payment reminders to all unpaid parents?')) return;
    setSendingReminders(true);
    try {
      const res = await axios.post(`${API}/fees/send-reminders`,
        { schoolId, month },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Reminders sent to ' + res.data.sent + ' parents.');
    } catch { alert('Failed to send reminders.'); }
    finally { setSendingReminders(false); }
  };

  const exportCSV = () => {
    if (!payments) return;
    const rows = [
      ['Student', 'Status', 'Amount', 'Currency', 'Method', 'Paid At', 'Receipt'],
      ...payments.data.map((p: any) => [
        p.kidName, p.status, p.amount, p.currency,
        p.paymentMethod, p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '',
        p.receiptNumber,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fees-${schoolId}-${month}.csv`;
    a.click();
  };

  const filteredUnpaid = (unpaid?.data || []).filter((p: any) =>
    !search ||
    p.kidName?.toLowerCase().includes(search.toLowerCase()) ||
    p.parentName?.toLowerCase().includes(search.toLowerCase()) ||
    p.parentPhone?.includes(search)
  );

  const filteredPaid = (payments?.data || []).filter((p: any) =>
    p.status === 'paid' && (
      !search || p.kidName?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B6B]">Fee Management</h1>
          <p className="text-gray-500 text-sm mt-1">Track transport fee payments — cash, JazzCash, bank transfer</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} disabled={!payments}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={handleSendReminders} disabled={sendingReminders}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-xl text-sm font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50">
            <Bell size={15} /> {sendingReminders ? 'Sending…' : 'Send Reminders'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center">
        <select value={schoolId} onChange={e => setSchoolId(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none bg-gray-50">
          {SCHOOLS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 outline-none bg-gray-50" />
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search size={15} className="text-gray-400" />
          <input type="text" placeholder="Search student, parent, phone…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="text-sm text-gray-700 bg-transparent outline-none w-full" />
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-[#1B2B6B] transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      {payments && (
        <div className="grid grid-cols-4 gap-4 mb-5">
          {[
            { label: 'Total Students', value: payments.summary.total, color: '#1B2B6B', icon: <Users size={18} /> },
            { label: 'Paid', value: payments.summary.paid, color: '#10b981', icon: <CheckCircle2 size={18} /> },
            { label: 'Pending', value: payments.summary.pending, color: '#f59e0b', icon: <Clock size={18} /> },
            { label: 'Collected', value: payments.summary.currency + ' ' + payments.summary.totalAmount?.toLocaleString(), color: '#1B2B6B', icon: <DollarSign size={18} /> },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">{s.label}</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.color + '15' }}>
                  <div style={{ color: s.color }}>{s.icon}</div>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              {s.label === 'Total Students' && payments.summary.total > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.round((payments.summary.paid / payments.summary.total) * 100)}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {Math.round((payments.summary.paid / payments.summary.total) * 100)}% collection rate
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-5">
        {[
          { key: 'overview', label: '📊 All Payments' },
          { key: 'unpaid', label: '⏳ Unpaid (' + (unpaid?.total || 0) + ')' },
          { key: 'settings', label: '⚙️ Fee Settings' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-[#1B2B6B] text-white' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm flex items-center gap-2">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* ── ALL PAYMENTS TAB ── */}
      {tab === 'overview' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">⏳</div><p>Loading…</p></div>
          ) : (payments?.data || []).length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📋</div>
              <p className="font-medium">No payment records yet</p>
              <button onClick={handleGenerateMonthly} disabled={generating}
                className="mt-4 px-5 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-semibold hover:bg-[#111d4a]">
                {generating ? 'Generating…' : '+ Generate This Month\'s Records'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['#', 'Student', 'Status', 'Amount', 'Method', 'Paid At', 'Receipt', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(payments?.data || []).map((p: any, i: number) => (
                    <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3.5 text-gray-400 text-xs font-mono">{i + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={p.kidName} image={p.kidImage} size={32} />
                          <span className="font-semibold text-gray-800">{p.kidName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          p.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            p.status === 'paid' ? 'bg-emerald-500' :
                            p.status === 'overdue' ? 'bg-red-500' : 'bg-yellow-500'
                          }`} />
                          {p.status === 'paid' ? 'Paid' : p.status === 'overdue' ? 'Overdue' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-gray-700">{p.currency} {p.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-gray-500 capitalize">{p.paymentMethod?.replace('_', ' ') || '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">
                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-gray-400">{p.receiptNumber}</td>
                      <td className="px-4 py-3.5">
                        {p.status !== 'paid' && (
                          <button
                            onClick={() => { setSelectedKid(p); setShowPayModal(true); }}
                            className="px-3 py-1 bg-[#1B2B6B] text-white rounded-lg text-xs font-semibold hover:bg-[#111d4a]">
                            Mark Paid
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

      {/* ── UNPAID TAB ── */}
      {tab === 'unpaid' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {filteredUnpaid.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-medium">All students have paid!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['#', 'Student', 'Parent', 'Phone', 'Amount', 'Due', 'Action'].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUnpaid.map((p: any, i: number) => (
                    <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3.5 text-gray-400 text-xs font-mono">{i + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={p.kidName} image={p.kidImage} size={32} />
                          <span className="font-semibold text-gray-800">{p.kidName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{p.parentName}</td>
                      <td className="px-4 py-3.5">
                        <a href={`tel:${p.parentPhone}`}
                          className="flex items-center gap-1 text-[#1B2B6B] hover:underline text-xs">
                          <Phone size={12} /> {p.parentPhone}
                        </a>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-red-600">{p.currency} {p.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">
                          {p.month}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedKid(p); setShowPayModal(true); }}
                            className="px-3 py-1 bg-[#1B2B6B] text-white rounded-lg text-xs font-semibold hover:bg-[#111d4a]">
                            Mark Paid
                          </button>
                          <a href={`https://wa.me/${p.parentPhone?.replace(/[^0-9]/g, '')}?text=Dear ${p.parentName}, transport fee of ${p.currency} ${p.amount} for ${p.kidName} is due for ${p.month}. Please pay at your earliest convenience. - SmartVan`}
                            target="_blank" rel="noreferrer"
                            className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 flex items-center gap-1">
                            <MessageSquare size={11} /> WA
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── FEE SETTINGS TAB ── */}
      {tab === 'settings' && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="font-bold text-[#1B2B6B] mb-4">Set Transport Fee</h3>
            {feeConfig && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-700">
                Current fee: <strong>{feeConfig.currency} {feeConfig.amount?.toLocaleString()}</strong> / {feeConfig.billingCycle}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Monthly Amount</label>
                <input type="number" value={feeAmount} onChange={e => setFeeAmount(e.target.value)}
                  placeholder="e.g. 3000"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1B2B6B]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Currency</label>
                <select value={feeCurrency} onChange={e => setFeeCurrency(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1B2B6B]">
                  <option>PKR</option><option>SAR</option><option>AED</option><option>QAR</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
                <input type="text" value={feeDesc} onChange={e => setFeeDesc(e.target.value)}
                  placeholder="e.g. Monthly transport fee - Route A"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1B2B6B]" />
              </div>
              <button onClick={handleSetFee} disabled={settingFee || !feeAmount}
                className="w-full py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-semibold hover:bg-[#111d4a] disabled:opacity-50">
                {settingFee ? 'Saving…' : 'Save Fee'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="font-bold text-[#1B2B6B] mb-4">Generate Monthly Records</h3>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              This will create a payment record for every active student in this school for the selected month.
              Already-existing records will be skipped automatically.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-sm text-yellow-700">
              <strong>Month:</strong> {month} &nbsp;•&nbsp;
              <strong>School:</strong> {SCHOOLS.find(s => s.id === schoolId)?.name}
            </div>
            <button onClick={handleGenerateMonthly} disabled={generating}
              className="w-full py-2.5 bg-[#FFB800] text-[#1B2B6B] rounded-xl text-sm font-bold hover:bg-[#e6a600] disabled:opacity-50 flex items-center justify-center gap-2">
              <Plus size={15} /> {generating ? 'Generating…' : 'Generate Payment Records'}
            </button>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-600 mb-2">Send Reminders</h4>
              <p className="text-xs text-gray-400 mb-3">Push notification sent to all parents with pending payments.</p>
              <button onClick={handleSendReminders} disabled={sendingReminders}
                className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
                <Bell size={14} /> {sendingReminders ? 'Sending…' : 'Send FCM Reminders to Unpaid Parents'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RECORD PAYMENT MODAL ── */}
      {showPayModal && selectedKid && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowPayModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="bg-[#1B2B6B] p-5 rounded-t-2xl">
              <h2 className="text-white font-bold text-lg">Record Payment</h2>
              <p className="text-white/60 text-sm mt-0.5">{selectedKid.kidName} — {month}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-center">
                <span className="text-sm text-gray-500">Amount Due</span>
                <span className="font-bold text-[#1B2B6B] text-lg">{selectedKid.currency} {selectedKid.amount?.toLocaleString()}</span>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Payment Method</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1B2B6B]">
                  <option value="cash">💵 Cash</option>
                  <option value="jazzcash">📱 JazzCash</option>
                  <option value="easypaisa">📱 EasyPaisa</option>
                  <option value="bank_transfer">🏦 Bank Transfer</option>
                  <option value="card">💳 Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes (optional)</label>
                <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)}
                  placeholder="e.g. Paid by father at school gate"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1B2B6B]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPayModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold">
                  Cancel
                </button>
                <button onClick={handleRecordPayment} disabled={recordingPay}
                  className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-semibold hover:bg-[#111d4a] disabled:opacity-50">
                  {recordingPay ? 'Recording…' : '✓ Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
