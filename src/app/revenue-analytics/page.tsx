'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Wallet, AlertTriangle, Crown, Layers } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { revenueAnalyticsApi, RevenueInstitution } from '@/lib/api';

const CURRENCY_COLORS: Record<string, string> = {
  PKR: '#1B3B69',
  USD: '#27AE60',
};
const FALLBACK_COLORS = ['#9B59B6', '#F2994A', '#EB5757', '#2D9CDB'];

function colorFor(currency: string, index: number) {
  return CURRENCY_COLORS[currency] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

function formatMoney(amount: number, currency: string) {
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}

function StatCard({
  title, value, sub, icon, color,
}: { title: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function RevenueAnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-analytics'],
    queryFn: () => revenueAnalyticsApi.getOverview(),
    select: (res) => res.data.data,
    staleTime: 60_000,
  });

  const currencies = Object.keys(data?.totals.mrrByCurrency || {});
  const trendData = (data?.trend || []).map((t) => ({ date: t.date, ...t.mrrByCurrency }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
          <TrendingUp size={24} /> Revenue Analytics
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Live MRR/ARR computed from active van billing and Premium subscriptions across every institution.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : !data || currencies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <Wallet size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">No active billed revenue yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Once schools have active van billing or Premium subscriptions, MRR/ARR will show here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {currencies.map((cur) => (
              <StatCard
                key={`mrr-${cur}`}
                title={`MRR (${cur})`}
                value={formatMoney(data.totals.mrrByCurrency[cur] || 0, cur)}
                icon={<Wallet size={18} />}
                color={colorFor(cur, currencies.indexOf(cur))}
              />
            ))}
            {currencies.map((cur) => (
              <StatCard
                key={`arr-${cur}`}
                title={`ARR (${cur})`}
                value={formatMoney(data.totals.arrByCurrency[cur] || 0, cur)}
                sub="MRR × 12"
                icon={<TrendingUp size={18} />}
                color={colorFor(cur, currencies.indexOf(cur))}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <StatCard
              title="Basic vs Premium"
              value={`${data.byTier.basic} / ${data.byTier.premium}`}
              sub="institutions on each tier"
              icon={<Layers size={18} />}
              color="#9B59B6"
            />
            <StatCard
              title="Premium Active"
              value={String(data.premiumActiveCount)}
              sub="paying Premium subscribers"
              icon={<Crown size={18} />}
              color="#F2994A"
            />
            <StatCard
              title="At-Risk MRR"
              value={
                Object.keys(data.atRiskMrrByCurrency).length === 0
                  ? 'None'
                  : Object.entries(data.atRiskMrrByCurrency).map(([c, a]) => formatMoney(a, c)).join(' · ')
              }
              sub="active revenue flagged payment_failed"
              icon={<AlertTriangle size={18} />}
              color="#EB5757"
            />
          </div>

          <div className="mb-5">
            <ChartCard title="MRR Trend" sub="Accumulates a new data point each day this page (or the backend) runs — history starts today">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {currencies.map((cur, i) => (
                    <Area
                      key={cur}
                      type="monotone"
                      dataKey={cur}
                      name={`MRR (${cur})`}
                      stroke={colorFor(cur, i)}
                      fill={colorFor(cur, i)}
                      fillOpacity={0.12}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm font-semibold text-gray-800 mb-3">Top Paying Institutions</p>
            {data.topInstitutions.length === 0 ? (
              <p className="text-xs text-gray-300 text-center py-6">No billed institutions yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                      <th className="pb-2 font-medium">Institution</th>
                      <th className="pb-2 font-medium">Tier</th>
                      <th className="pb-2 font-medium text-right">Van Billing</th>
                      <th className="pb-2 font-medium text-right">Premium</th>
                      <th className="pb-2 font-medium text-right">Monthly Revenue</th>
                      <th className="pb-2 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topInstitutions.map((inst: RevenueInstitution) => (
                      <tr key={inst.schoolId} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 text-gray-800 font-medium">{inst.schoolName}</td>
                        <td className="py-2.5">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              inst.tier === 'premium' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {inst.tier === 'premium' ? 'Premium' : 'Basic'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-gray-600">{formatMoney(inst.vanBilling, inst.currency)}</td>
                        <td className="py-2.5 text-right text-gray-600">{formatMoney(inst.premium, inst.currency)}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-900">
                          {formatMoney(inst.monthlyRevenue, inst.currency)}
                        </td>
                        <td className="py-2.5 text-right">
                          {inst.atRisk ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">At risk</span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">Healthy</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
