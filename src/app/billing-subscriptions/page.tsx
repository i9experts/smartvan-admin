'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Search, Sparkles, ShieldCheck, ChevronLeft, ChevronRight, TrendingUp, AlertTriangle, Send, Check, RefreshCw,
} from 'lucide-react';
import { schoolApi, billingApi } from '@/lib/api';
import { SchoolFeaturesModal } from '@/components/super-admin/SchoolFeaturesModal';

interface Institution {
  schoolId: string;
  schoolName: string;
  featureTier: 'basic' | 'premium';
  premiumSubscriptionStatus: string;
  currentPlan: string;
  subscriptionStatus: string;
  activeVans: number;
  estimatedMonthlyVanBilling: number;
  currency: string;
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'payment_failed', label: 'Overdue' },
  { value: 'no_subscription', label: 'No subscription' },
];

function billingStatusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-600',
    payment_failed: 'bg-red-50 text-red-600',
    past_due: 'bg-amber-50 text-amber-600',
    inactive: 'bg-gray-100 text-gray-500',
    no_subscription: 'bg-gray-100 text-gray-500',
  };
  const label: Record<string, string> = {
    active: 'Active',
    payment_failed: 'Payment failed',
    past_due: 'Past due',
    inactive: 'Inactive',
    no_subscription: 'No subscription',
  };
  const key = status || 'no_subscription';
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${map[key] ?? 'bg-gray-100 text-gray-500'}`}>
      {label[key] ?? key}
    </span>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'bg-gradient-to-br from-[#1B3B69] to-[#2D4099] text-white border-transparent' : 'bg-white border-gray-200'}`}>
      <p className={`text-xs font-medium ${accent ? 'text-white/70' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-white/60' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  );
}

export default function BillingSubscriptionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [managingFeatures, setManagingFeatures] = useState<{ id: string; name: string } | null>(null);
  const [actionResult, setActionResult] = useState<{ schoolId: string; status: 'ok' | 'error'; detail: string } | null>(null);

  const sendReminder = useMutation({
    mutationFn: (schoolId: string) => billingApi.sendReminder(schoolId),
    onSuccess: (res, schoolId) => {
      setActionResult({ schoolId, status: 'ok', detail: `Sent to ${res.data.data.schoolEmail}` });
    },
    onError: (err: any, schoolId) => {
      setActionResult({ schoolId, status: 'error', detail: err?.response?.data?.message || 'Could not send reminder' });
    },
  });

  const syncFromStripe = useMutation({
    mutationFn: (schoolId: string) => billingApi.syncFromStripe(schoolId),
    onSuccess: (res, schoolId) => {
      const { subscriptionStatus, diagnostic } = res.data.data;
      let detail = `Synced — now "${subscriptionStatus}"`;
      if (diagnostic) {
        if (!diagnostic.stripeCustomerId) {
          detail = 'No Stripe customer on file for this school — it has never gone through checkout.';
        } else if (diagnostic.subscriptionsFound.length === 0) {
          detail = `Stripe customer ${diagnostic.stripeCustomerId} has 0 subscriptions — nothing to sync.`;
        } else {
          const prefix = diagnostic.recoveredByEmail ? 'Recovered a lost Stripe link by email — ' : '';
          detail = `${prefix}${diagnostic.stripeCustomerId}: ${diagnostic.subscriptionsFound.map((s) => `${s.type}=${s.status}`).join(', ')}`;
        }
      }
      setActionResult({ schoolId, status: 'ok', detail });
      qc.invalidateQueries({ queryKey: ['billing-institutions'] });
      qc.invalidateQueries({ queryKey: ['billing-plan-breakdown'] });
    },
    onError: (err: any, schoolId) => {
      setActionResult({ schoolId, status: 'error', detail: err?.response?.data?.message || 'Could not sync from Stripe' });
    },
  });

  const { data: breakdown } = useQuery({
    queryKey: ['billing-plan-breakdown'],
    queryFn: () => billingApi.getPlanBreakdown(),
    select: (res) => res.data.data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['billing-institutions', page, search, status],
    queryFn: () =>
      schoolApi.getAll({
        page,
        limit: 10,
        search: search || undefined,
        billingStatus: status !== 'all' ? status : undefined,
      }),
    select: (res) => res.data,
  });

  const institutions: Institution[] = data?.data ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 1 };

  const premiumMrr = breakdown ? breakdown.premiumActiveCount * breakdown.premiumPricePkr : 0;
  const potentialVanBillingPkr = breakdown?.potentialVanBillingByCurrency?.PKR ?? 0;
  const potentialVanBillingOther = Object.entries(breakdown?.potentialVanBillingByCurrency ?? {}).filter(([c]) => c !== 'PKR');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {managingFeatures && (
        <SchoolFeaturesModal
          schoolId={managingFeatures.id}
          schoolName={managingFeatures.name}
          onClose={() => setManagingFeatures(null)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
          <CreditCard size={24} /> Billing &amp; Subscriptions
        </h1>
        <p className="text-gray-500 text-sm mt-1">Plan mix, Premium revenue, and per-institution billing health.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Estimated Premium MRR"
          value={`Rs ${premiumMrr.toLocaleString()}`}
          sub={`${breakdown?.premiumActiveCount ?? 0} active subscriptions`}
          accent
        />
        <StatCard label="Total Institutions" value={`${breakdown?.totalSchools ?? 0}`} />
        <StatCard label="Basic Plan" value={`${breakdown?.byTier.basic ?? 0}`} sub="institutions" />
        <StatCard label="Premium Plan" value={`${breakdown?.byTier.premium ?? 0}`} sub="institutions" />
      </div>

      {breakdown && breakdown.unbilledSchoolsWithVans > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex flex-wrap items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {breakdown.unbilledSchoolsWithVans} institution{breakdown.unbilledSchoolsWithVans === 1 ? '' : 's'} running vans without a confirmed subscription
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Based on their actual active fleet, they represent an estimated{' '}
              <strong>Rs {potentialVanBillingPkr.toLocaleString()}/mo</strong>
              {potentialVanBillingOther.map(([curr, amt]) => <span key={curr}> + {curr} {Number(amt).toLocaleString()}/mo</span>)}
              {' '}in van billing that isn&apos;t yet collected. Use the &quot;No subscription&quot; filter below to find them.
            </p>
          </div>
        </div>
      )}

      {breakdown && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp size={15} className="text-[#1B3B69]" />
            <span className="font-semibold text-gray-700">Van billing status:</span>
          </div>
          {Object.entries(breakdown.byVanBillingStatus).map(([key, count]) => (
            <div key={key} className="flex items-center gap-1.5">
              {billingStatusBadge(key)}
              <span className="text-sm text-gray-600">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search size={15} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by school…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="text-sm text-gray-700 bg-transparent outline-none w-full"
          />
        </div>
        <div className="flex gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatus(tab.value); setPage(1); }}
              className={`text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${
                status === tab.value ? 'bg-[#1B3B69] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : institutions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CreditCard size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No institutions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Institution</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Feature Plan</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Van Billing</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Fleet Value</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Premium Billing</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((inst) => (
                    <tr key={inst.schoolId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-gray-800">{inst.schoolName}</td>
                      <td className="px-5 py-3.5">
                        {inst.featureTier === 'premium' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-[#FEC610]/20 text-[#8a6500]">
                            <Sparkles size={11} /> Premium
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-500">Basic</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">{billingStatusBadge(inst.subscriptionStatus)}</td>
                      <td className="px-5 py-3.5">
                        {inst.activeVans > 0 ? (
                          <div>
                            <span className="font-semibold text-gray-800">{inst.currency} {inst.estimatedMonthlyVanBilling.toLocaleString()}/mo</span>
                            <p className="text-xs text-gray-400">{inst.activeVans} active van{inst.activeVans === 1 ? '' : 's'}</p>
                            {inst.subscriptionStatus !== 'active' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 mt-0.5">
                                <AlertTriangle size={10} /> unbilled
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">{billingStatusBadge(inst.premiumSubscriptionStatus)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setManagingFeatures({ id: inst.schoolId, name: inst.schoolName })}
                            title="Manage features"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#1B3B69] hover:bg-gray-100"
                          >
                            <ShieldCheck size={15} />
                          </button>
                          {inst.activeVans > 0 && inst.subscriptionStatus !== 'active' && (
                            <button
                              onClick={() => { setActionResult(null); sendReminder.mutate(inst.schoolId); }}
                              disabled={sendReminder.isPending && sendReminder.variables === inst.schoolId}
                              title="Email a payment link to this school"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-40"
                            >
                              <Send size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => { setActionResult(null); syncFromStripe.mutate(inst.schoolId); }}
                            disabled={syncFromStripe.isPending && syncFromStripe.variables === inst.schoolId}
                            title="Re-check this school's real status directly from Stripe"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#1B3B69] hover:bg-gray-100 disabled:opacity-40"
                          >
                            <RefreshCw size={15} className={syncFromStripe.isPending && syncFromStripe.variables === inst.schoolId ? 'animate-spin' : ''} />
                          </button>
                        </div>
                        {actionResult?.schoolId === inst.schoolId && (
                          <p className={`text-[11px] mt-1 flex items-center gap-1 ${actionResult.status === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {actionResult.status === 'ok' && <Check size={10} />}
                            {actionResult.detail}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50">
                  <ChevronLeft size={15} />
                </button>
                <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
