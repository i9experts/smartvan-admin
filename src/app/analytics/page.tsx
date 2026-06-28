'use client';

import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, Users, Bus, MapPin,
  AlertTriangle, Activity, Clock, CheckCircle2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { studentApi, vanApi, tripApi, reportApi } from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}

function getDayLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  title, value, sub, icon, color, trend,
}: {
  title: string; value: number | string; sub?: string;
  icon: React.ReactNode; color: string; trend?: number;
}) {
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
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2 text-xs">
          {trend >= 0
            ? <TrendingUp size={12} className="text-emerald-500" />
            : <TrendingDown size={12} className="text-red-400" />}
          <span className={trend >= 0 ? 'text-emerald-600' : 'text-red-500'}>
            {trend >= 0 ? '+' : ''}{trend}% this week
          </span>
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="w-10 h-10 bg-gray-200 rounded-xl" />
      </div>
      <div className="h-8 bg-gray-200 rounded w-16 mb-1" />
      <div className="h-3 bg-gray-100 rounded w-28" />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data: students = [], isLoading: ls } = useQuery({
    queryKey: ['analytics-students'],
    queryFn: async () => {
      const r = await studentApi.getAll({ page: 1, limit: 1000 });
      return (r.data?.data ?? []).map((item: any) => ({
        status: item.student?.status ?? 'inactive',
        grade: item.student?.grade,
        VanId: item.van?.id,
        verifiedBySchool: item.student?.verifiedBySchool ?? false,
      }));
    },
    staleTime: 120_000,
  });

  const { data: vans = [], isLoading: lv } = useQuery({
    queryKey: ['analytics-vans'],
    queryFn: async () => {
      const r = await vanApi.getByAdmin({ page: 1, limit: 1000 });
      return (r.data?.data ?? []).map((item: any) => ({
        status: item.van?.status ?? 'inactive',
        driverId: item.driver?.id,
      }));
    },
    staleTime: 120_000,
  });

  const { data: trips = [], isLoading: lt } = useQuery({
    queryKey: ['analytics-trips'],
    queryFn: async () => { const r = await tripApi.getByAdmin({ page: 1, limit: 1000 }); return r.data?.data ?? []; },
    staleTime: 60_000,
  });

  const { data: complaints = [], isLoading: lc } = useQuery({
    queryKey: ['analytics-complaints'],
    queryFn: async () => { const r = await reportApi.getByAdmin({ page: 1, limit: 1000 }); return r.data?.data ?? []; },
    staleTime: 120_000,
  });

  const isLoading = ls || lv || lt || lc;

  // ── Derived stats ──────────────────────────────────────────────────────────
  const activeStudents = students.filter((s: any) => s.status === 'active').length;
  const assignedStudents = students.filter((s: any) => s.VanId).length;
  const activeVans = vans.filter((v: any) => v.status === 'active').length;
  const vansWithDrivers = vans.filter((v: any) => v.driverId).length;
  const completedTrips = trips.filter((t: any) => t.status === 'end').length;
  const ongoingTrips = trips.filter((t: any) => t.status === 'ongoing').length;
  const pendingComplaints = complaints.filter((c: any) => c.status === 'pending').length;
  const resolvedComplaints = complaints.filter((c: any) => c.status === 'resolved').length;

  // ── Trip activity last 7 days ──────────────────────────────────────────────
  const last7 = getLast7Days();
  const tripsByDay = last7.map(date => ({
    day: getDayLabel(date),
    trips: trips.filter((t: any) => t.createdAt?.startsWith(date)).length,
    completed: trips.filter((t: any) => t.createdAt?.startsWith(date) && t.status === 'end').length,
  }));

  // ── Student status pie ─────────────────────────────────────────────────────
  const studentPie = [
    { name: 'Active', value: activeStudents },
    { name: 'Inactive', value: students.length - activeStudents },
  ];

  // ── Van utilization ────────────────────────────────────────────────────────
  const vanUtilization = [
    { name: 'With Driver', value: vansWithDrivers },
    { name: 'No Driver', value: vans.length - vansWithDrivers },
  ];

  // ── Grade distribution ─────────────────────────────────────────────────────
  const gradeCounts: Record<number, number> = {};
  students.forEach((s: any) => {
    if (s.grade) gradeCounts[s.grade] = (gradeCounts[s.grade] ?? 0) + 1;
  });
  const gradeData = Object.entries(gradeCounts)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([grade, count]) => ({ grade: `G${grade}`, count }));

  // ── Complaint status ───────────────────────────────────────────────────────
  const complaintStatusData = [
    { name: 'Pending', value: pendingComplaints, color: '#F59E0B' },
    { name: 'Resolved', value: resolvedComplaints, color: '#10B981' },
    { name: 'Other', value: complaints.length - pendingComplaints - resolvedComplaints, color: '#6366F1' },
  ].filter(d => d.value > 0);

  const PIE_COLORS = ['#1B2B6B', '#FFB800', '#10B981', '#EF4444'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Overview of your school transport operations</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard title="Total Students" value={students.length} sub={`${activeStudents} active · ${assignedStudents} assigned`} icon={<Users size={20} />} color="#1B2B6B" trend={4} />
            <StatCard title="Fleet Size" value={vans.length} sub={`${activeVans} active · ${vansWithDrivers} with driver`} icon={<Bus size={20} />} color="#FFB800" trend={0} />
            <StatCard title="Total Trips" value={trips.length} sub={`${completedTrips} completed · ${ongoingTrips} ongoing`} icon={<MapPin size={20} />} color="#10B981" trend={12} />
            <StatCard title="Complaints" value={complaints.length} sub={`${pendingComplaints} pending · ${resolvedComplaints} resolved`} icon={<AlertTriangle size={20} />} color="#EF4444" trend={-8} />
          </>
        )}
      </div>

      {/* Trip Activity + Grade Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trip Activity Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Trip Activity (Last 7 Days)</h2>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1B2B6B] inline-block" /> Total</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" /> Completed</span>
            </div>
          </div>
          {isLoading ? (
            <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={tripsByDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gTrips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B2B6B" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1B2B6B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Area type="monotone" dataKey="trips" stroke="#1B2B6B" strokeWidth={2} fill="url(#gTrips)" dot={{ fill: '#1B2B6B', r: 3 }} />
                <Area type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} fill="url(#gCompleted)" dot={{ fill: '#10B981', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Student Status Pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Student Status</h2>
          {isLoading ? (
            <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie data={studentPie} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                  {studentPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: '#6B7280' }}>{v}</span>} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Grade Distribution + Van Utilization + Complaint Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Grade Bar Chart */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Students by Grade</h2>
          {isLoading ? (
            <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
          ) : gradeData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No grade data</div>
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={gradeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="grade" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }} />
                <Bar dataKey="count" fill="#1B2B6B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Van Utilization */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Van Utilization</h2>
          {isLoading ? (
            <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={vanUtilization} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                    {vanUtilization.map((_, i) => <Cell key={i} fill={['#FFB800', '#E5E7EB'][i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-3 bg-[#FFB800]/10 rounded-xl text-center">
                  <p className="text-xs text-gray-500">With Driver</p>
                  <p className="text-xl font-bold text-[#FFB800]">{vansWithDrivers}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-xl text-center">
                  <p className="text-xs text-gray-500">No Driver</p>
                  <p className="text-xl font-bold text-gray-500">{vans.length - vansWithDrivers}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Complaint Status + Quick KPIs */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Key Metrics</h2>
          {isLoading ? (
            <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <div className="space-y-3">
              {[
                {
                  label: 'Assignment Rate',
                  value: students.length ? `${Math.round((assignedStudents / students.length) * 100)}%` : '—',
                  sub: 'Students with van',
                  icon: <Bus size={14} />,
                  color: '#1B2B6B',
                },
                {
                  label: 'Trip Completion',
                  value: trips.length ? `${Math.round((completedTrips / trips.length) * 100)}%` : '—',
                  sub: 'Trips completed',
                  icon: <CheckCircle2 size={14} />,
                  color: '#10B981',
                },
                {
                  label: 'Resolution Rate',
                  value: complaints.length ? `${Math.round((resolvedComplaints / complaints.length) * 100)}%` : '—',
                  sub: 'Complaints resolved',
                  icon: <Activity size={14} />,
                  color: '#6366F1',
                },
                {
                  label: 'Fleet Active',
                  value: vans.length ? `${Math.round((activeVans / vans.length) * 100)}%` : '—',
                  sub: 'Active vans',
                  icon: <Clock size={14} />,
                  color: '#FFB800',
                },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span style={{ color: item.color }}>{item.icon}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-700">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.sub}</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
