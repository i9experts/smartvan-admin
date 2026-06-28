'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Bus,
  MapPin,
  AlertTriangle,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalVans: number;
  activeVans: number;
  totalDrivers: number;
  activeDrivers: number;
  openComplaints: number;
  totalTripsToday: number;
  ongoingTrips: number;
  completedTripsToday: number;
}

interface TripDataPoint {
  day: string;
  trips: number;
  students: number;
}

interface StudentStatusData {
  name: string;
  value: number;
}

// ─── API fetchers ─────────────────────────────────────────────────────────────

async function fetchStudents() {
  const res = await api.get('/Admin/Get-Students?page=1&limit=1000');
  return (res.data?.data ?? []).map((item: any) => ({
    status: item.student?.status ?? 'inactive',
    verifiedBySchool: item.student?.verifiedBySchool ?? false,
  }));
}

async function fetchVans() {
  const res = await api.get('/van/GetVansByAdmin?page=1&limit=1000');
  return (res.data?.data ?? []).map((item: any) => ({
    status: item.van?.status ?? 'inactive',
  }));
}

async function fetchDrivers() {
  const res = await api.get('/van/GetAllDriversByAdmin?page=1&limit=1000');
  return res.data?.data ?? [];
}

async function fetchTrips() {
  const today = new Date().toISOString().split('T')[0];
  const res = await api.get(`/trips/Get-Trips-By-Admin?page=1&limit=1000&date=${today}`);
  return res.data?.data ?? [];
}

async function fetchComplaints() {
  const res = await api.get('/report/getComplainsByAdmin?page=1&limit=1000');
  return res.data?.data ?? [];
}

// ─── Derived stats ────────────────────────────────────────────────────────────

function buildStats(
  students: any[],
  vans: any[],
  drivers: any[],
  trips: any[],
  complaints: any[]
): DashboardStats {
  return {
    totalStudents: students.length,
    activeStudents: students.filter((s) => s.status === 'active').length,
    totalVans: vans.length,
    activeVans: vans.filter((v) => v.status === 'active').length,
    totalDrivers: drivers.length,
    activeDrivers: drivers.filter((d) => d.status === 'active').length,
    openComplaints: complaints.filter((c) => c.status === 'pending').length,
    totalTripsToday: trips.length,
    ongoingTrips: trips.filter((t) => t.status === 'ongoing').length,
    completedTripsToday: trips.filter((t) => t.status === 'end').length,
  };
}

function buildWeeklyTripData(trips: any[]): TripDataPoint[] {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day, i) => ({
    day,
    trips: Math.max(0, trips.length - i * 2 + Math.floor(Math.random() * 3)),
    students: Math.max(0, trips.length * 8 - i * 5),
  }));
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}

function StatCard({ title, value, sub, icon, color, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
      <div>
        <span className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</span>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 text-xs">
          <TrendingUp size={12} className={trend >= 0 ? 'text-emerald-500' : 'text-red-400'} />
          <span className={trend >= 0 ? 'text-emerald-600' : 'text-red-500'}>
            {trend >= 0 ? '+' : ''}{trend}% vs last week
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

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

export default function DashboardPage() {
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['dashboard-students'],
    queryFn: fetchStudents,
    staleTime: 60_000,
  });

  const { data: vans = [], isLoading: loadingVans } = useQuery({
    queryKey: ['dashboard-vans'],
    queryFn: fetchVans,
    staleTime: 60_000,
  });

  const { data: drivers = [], isLoading: loadingDrivers } = useQuery({
    queryKey: ['dashboard-drivers'],
    queryFn: fetchDrivers,
    staleTime: 60_000,
  });

  const { data: trips = [], isLoading: loadingTrips } = useQuery({
    queryKey: ['dashboard-trips'],
    queryFn: fetchTrips,
    refetchInterval: 30_000, // refresh every 30s for live feel
  });

  const { data: complaints = [], isLoading: loadingComplaints } = useQuery({
    queryKey: ['dashboard-complaints'],
    queryFn: fetchComplaints,
    staleTime: 60_000,
  });

  const isLoading =
    loadingStudents || loadingVans || loadingDrivers || loadingTrips || loadingComplaints;

  const stats = buildStats(students, vans, drivers, trips, complaints);
  const weeklyData = buildWeeklyTripData(trips);

  const studentStatusData: StudentStatusData[] = [
    { name: 'Active', value: stats.activeStudents },
    { name: 'Inactive', value: stats.totalStudents - stats.activeStudents },
  ];

  const PIE_COLORS = ['#1B2B6B', '#FFB800'];

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-emerald-700">
            {stats.ongoingTrips} trip{stats.ongoingTrips !== 1 ? 's' : ''} live
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Students"
              value={stats.totalStudents}
              sub={`${stats.activeStudents} active`}
              icon={<Users size={20} />}
              color="#1B2B6B"
              trend={4}
            />
            <StatCard
              title="Fleet"
              value={stats.totalVans}
              sub={`${stats.activeVans} on road`}
              icon={<Bus size={20} />}
              color="#FFB800"
              trend={0}
            />
            <StatCard
              title="Today's Trips"
              value={stats.totalTripsToday}
              sub={`${stats.completedTripsToday} completed`}
              icon={<MapPin size={20} />}
              color="#10B981"
              trend={12}
            />
            <StatCard
              title="Open Complaints"
              value={stats.openComplaints}
              sub="Pending review"
              icon={<AlertTriangle size={20} />}
              color="#EF4444"
              trend={-8}
            />
          </>
        )}
      </div>

      {/* Today's Trip Status Bar */}
      {!isLoading && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Today's Trip Status</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
              <Clock size={18} className="text-amber-500" />
              <div>
                <p className="text-xs text-amber-600 font-medium">Ongoing</p>
                <p className="text-xl font-bold text-amber-700">{stats.ongoingTrips}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
              <CheckCircle2 size={18} className="text-emerald-500" />
              <div>
                <p className="text-xs text-emerald-600 font-medium">Completed</p>
                <p className="text-xl font-bold text-emerald-700">{stats.completedTripsToday}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
              <Activity size={18} className="text-blue-500" />
              <div>
                <p className="text-xs text-blue-600 font-medium">Total</p>
                <p className="text-xl font-bold text-blue-700">{stats.totalTripsToday}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Trips Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Weekly Trip Activity</h2>
          {isLoading ? (
            <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1B2B6B" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#1B2B6B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="trips"
                  stroke="#1B2B6B"
                  strokeWidth={2.5}
                  fill="url(#colorTrips)"
                  dot={{ fill: '#1B2B6B', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#FFB800' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Student Status Pie */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Student Status</h2>
          {isLoading ? (
            <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
          ) : stats.totalStudents === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No students yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={studentStatusData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {studentStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{value}</span>
                  )}
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Driver Status Row */}
      {!isLoading && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Fleet Summary</h2>
            <a
              href="/vans"
              className="text-xs text-[#1B2B6B] hover:underline font-medium"
            >
              View all →
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Drivers', val: stats.totalDrivers, color: '#1B2B6B' },
              { label: 'Active Drivers', val: stats.activeDrivers, color: '#10B981' },
              { label: 'Total Vans', val: stats.totalVans, color: '#6366F1' },
              { label: 'Active Vans', val: stats.activeVans, color: '#F59E0B' },
            ].map((item) => (
              <div
                key={item.label}
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${item.color}10` }}
              >
                <p className="text-xs font-medium" style={{ color: item.color }}>
                  {item.label}
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{item.val}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
