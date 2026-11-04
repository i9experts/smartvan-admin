'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe, Users, Eye, Clock, MousePointerClick, Radio, Code2, ChevronDown } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { websiteAnalyticsApi } from '@/lib/api';

const RANGE_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '28 days', value: 28 },
  { label: '90 days', value: 90 },
];

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

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds}s`;
}

const SNIPPET = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>`;

function SetupNeeded({ message }: { message?: string }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="text-center py-8">
        <Globe size={32} className="mx-auto mb-3 text-gray-300" />
        <p className="font-semibold text-gray-700">Google Analytics isn&apos;t connected yet</p>
        <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">{message || 'Set up a GA4 property for smartvan.pk to see visitor metrics here.'}</p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center justify-between w-full text-left">
          <span className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <Code2 size={15} /> Setup steps
          </span>
          <ChevronDown size={16} className={`text-amber-600 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="mt-3 text-sm text-amber-900 space-y-2">
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Create a GA4 property for smartvan.pk at <code className="bg-amber-100 px-1 rounded">analytics.google.com</code> → get its Measurement ID (<code className="bg-amber-100 px-1 rounded">G-XXXXXXXXXX</code>).</li>
              <li>Add this snippet to smartvan.pk&apos;s <code className="bg-amber-100 px-1 rounded">&lt;head&gt;</code> (replace both IDs):</li>
            </ol>
            <pre className="bg-white border border-amber-200 rounded-xl p-3 text-xs overflow-x-auto">{SNIPPET}</pre>
            <ol start={3} className="list-decimal list-inside space-y-1.5">
              <li>In GA4: Admin → Property Access Management → add your backend&apos;s service account email as <strong>Viewer</strong>.</li>
              <li>In GA4: Admin → Property Settings → copy the numeric Property ID.</li>
              <li>On the backend, set <code className="bg-amber-100 px-1 rounded">GA4_PROPERTY_ID</code> and <code className="bg-amber-100 px-1 rounded">GA4_SERVICE_ACCOUNT_BASE64</code> (base64 of the service account JSON key) — this page will start showing data automatically.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WebsiteAnalyticsPage() {
  const [days, setDays] = useState(28);

  const { data, isLoading } = useQuery({
    queryKey: ['website-analytics', days],
    queryFn: () => websiteAnalyticsApi.getOverview(days),
    select: (res) => res.data.data,
    staleTime: 60_000,
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
            <Globe size={24} /> Website Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">Visitor metrics for smartvan.pk, from Google Analytics.</p>
        </div>
        {data?.configured && (
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
            {RANGE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setDays(o.value)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  days === o.value ? 'bg-[#1B3B69] text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : !data?.configured ? (
        <SetupNeeded message={data?.setupMessage} />
      ) : data.error ? (
        <div className="bg-white rounded-2xl border border-red-200 p-6 text-center">
          <p className="font-semibold text-red-600">Couldn&apos;t fetch Google Analytics data</p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{data.error}</p>
          <p className="text-xs text-gray-400 mt-3">Most commonly: the service account hasn&apos;t been granted Viewer access to the GA4 property yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-5">
            <StatCard title="Active Now" value={data.realtimeActiveUsers ?? 0} icon={<Radio size={18} />} color="#27AE60" />
            <StatCard title="Users" value={data.summary?.totalUsers ?? 0} sub={`Last ${days}d`} icon={<Users size={18} />} color="#1B3B69" />
            <StatCard title="Sessions" value={data.summary?.sessions ?? 0} sub={`Last ${days}d`} icon={<MousePointerClick size={18} />} color="#2D9CDB" />
            <StatCard title="Pageviews" value={data.summary?.pageViews ?? 0} sub={`Last ${days}d`} icon={<Eye size={18} />} color="#9B59B6" />
            <StatCard title="Avg. Session" value={data.summary ? formatDuration(data.summary.avgSessionDurationSeconds) : '—'} icon={<Clock size={18} />} color="#F2994A" />
            <StatCard title="Bounce Rate" value={data.summary ? `${data.summary.bounceRatePercent}%` : '—'} icon={<Globe size={18} />} color="#EB5757" />
          </div>

          <div className="mb-5">
            <ChartCard title="Traffic Trend" sub={`Users, sessions and pageviews — last ${days} days`}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.trend || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="users" name="Users" stroke="#1B3B69" fill="#1B3B69" fillOpacity={0.12} />
                  <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#2D9CDB" fill="#2D9CDB" fillOpacity={0.12} />
                  <Area type="monotone" dataKey="pageViews" name="Pageviews" stroke="#9B59B6" fill="#9B59B6" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <ChartCard title="Traffic Sources" sub="Sessions by channel">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.trafficSources || []} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="channel" tick={{ fontSize: 12 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="sessions" name="Sessions" fill="#1B3B69" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Devices" sub="Users by device category">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.deviceBreakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="device" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="users" name="Users" fill="#2D9CDB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-3">Top Pages</p>
              {(data.topPages || []).length === 0 ? (
                <p className="text-xs text-gray-300 text-center py-6">No page data yet</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {data.topPages!.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm gap-2">
                      <span className="text-gray-700 truncate" title={p.path}>{p.path}</span>
                      <span className="text-gray-400 shrink-0">{p.views}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-3">Top Countries</p>
              {(data.countryBreakdown || []).length === 0 ? (
                <p className="text-xs text-gray-300 text-center py-6">No country data yet</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {data.countryBreakdown!.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm gap-2">
                      <span className="text-gray-700">{c.country}</span>
                      <span className="text-gray-400">{c.users}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
