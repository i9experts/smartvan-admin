'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Target, Clock, Radar } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { leadsApi } from '@/lib/api';

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  demo: 'Demo',
  trial: 'Trial',
};

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  contact_us: 'Contact Us',
  manual: 'Manual',
  import: 'Import',
  stalled_trial: 'Stalled Trial',
  parent_demand: 'Parent Demand',
};

function StatCard({
  title, value, sub, icon, color,
}: { title: string; value: number | string; sub?: string; icon: React.ReactNode; color: string }) {
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

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function SalesForecastPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['sales-forecast'],
    queryFn: () => leadsApi.getForecast(),
    select: (res) => res.data.data,
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 p-6 text-center py-16 text-gray-400">Loading…</div>;
  }
  if (!data) {
    return <div className="min-h-screen bg-gray-50 p-6 text-center py-16 text-gray-400">No data yet</div>;
  }

  const funnelChartData = data.funnel.map((f) => ({
    stage: STAGE_LABELS[f.stage] || f.stage,
    open: f.currentCount,
    everReached: f.everReachedCount,
  }));

  const trendChartData = data.trend.map((w) => ({
    week: new Date(w.weekStart).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
    created: w.created,
    won: w.won,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
          <Radar size={24} /> Sales Forecast
        </h1>
        <p className="text-gray-500 text-sm mt-1">Pipeline funnel, weighted forecast and historical trends across the whole pipeline.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <StatCard
          title="Weighted Pipeline"
          value={data.weightedPipeline.totalExpectedWins}
          sub="Expected wins from open leads, by stage probability"
          icon={<TrendingUp size={20} />}
          color="#1B3B69"
        />
        <StatCard
          title="Avg. Sales Cycle"
          value={data.avgDaysNewToWon != null ? `${data.avgDaysNewToWon}d` : '—'}
          sub="First contact to Won, across all won leads"
          icon={<Clock size={20} />}
          color="#F2994A"
        />
        <StatCard
          title="Open Pipeline"
          value={data.weightedPipeline.byStage.reduce((s, b) => s + b.openCount, 0)}
          sub="Leads currently in New/Contacted/Demo/Trial"
          icon={<Target size={20} />}
          color="#2D9CDB"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Pipeline Funnel" sub="Currently in each stage vs. ever reached it">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={funnelChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="everReached" name="Ever reached" fill="#C7D2E8" radius={[6, 6, 0, 0]} />
              <Bar dataKey="open" name="Currently here" fill="#1B3B69" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="12-Week Trend" sub="Leads created vs. won, by week">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="created" name="Created" stroke="#2D9CDB" fill="#2D9CDB" fillOpacity={0.15} />
              <Area type="monotone" dataKey="won" name="Won" stroke="#27AE60" fill="#27AE60" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-800 mb-1">Stage Conversion &amp; Cycle Time</p>
          <p className="text-xs text-gray-400 mb-3">How many leads that ever reached a stage went on to win, and how long they typically stayed there.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Stage</th>
                  <th className="text-left py-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Ever Reached</th>
                  <th className="text-left py-2 font-medium text-gray-500 text-xs uppercase tracking-wide">→ Won</th>
                  <th className="text-left py-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Avg. Days</th>
                </tr>
              </thead>
              <tbody>
                {data.funnel.map((f) => (
                  <tr key={f.stage} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700 font-medium">{STAGE_LABELS[f.stage] || f.stage}</td>
                    <td className="py-2 text-gray-600">{f.everReachedCount}</td>
                    <td className="py-2 text-gray-600">{f.wonFromHereRate != null ? `${f.wonFromHereRate}%` : '—'}</td>
                    <td className="py-2 text-gray-600">{f.avgDaysInStage != null ? `${f.avgDaysInStage}d` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-800 mb-1">Lead Source Performance</p>
          <p className="text-xs text-gray-400 mb-3">Which channel actually converts into paying schools.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Source</th>
                  <th className="text-left py-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Total</th>
                  <th className="text-left py-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Won</th>
                  <th className="text-left py-2 font-medium text-gray-500 text-xs uppercase tracking-wide">Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.sourcePerformance.map((s) => (
                  <tr key={s.source} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700 font-medium">{SOURCE_LABELS[s.source] || s.source}</td>
                    <td className="py-2 text-gray-600">{s.total}</td>
                    <td className="py-2 text-gray-600">{s.won}</td>
                    <td className="py-2 text-gray-600">{s.conversionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
