'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard, CheckCircle2, Clock, AlertCircle,
  DollarSign, Bus, FileText, ExternalLink,
  Zap, Shield, TrendingUp, Building2, Users,
  XCircle, RefreshCw,
} from 'lucide-react';
import { api } from '@/lib/api';

function formatCurrency(amount: number, currency: string) {
  if (currency === 'PKR') return `PKR ${amount.toLocaleString()}`;
  return `$${amount.toLocaleString()} ${currency}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function useRole() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  useEffect(() => {
    try {
      const token = localStorage.getItem('smartvan_token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      setIsSuperAdmin(payload.role === 'superadmin');
    } catch {}
  }, []);
  return isSuperAdmin;
}

// ─── School Admin Billing View ────────────────────────────────────────────────
function SchoolBillingView() {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['billing-status'],
    queryFn: () => api.get('/billing/status').then(r => r.data),
    staleTime: 30_000,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['billing-history'],
    queryFn: () => api.get('/billing/history').then(r => r.data),
    staleTime: 60_000,
  });

  async function handleSubscribe() {
    setCheckoutLoading(true);
    setError('');
    try {
      const res = await api.post('/billing/create-checkout', {});
      if (res.data?.sessionUrl) window.location.href = res.data.sessionUrl;
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to create checkout session');
    } finally {
      setCheckoutLoading(false);
    }
  }

  const bill = status?.bill;
  const subscription = status?.subscription;
  const isActive = status?.status === 'active';

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your SmartVan subscription</p>
        </div>
        {isActive && (
          <span className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 text-sm font-semibold rounded-xl border border-green-200">
            <CheckCircle2 size={16} /> Active Subscription
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {statusLoading ? (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse h-48" />
      ) : bill && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#1B2B6B] to-[#2D4099] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Monthly Bill</p>
                <p className="text-4xl font-bold text-white mt-1">{formatCurrency(bill.totalAmount, bill.currency)}</p>
                <p className="text-white/70 text-sm mt-1">{bill.totalVans} active van{bill.totalVans !== 1 ? 's' : ''}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <CreditCard size={32} className="text-white" />
              </div>
            </div>
          </div>
          <div className="p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Van Breakdown</h3>
            <div className="space-y-3">
              {bill.breakdown.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#1B2B6B]/10 rounded-xl flex items-center justify-center">
                      <Bus size={18} className="text-[#1B2B6B]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.carNumber}</p>
                      <p className="text-xs text-gray-400">{item.label}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.amount, item.currency)}/mo</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-green-50' : 'bg-amber-50'}`}>
              {isActive ? <CheckCircle2 size={20} className="text-green-600" /> : <Clock size={20} className="text-amber-600" />}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Subscription Status</p>
              <p className={`text-xs font-medium ${isActive ? 'text-green-600' : 'text-amber-600'}`}>{status?.plan || 'No Plan'}</p>
            </div>
          </div>
          {subscription && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Next billing date</span>
                <span className="font-medium text-gray-900">{formatDate(subscription.currentPeriodEnd)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Auto-renew</span>
                <span className={`font-medium ${subscription.cancelAtPeriodEnd ? 'text-red-500' : 'text-green-600'}`}>
                  {subscription.cancelAtPeriodEnd ? 'Cancelled' : 'Active'}
                </span>
              </div>
            </div>
          )}
          {!isActive && (
            <button
              onClick={handleSubscribe}
              disabled={checkoutLoading}
              className="mt-4 w-full py-3 bg-[#1B2B6B] text-white text-sm font-semibold rounded-xl hover:bg-[#162356] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Zap size={16} />
              {checkoutLoading ? 'Redirecting to payment...' : 'Subscribe Now'}
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-sm font-bold text-gray-900 mb-4">What&apos;s Included</p>
          <div className="space-y-3">
            {[
              { icon: <TrendingUp size={15} />, text: 'Real-time GPS tracking' },
              { icon: <Shield size={15} />, text: 'Student attendance & safety' },
              { icon: <Bus size={15} />, text: 'Fleet management' },
              { icon: <CreditCard size={15} />, text: 'Fee collection & reports' },
              { icon: <CheckCircle2 size={15} />, text: 'WhatsApp notifications' },
              { icon: <DollarSign size={15} />, text: 'Parent mobile app access' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                <span className="text-green-600">{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Payment History</h3>
        {historyLoading ? (
          <div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}</div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <FileText size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No payment history yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${inv.status === 'paid' ? 'bg-green-50' : 'bg-red-50'}`}>
                    {inv.status === 'paid' ? <CheckCircle2 size={16} className="text-green-600" /> : <AlertCircle size={16} className="text-red-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(inv.amount, inv.currency)}</p>
                    <p className="text-xs text-gray-400">{formatDate(inv.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${inv.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {inv.status}
                  </span>
                  {inv.pdfUrl && (
                    <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 transition">
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Superadmin Billing Dashboard ─────────────────────────────────────────────
function SuperAdminBillingView() {
  const { data: schools = [], isLoading } = useQuery({
    queryKey: ['all-schools-billing'],
    queryFn: () => api.get('/billing/all-schools').then(r => r.data),
    staleTime: 60_000,
  });

  const active = schools.filter((s: any) => s.subscriptionStatus === 'active').length;
  const inactive = schools.filter((s: any) => s.subscriptionStatus !== 'active').length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Monitor all school subscriptions</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: 'Total Schools', value: schools.length, icon: <Building2 size={20} />, color: 'text-[#1B2B6B]', bg: 'bg-blue-50' },
          { label: 'Active', value: active, icon: <CheckCircle2 size={20} />, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Inactive', value: inactive, icon: <XCircle size={20} />, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center ${kpi.color}`}>
                {kpi.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-xs text-gray-400">{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Schools List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">All School Subscriptions</h3>
        </div>
        {isLoading ? (
          <div className="p-5 animate-pulse space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
          </div>
        ) : schools.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No subscribed schools yet</p>
            <p className="text-xs mt-1">Schools will appear here once they subscribe</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['School', 'Status', 'Next Billing', 'Actions'].map(h => (
                  <th key={h} className="p-4 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schools.map((school: any) => (
                <tr key={school.schoolId} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#1B2B6B]/10 rounded-lg flex items-center justify-center text-[#1B2B6B] font-bold text-sm">
                        {school.schoolName?.[0] || 'S'}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{school.schoolName}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      school.subscriptionStatus === 'active'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-600'
                    }`}>
                      {school.subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {school.currentPeriodEnd ? formatDate(school.currentPeriodEnd) : '—'}
                  </td>
                  <td className="p-4">
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition">
                      <RefreshCw size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const isSuperAdmin = useRole();
  return isSuperAdmin ? <SuperAdminBillingView /> : <SchoolBillingView />;
}
