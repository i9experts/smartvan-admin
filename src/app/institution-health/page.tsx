'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HeartPulse, ShieldCheck, AlertTriangle, ShieldAlert, Gauge } from 'lucide-react';
import { institutionHealthApi, InstitutionHealth } from '@/lib/api';

const TIER_FILTERS: { label: string; value: 'all' | InstitutionHealth['riskTier'] }[] = [
  { label: 'All', value: 'all' },
  { label: 'Healthy', value: 'healthy' },
  { label: 'At Risk', value: 'at_risk' },
  { label: 'Critical', value: 'critical' },
];

const TIER_STYLE: Record<InstitutionHealth['riskTier'], { label: string; bg: string; text: string; bar: string }> = {
  healthy: { label: 'Healthy', bg: 'bg-green-50', text: 'text-green-700', bar: '#27AE60' },
  at_risk: { label: 'At Risk', bg: 'bg-amber-50', text: 'text-amber-700', bar: '#F2994A' },
  critical: { label: 'Critical', bg: 'bg-red-50', text: 'text-red-700', bar: '#EB5757' },
};

function StatCard({
  title, value, sub, icon, color,
}: { title: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2 w-28">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-7 text-right">{score}</span>
    </div>
  );
}

export default function InstitutionHealthPage() {
  const [filter, setFilter] = useState<'all' | InstitutionHealth['riskTier']>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['institution-health'],
    queryFn: () => institutionHealthApi.getOverview(),
    select: (res) => res.data.data,
    staleTime: 60_000,
  });

  const institutions = (data?.institutions || []).filter((i) => filter === 'all' || i.riskTier === filter);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
          <HeartPulse size={24} /> Institution Health
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Churn-risk score per institution from user engagement, support ticket load, and billing status.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : !data || data.institutions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <HeartPulse size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">No institutions to score yet</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <StatCard title="Avg. Score" value={data.summary.avgScore} sub="out of 100" icon={<Gauge size={18} />} color="#1B3B69" />
            <StatCard title="Healthy" value={data.summary.healthy} icon={<ShieldCheck size={18} />} color="#27AE60" />
            <StatCard title="At Risk" value={data.summary.atRisk} icon={<AlertTriangle size={18} />} color="#F2994A" />
            <StatCard title="Critical" value={data.summary.critical} icon={<ShieldAlert size={18} />} color="#EB5757" />
          </div>

          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1 mb-4 w-fit">
            {TIER_FILTERS.map((t) => (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  filter === t.value ? 'bg-[#1B3B69] text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                    <th className="pb-2 font-medium">Institution</th>
                    <th className="pb-2 font-medium">Risk</th>
                    <th className="pb-2 font-medium">Score</th>
                    <th className="pb-2 font-medium text-right">Engagement</th>
                    <th className="pb-2 font-medium text-right">Open Tickets</th>
                    <th className="pb-2 font-medium text-right">Avg. Resolution</th>
                    <th className="pb-2 font-medium text-right">Billing</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((inst) => {
                    const style = TIER_STYLE[inst.riskTier];
                    return (
                      <tr key={inst.schoolId} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 text-gray-800 font-medium">
                          {inst.schoolName}
                          {inst.isNew && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 align-middle">
                              New
                            </span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{style.label}</span>
                        </td>
                        <td className="py-2.5">
                          <ScoreBar score={inst.score} color={style.bar} />
                        </td>
                        <td className="py-2.5 text-right text-gray-600">
                          {inst.signals.engagementPercent}%
                          <span className="text-gray-300"> ({inst.signals.activeUsers}/{inst.signals.totalUsers})</span>
                        </td>
                        <td className="py-2.5 text-right text-gray-600">{inst.signals.openTickets}</td>
                        <td className="py-2.5 text-right text-gray-600">
                          {inst.signals.avgResolutionHours === null ? '—' : `${inst.signals.avgResolutionHours}h`}
                        </td>
                        <td className="py-2.5 text-right">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              inst.signals.billingStatus === 'payment_failed' || inst.signals.premiumStatus === 'payment_failed'
                                ? 'bg-red-50 text-red-600'
                                : inst.signals.billingStatus === 'active'
                                ? 'bg-green-50 text-green-600'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {inst.signals.billingStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {institutions.length === 0 && (
                <p className="text-xs text-gray-300 text-center py-6">No institutions in this tier</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
