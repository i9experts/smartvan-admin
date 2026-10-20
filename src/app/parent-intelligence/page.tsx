'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Baby, Building2, Search, ChevronLeft, ChevronRight,
  GraduationCap, Flag,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { parentIntelligenceApi, ParentIntelligenceRegisterRow } from '@/lib/api';

const PIE_COLORS = ['#1B3B69', '#FEC610'];
const GRADE_LEVELS = [
  'Pre Nursery', 'Nursery', 'KG',
  'G1', 'G2', 'G3', 'G4', 'G5', 'G6',
  'G7', 'G8', 'G9', 'G10', 'G11', 'G12',
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

function RankedList({
  rows, emptyText, countLabel,
}: { rows: { label: string; count: number }[]; emptyText: string; countLabel: string }) {
  if (rows.length === 0) return <p className="text-xs text-gray-300 py-6 text-center">{emptyText}</p>;
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-700 font-medium truncate pr-2" title={r.label}>{i + 1}. {r.label}</span>
            <span className="text-gray-400 shrink-0">{r.count} {countLabel}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1B3B69] rounded-full" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

type GeoField = 'city' | 'country' | 'district' | 'town';

export default function ParentIntelligencePage() {
  const [geoField, setGeoField] = useState<GeoField>('city');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'attached' | 'prospect'>('all');
  const [level, setLevel] = useState<'all' | 'primary' | 'secondary'>('all');
  const [grade, setGrade] = useState('all');
  const [city, setCity] = useState('all');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [page, setPage] = useState(1);

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['parent-intelligence-overview'],
    queryFn: () => parentIntelligenceApi.getOverview(),
    select: (res) => res.data,
    staleTime: 60_000,
  });

  const { data: register, isLoading: registerLoading } = useQuery({
    queryKey: ['parent-intelligence-register', page, search, status, level, grade, city, ageMin, ageMax],
    queryFn: () => parentIntelligenceApi.getRegister({
      page,
      limit: 15,
      search: search || undefined,
      status: status === 'all' ? undefined : status,
      level: level === 'all' ? undefined : level,
      grade: grade === 'all' ? undefined : grade,
      city: city === 'all' ? undefined : city,
      ageMin: ageMin ? Number(ageMin) : undefined,
      ageMax: ageMax ? Number(ageMax) : undefined,
    }),
    select: (res) => res.data,
  });

  const rows: ParentIntelligenceRegisterRow[] = register?.rows ?? [];
  const pagination = { page: register?.page ?? 1, totalPages: register?.totalPages ?? 1, total: register?.total ?? 0 };

  const geoRows = (overview ? overview[`by${geoField[0].toUpperCase()}${geoField.slice(1)}` as 'byCity'] : []) || [];
  const levelData = (overview?.byLevel ?? []).map((l) => ({ name: l._id === 'primary' ? 'Primary' : 'Secondary', value: l.count }));

  const resetFilters = () => {
    setSearch(''); setStatus('all'); setLevel('all'); setGrade('all'); setCity('all'); setAgeMin(''); setAgeMax(''); setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
          <Users size={24} /> Parent Intelligence
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Every registered parent and child on the platform — including families whose school hasn&apos;t joined SmartVan yet.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard
          title="Total Parents"
          value={overviewLoading ? '—' : overview?.totalParents ?? 0}
          sub={overviewLoading ? undefined : `${overview?.linkedParents ?? 0} linked to a school`}
          icon={<Users size={20} />} color="#1B3B69"
        />
        <StatCard
          title="Children on File"
          value={overviewLoading ? '—' : overview?.totalKids ?? 0}
          sub={overviewLoading ? undefined : `${overview?.attachedKids ?? 0} attached · ${overview?.prospectKids ?? 0} prospect`}
          icon={<Baby size={20} />} color="#FEC610"
        />
        <StatCard
          title="Registered, No School Yet"
          value={overviewLoading ? '—' : overview?.unlinkedParents ?? 0}
          sub="Sales opportunity — not yet linked to an onboarded school"
          icon={<Flag size={20} />} color="#EF4444"
        />
        <StatCard
          title="Schools in Demand"
          value={overviewLoading ? '—' : overview?.topUnmetDemandSchools.length ?? 0}
          sub="Distinct unlisted schools named by parents"
          icon={<Building2 size={20} />} color="#10B981"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <ChartCard title="Registrations Over Time" sub="New parent accounts per month">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={overview?.registrationsOverTime ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gReg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B3B69" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1B3B69" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#1B3B69" strokeWidth={2} fill="url(#gReg)" dot={{ fill: '#1B3B69', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Primary vs Secondary" sub="Children by academic level">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={levelData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {levelData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Geographic Distribution" sub="Children by area">
          <div className="flex gap-1.5 mb-2">
            {(['city', 'district', 'town', 'country'] as GeoField[]).map((f) => (
              <button
                key={f}
                onClick={() => setGeoField(f)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg capitalize ${geoField === f ? 'bg-[#1B3B69] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={168}>
            <BarChart data={geoRows} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="value" width={80} tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#FEC610" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Top Unmet Demand" sub="Schools parents named that haven't joined SmartVan yet — sales leads">
          <RankedList
            rows={(overview?.topUnmetDemandSchools ?? []).map((s) => ({ label: s.schoolName, count: s.count }))}
            emptyText="No unlinked school names reported yet"
            countLabel="parents"
          />
        </ChartCard>
        <ChartCard title="Top Active Schools" sub="Onboarded schools with the most children on file">
          <RankedList
            rows={(overview?.topActiveSchools ?? []).map((s) => ({ label: s.schoolName, count: s.count }))}
            emptyText="No linked children yet"
            countLabel="children"
          />
        </ChartCard>
      </div>

      {/* Register */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2"><GraduationCap size={18} /> Parent & Child Register</h2>
        <button onClick={resetFilters} className="text-xs font-medium text-[#1B3B69] hover:underline">Reset filters</button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search size={15} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by parent, child, or school…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="text-sm text-gray-700 bg-transparent outline-none w-full"
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-gray-50 outline-none">
          <option value="all">All Children</option>
          <option value="attached">Attached to a School</option>
          <option value="prospect">Prospect (unlisted school)</option>
        </select>
        <select value={level} onChange={(e) => { setLevel(e.target.value as any); setPage(1); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-gray-50 outline-none">
          <option value="all">All Levels</option>
          <option value="primary">Primary</option>
          <option value="secondary">Secondary</option>
        </select>
        <select value={grade} onChange={(e) => { setGrade(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-gray-50 outline-none">
          <option value="all">All Grades</option>
          {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={city} onChange={(e) => { setCity(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-gray-50 outline-none">
          <option value="all">All Cities</option>
          {(overview?.byCity ?? []).map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <input type="number" placeholder="Age min" value={ageMin} onChange={(e) => { setAgeMin(e.target.value); setPage(1); }}
            className="w-20 text-sm border border-gray-200 rounded-xl px-2.5 py-2 text-gray-600 bg-gray-50 outline-none" />
          <span className="text-gray-300">–</span>
          <input type="number" placeholder="Age max" value={ageMax} onChange={(e) => { setAgeMax(e.target.value); setPage(1); }}
            className="w-20 text-sm border border-gray-200 rounded-xl px-2.5 py-2 text-gray-600 bg-gray-50 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {registerLoading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No matching parents or children</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Parent</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Child</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">School</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Grade</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Age</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Location</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-gray-800">{r.parentName || '—'}</div>
                        <div className="text-xs text-gray-400">{r.parentEmail || r.parentPhone || '—'}</div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{r.kidName || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">{r.schoolName || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">{r.grade || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">{r.age ?? '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {[r.city, r.district].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {r.isProspect ? (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-600">Prospect</span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">Attached</span>
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
