'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, CheckCircle2, Clock, AlertCircle,
  Bus, FileText, ExternalLink,
  Zap, Building2, Users,
  XCircle, RefreshCw, Sparkles, Lock, Calendar, Repeat,
} from 'lucide-react';
import { api, billingApi, featureApi } from '@/lib/api';

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
const BASIC_FEATURES = [
  'Live GPS tracking', 'Student management', 'Vans & driver management',
  'Parent management', 'Route planner', 'Safety & operational alerts', 'Daily attendance',
];
const PREMIUM_FEATURES = [
  'Analytics dashboard', 'AI route optimization', 'Safety checklist compliance',
  'Ratings & reviews log', 'Complaints & reports', 'Fee management', 'Fleet health',
];

function SyncIndicator({ syncing, lastSynced }: { syncing: boolean; lastSynced: Date | null }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-400">
      <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
      {syncing ? 'Syncing with Stripe…' : lastSynced ? `Synced ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
    </span>
  );
}

function SchoolBillingView() {
  const qc = useQueryClient();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const { data: status, isLoading: statusLoading, isError: statusError, refetch: refetchStatus } = useQuery({
    queryKey: ['billing-status'],
    queryFn: () => api.get('/billing/status').then(r => r.data),
    staleTime: 30_000,
  });

  const { data: history = [], isLoading: historyLoading, isError: historyError } = useQuery({
    queryKey: ['billing-history'],
    queryFn: () => api.get('/billing/history').then(r => r.data),
    staleTime: 60_000,
  });

  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ['my-features'],
    queryFn: () => featureApi.getMyFeatures(),
    select: (res) => res.data?.data,
    staleTime: 30_000,
  });

  function runSync() {
    setSyncing(true);
    return billingApi.syncMyStatus().then(() => {
      qc.invalidateQueries({ queryKey: ['billing-status'] });
      qc.invalidateQueries({ queryKey: ['billing-history'] });
      qc.invalidateQueries({ queryKey: ['my-features'] });
      setLastSynced(new Date());
    }).catch(() => {
      // Best-effort — the page still works off its own live /billing/status
      // and /billing/history reads even if this sync call fails.
    }).finally(() => setSyncing(false));
  }

  // Reconciles this school's status directly from Stripe on every visit,
  // independent of webhook delivery — so returning from Stripe Checkout (or
  // any payment that happened while the admin wasn't watching) reflects
  // here and unlocks Premium immediately rather than waiting on a webhook.
  useEffect(() => {
    runSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function handleUpgradePremium() {
    setPremiumLoading(true);
    setError('');
    try {
      const res = await api.post('/billing/premium/create-checkout', {});
      if (res.data?.sessionUrl) window.location.href = res.data.sessionUrl;
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to start Premium checkout');
    } finally {
      setPremiumLoading(false);
    }
  }

  const bill = status?.bill;
  const subscription = status?.subscription;
  const isActive = status?.status === 'active';
  const isPremium = features?.featureTier === 'premium' && features?.premiumSubscriptionStatus === 'active';
  const premiumPastDue = features?.premiumSubscriptionStatus === 'payment_failed';

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3B69]">Billing &amp; Subscription</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your van billing and Premium plan</p>
        </div>
        <div className="flex items-center gap-3">
          <SyncIndicator syncing={syncing} lastSynced={lastSynced} />
          <button
            onClick={() => runSync()}
            disabled={syncing}
            title="Re-check status with Stripe"
            className="p-2 rounded-lg text-gray-400 hover:text-[#1B3B69] hover:bg-gray-100 disabled:opacity-40"
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {statusError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
          <AlertCircle size={16} />
          <span className="flex-1">
            Couldn&apos;t load your subscription status — this is NOT a &quot;no plan&quot;
            state, the request just failed.
          </span>
          <button onClick={() => refetchStatus()} className="underline underline-offset-2 shrink-0">
            Retry
          </button>
        </div>
      )}

      {/* Hero: Van Billing + Premium side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Van Billing card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-br from-[#1B3B69] to-[#2D4099] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wide">Van Billing</p>
                {statusLoading ? (
                  <div className="h-9 w-32 bg-white/20 rounded-lg mt-2 animate-pulse" />
                ) : (
                  <p className="text-3xl font-bold text-white mt-1">{bill ? formatCurrency(bill.totalAmount, bill.currency) : '—'}<span className="text-sm font-normal text-white/60">/mo</span></p>
                )}
                <p className="text-white/70 text-xs mt-1">{bill ? `${bill.totalVans} active van${bill.totalVans !== 1 ? 's' : ''}` : ''}</p>
              </div>
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
                <CreditCard size={22} className="text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isActive ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-200'
              }`}>
                {isActive ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                {statusError ? 'Unknown' : (status?.plan || 'No Plan')}
              </span>
            </div>
          </div>
          <div className="p-5">
            {subscription ? (
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-1.5"><Calendar size={13} /> Next billing date</span>
                  <span className="font-medium text-gray-800">{formatDate(subscription.currentPeriodEnd)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-1.5"><Repeat size={13} /> Auto-renew</span>
                  <span className={`font-medium ${subscription.cancelAtPeriodEnd ? 'text-red-500' : 'text-emerald-600'}`}>
                    {subscription.cancelAtPeriodEnd ? 'Cancelled' : 'Active'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-4">Pay per van — your bill adjusts automatically each month as you add or remove vans.</p>
            )}
            {!isActive && !statusError && (
              <button
                onClick={handleSubscribe}
                disabled={checkoutLoading}
                className="w-full py-2.5 bg-[#1B3B69] text-white text-sm font-semibold rounded-xl hover:bg-[#162356] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Zap size={15} />
                {checkoutLoading ? 'Redirecting to payment…' : 'Subscribe Now'}
              </button>
            )}
          </div>
        </div>

        {/* Premium card */}
        <div className={`rounded-2xl border overflow-hidden ${isPremium ? 'border-[#FEC610]/60' : 'border-gray-200'}`}>
          <div className={`p-6 ${isPremium ? 'bg-gradient-to-br from-[#1B3B69] to-[#2D4099]' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${isPremium ? 'text-white/70' : 'text-gray-400'}`}>Premium</p>
                <p className={`text-3xl font-bold mt-1 ${isPremium ? 'text-white' : 'text-gray-900'}`}>
                  {featuresLoading ? '—' : isPremium ? 'Unlocked' : 'PKR 4,990'}
                  {!isPremium && !featuresLoading && <span className="text-sm font-normal text-gray-400">/mo</span>}
                </p>
                <p className={`text-xs mt-1 ${isPremium ? 'text-white/70' : 'text-gray-400'}`}>
                  {isPremium ? 'All Premium features active' : 'One flat add-on for your whole school'}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isPremium ? 'bg-white/15' : 'bg-[#FEC610]/20'}`}>
                {isPremium ? <Sparkles size={22} className="text-white" /> : <Lock size={20} className="text-[#8a6500]" />}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isPremium ? 'bg-emerald-400/20 text-emerald-200' : premiumPastDue ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-600'
              }`}>
                {isPremium ? <CheckCircle2 size={12} /> : premiumPastDue ? <AlertCircle size={12} /> : <Lock size={12} />}
                {featuresLoading ? 'Checking…' : isPremium ? 'Active' : premiumPastDue ? 'Payment failed' : 'Not subscribed'}
              </span>
            </div>
          </div>
          <div className="p-5">
            <ul className="space-y-1.5 mb-4">
              {PREMIUM_FEATURES.slice(0, 4).map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> {f}
                </li>
              ))}
              <li className="text-xs text-gray-400 pl-[18px]">+ {PREMIUM_FEATURES.length - 4} more</li>
            </ul>
            {!isPremium && (
              <button
                onClick={handleUpgradePremium}
                disabled={premiumLoading}
                className="w-full py-2.5 bg-[#1B3B69] text-white text-sm font-semibold rounded-xl hover:bg-[#162356] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles size={15} />
                {premiumLoading ? 'Redirecting to payment…' : premiumPastDue ? 'Update Payment' : 'Unlock Premium'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Van Breakdown */}
      {bill && bill.breakdown?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><Bus size={15} className="text-[#1B3B69]" /> Van Breakdown</h3>
          <div className="space-y-2.5">
            {bill.breakdown.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#1B3B69]/10 rounded-xl flex items-center justify-center">
                    <Bus size={16} className="text-[#1B3B69]" />
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
      )}

      {/* What's Included */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4">What&apos;s Included</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Basic — every van</p>
            <ul className="space-y-1.5">
              {BASIC_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#8a6500] uppercase tracking-wide mb-2.5 flex items-center gap-1"><Sparkles size={11} /> Premium add-on</p>
            <ul className="space-y-1.5">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className={`flex items-center gap-2 text-sm ${isPremium ? 'text-gray-600' : 'text-gray-400'}`}>
                  {isPremium ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> : <Lock size={11} className="text-gray-300 shrink-0" />} {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><FileText size={15} className="text-[#1B3B69]" /> Payment History</h3>
        {historyLoading ? (
          <div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}</div>
        ) : historyError ? (
          <div className="text-center py-10 text-red-500">
            <p className="text-sm">Failed to load payment history. Please refresh.</p>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <FileText size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No payment history yet</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${inv.status === 'paid' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {inv.status === 'paid' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-red-500" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(inv.amount, inv.currency)}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${inv.type === 'premium_feature_tier' ? 'bg-[#FEC610]/20 text-[#8a6500]' : 'bg-blue-50 text-[#1B3B69]'}`}>
                        {inv.type === 'premium_feature_tier' ? 'Premium' : 'Van Billing'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(inv.date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
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
  const { data: schools = [], isLoading, isError, refetch, isRefetching } = useQuery({
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

      {isError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
          <XCircle size={16} />
          Couldn&apos;t load subscription data — the counts below aren&apos;t reliable.
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: 'Total Schools', value: schools.length, icon: <Building2 size={20} />, color: 'text-[#1B3B69]', bg: 'bg-blue-50' },
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
        ) : isError ? (
          <div className="text-center py-16 text-red-500">
            <p className="text-sm font-medium">
              Failed to load school subscriptions — this is NOT the same as zero
              active subscriptions, the request just failed.
            </p>
            <button onClick={() => refetch()} className="mt-3 text-xs underline underline-offset-2">
              Try again
            </button>
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
                      <div className="w-8 h-8 bg-[#1B3B69]/10 rounded-lg flex items-center justify-center text-[#1B3B69] font-bold text-sm">
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
                    <button
                      onClick={() => refetch()}
                      disabled={isRefetching}
                      title="Refresh billing data"
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition disabled:opacity-50">
                      <RefreshCw size={13} className={isRefetching ? 'animate-spin' : ''} />
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
