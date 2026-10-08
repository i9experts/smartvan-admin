'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, Users, Bus, MapPin, AlertTriangle,
  UserCheck, Route as RouteIcon, UserX, Smartphone, PhoneOff,
  FileWarning, Satellite, Layers, Link2, CalendarClock, ShieldAlert,
  ChevronDown,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api } from '@/lib/api';

// ─── Types (mirrors GET /Admin/getAnalytics) ──────────────────────────────────

interface Trend { current7Days: number; previous7Days: number; percentChange: number | null }

interface AnalyticsResponse {
  schoolName: string;
  generatedAt: string;
  fixedMetrics: {
    driverCoverage: { withDriver: number; withoutDriver: number; totalVans: number };
    seatCapacity: {
      totalSeatCapacity: number; vansWithCapacityData: number; vansMissingCapacityData: number;
      assignedStudents: number; utilizationPercent: number | null;
    };
    studentStatus: {
      total: number;
      registration: { active: number; inactive: number };
      verification: { verified: number; pending: number };
      assignment: { assigned: number; unassigned: number };
    };
    tripSummary: {
      allTime: { total: number; completed: number; ongoing: number };
      last7Days: { total: number; completed: number; daily: { date: string; total: number; completed: number }[] };
    };
    complaintSummary: { total: number; pending: number; resolved: number; other: number };
    trends: { students: Trend; trips: Trend; vans: Trend; complaints: Trend };
    gradeDistribution: { grade: string; count: number }[];
  };
  insights: {
    studentsAwaitingVan: { count: number; list: any[] };
    incompleteRouteAssignments: { count: number; list: any[] };
    vansWithoutRoutes: { count: number; list: any[] };
    driverGaps: {
      activeVansNoDriver: { count: number; list: any[] };
      activeDriversNoVan: { count: number; list: any[] };
    };
    driverOnboarding: { linked: number; neverLinked: number; neverLinkedList: any[] };
    missingParentContact: { count: number; list: any[] };
    driverDocumentGaps: { count: number; list: any[] };
    gpsDeviceCoverage: { withDevice: number; withoutDevice: number };
    studentsByVanAndRoute: { vanId: string; carNumber: string; studentCount: number; routes: { title: string; tripType: string }[] }[];
    parentStudentLinkage: {
      parentsWithNoChildren: { count: number; list: any[] };
      studentsWithNoParentRecord: { count: number; list: any[] };
      maxChildrenPerParent: number;
    };
    registrationActivity: { weekStart: string; newStudents: number; stillUnassigned: number }[];
    dataQualityExceptions: {
      missingAge: { count: number; list: any[] };
      inconsistentGrade: { count: number; list: any[] };
      placeholderEmails: { count: number; list: any[] };
      possibleDuplicates: { count: number; list: any[][] };
    };
  };
}

const PIE_COLORS = ['#1B2B6B', '#FFB800', '#10B981', '#EF4444'];

// ─── Small building blocks ─────────────────────────────────────────────────────

function TrendLine({ trend }: { trend?: Trend }) {
  if (!trend || trend.percentChange === null) {
    return <p className="text-xs text-gray-300 mt-2">Not enough history yet to compare</p>;
  }
  const positive = trend.percentChange >= 0;
  return (
    <div className="flex items-center gap-1 mt-2 text-xs">
      {positive ? <TrendingUp size={12} className="text-emerald-500" /> : <TrendingDown size={12} className="text-red-400" />}
      <span className={positive ? 'text-emerald-600' : 'text-red-500'}>
        {positive ? '+' : ''}{trend.percentChange}%
      </span>
      <span className="text-gray-400">vs previous 7 days</span>
    </div>
  );
}

function StatCard({
  title, value, sub, icon, color, trend,
}: {
  title: string; value: number | string; sub?: string;
  icon: React.ReactNode; color: string; trend?: Trend;
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
      <TrendLine trend={trend} />
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

interface InsightColumn { key: string; label: string }
interface InsightSectionData {
  label: string;
  count: number;
  total?: number;
  columns: InsightColumn[];
  rows: Record<string, any>[];
  emptyText: string;
}

function InsightSection({ label, count, total, columns, rows, emptyText }: InsightSectionData) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, 5);
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span className="text-sm font-bold text-gray-800">{count}{total != null ? <span className="text-gray-400 font-normal">/{total}</span> : null}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-300 mt-1">{emptyText}</p>
      ) : (
        <>
          <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto pr-1">
            {visible.map((row, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-600 py-0.5">
                {columns.map((c) => (
                  <span key={c.key} className="truncate flex-1" title={String(row[c.key] ?? '')}>
                    {row[c.key] || '—'}
                  </span>
                ))}
              </div>
            ))}
          </div>
          {rows.length > 5 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="flex items-center gap-1 text-[11px] text-[#1B2B6B] font-medium mt-1"
            >
              <ChevronDown size={11} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
              {expanded ? 'Show less' : `+${rows.length - 5} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function InsightCard({
  title, icon: Icon, color, actionHint, sections,
}: {
  title: string; icon: React.ElementType; color: string; actionHint: string; sections: InsightSectionData[];
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          <p className="text-xs text-gray-400">{actionHint}</p>
        </div>
      </div>
      <div className="mt-4 space-y-4">
        {sections.map((s, i) => <InsightSection key={i} {...s} />)}
      </div>
    </div>
  );
}

function SectionHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="pt-2">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function formatWeek(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDayLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => (await api.get<AnalyticsResponse>('/Admin/getAnalytics')).data,
    staleTime: 60_000,
  });

  if (isError) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-600 text-sm rounded-xl">
          <AlertTriangle size={16} />
          Couldn&apos;t load analytics.
          <button onClick={() => refetch()} className="underline font-medium">Retry</button>
        </div>
      </div>
    );
  }

  const fm = data?.fixedMetrics;
  const ins = data?.insights;

  const tripsByDay = (fm?.tripSummary.last7Days.daily ?? []).map((d) => ({
    day: getDayLabel(d.date),
    trips: d.total,
    completed: d.completed,
  }));

  const driverCoverageData = fm ? [
    { name: 'With Driver', value: fm.driverCoverage.withDriver },
    { name: 'No Driver', value: fm.driverCoverage.withoutDriver },
  ] : [];

  const duplicateRows = (ins?.dataQualityExceptions.possibleDuplicates.list ?? []).map((group) => ({
    fullname: group[0]?.fullname,
    count: `${group.length} records`,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {data ? `${data.schoolName} · generated ${new Date(data.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : 'Overview of your school transport operations'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading || !fm ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Students"
              value={fm.studentStatus.total}
              sub={`${fm.studentStatus.registration.active} active reg. · ${fm.studentStatus.verification.verified} verified · ${fm.studentStatus.assignment.assigned} assigned`}
              icon={<Users size={20} />} color="#1B2B6B"
              trend={fm.trends.students}
            />
            <StatCard
              title="Fleet Size"
              value={fm.driverCoverage.totalVans}
              sub={`${fm.driverCoverage.withDriver} with driver · ${fm.driverCoverage.withoutDriver} without`}
              icon={<Bus size={20} />} color="#FFB800"
              trend={fm.trends.vans}
            />
            <StatCard
              title="Trips (All-Time)"
              value={fm.tripSummary.allTime.total}
              sub={`${fm.tripSummary.allTime.completed} completed · ${fm.tripSummary.allTime.ongoing} ongoing`}
              icon={<MapPin size={20} />} color="#10B981"
              trend={fm.trends.trips}
            />
            <StatCard
              title="Complaints"
              value={fm.complaintSummary.total}
              sub={`${fm.complaintSummary.pending} pending · ${fm.complaintSummary.resolved} resolved`}
              icon={<AlertTriangle size={20} />} color="#EF4444"
              trend={fm.trends.complaints}
            />
          </>
        )}
      </div>

      {/* Trip Activity + Grade Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Trip Activity — Last 7 Days</h2>
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

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Students by Grade</h2>
          {isLoading || !fm ? (
            <div className="h-52 bg-gray-50 rounded-xl animate-pulse" />
          ) : fm.gradeDistribution.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">No grade data</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={fm.gradeDistribution} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="grade" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }} />
                <Bar dataKey="count" fill="#1B2B6B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Driver Coverage + Seat Capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Driver Coverage</h2>
          <p className="text-xs text-gray-400 mb-4">Vans with a driver assigned — not a measure of seats used</p>
          {isLoading || !fm ? (
            <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={driverCoverageData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                    {driverCoverageData.map((_, i) => <Cell key={i} fill={['#FFB800', '#E5E7EB'][i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="p-3 bg-[#FFB800]/10 rounded-xl text-center">
                  <p className="text-xs text-gray-500">With Driver</p>
                  <p className="text-xl font-bold text-[#FFB800]">{fm.driverCoverage.withDriver}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-xl text-center">
                  <p className="text-xs text-gray-500">No Driver</p>
                  <p className="text-xl font-bold text-gray-500">{fm.driverCoverage.withoutDriver}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Seat Capacity</h2>
          <p className="text-xs text-gray-400 mb-4">Assigned students vs. total registered seats across the fleet</p>
          {isLoading || !fm ? (
            <div className="h-40 bg-gray-50 rounded-xl animate-pulse" />
          ) : fm.seatCapacity.totalSeatCapacity === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center gap-1">
              <p className="text-sm text-gray-400">No van seat capacity on file</p>
              <p className="text-xs text-gray-300">Add capacity to vans to see utilization here</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-gray-900">{fm.seatCapacity.utilizationPercent}%</p>
                <p className="text-xs text-gray-400 text-right">
                  {fm.seatCapacity.assignedStudents} of {fm.seatCapacity.totalSeatCapacity} seats
                </p>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1B2B6B] rounded-full"
                  style={{ width: `${Math.min(fm.seatCapacity.utilizationPercent ?? 0, 100)}%` }}
                />
              </div>
              {fm.seatCapacity.vansMissingCapacityData > 0 && (
                <p className="text-xs text-amber-600">
                  {fm.seatCapacity.vansMissingCapacityData} van{fm.seatCapacity.vansMissingCapacityData !== 1 ? 's' : ''} missing seat-capacity data — utilization may be understated
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* High priority insights */}
      <SectionHeading title="Needs Attention" sub="High-priority gaps — act on these first" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading || !ins ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <InsightCard
              title="Students Awaiting Van Assignment"
              icon={UserX} color="#EF4444"
              actionHint="Assign these students to a suitable van"
              sections={[{
                label: 'Unassigned active students', count: ins.studentsAwaitingVan.count,
                columns: [{ key: 'fullname', label: 'Name' }, { key: 'grade', label: 'Grade' }, { key: 'parentPhone', label: 'Parent phone' }],
                rows: ins.studentsAwaitingVan.list, emptyText: 'Every active student has a van.',
              }]}
            />
            <InsightCard
              title="Incomplete Route Assignments"
              icon={RouteIcon} color="#F59E0B"
              actionHint="Student has a van but isn't on any route — complete the transport arrangement"
              sections={[{
                label: 'Students with a van, no route', count: ins.incompleteRouteAssignments.count,
                columns: [{ key: 'fullname', label: 'Name' }, { key: 'vanCarNumber', label: 'Van' }],
                rows: ins.incompleteRouteAssignments.list, emptyText: 'All assigned students are on a route.',
              }]}
            />
            <InsightCard
              title="Vans Without Routes"
              icon={MapPin} color="#F59E0B"
              actionHint="Active vans with no route — investigate unused fleet capacity"
              sections={[{
                label: 'Active, routeless vans', count: ins.vansWithoutRoutes.count,
                columns: [{ key: 'carNumber', label: 'Van' }, { key: 'vehicleType', label: 'Type' }],
                rows: ins.vansWithoutRoutes.list, emptyText: 'Every active van has a route.',
              }]}
            />
            <InsightCard
              title="Driver Assignment Gaps"
              icon={Users} color="#EF4444"
              actionHint="Allocate staff or identify standby drivers"
              sections={[
                {
                  label: 'Active vans, no driver', count: ins.driverGaps.activeVansNoDriver.count,
                  columns: [{ key: 'carNumber', label: 'Van' }],
                  rows: ins.driverGaps.activeVansNoDriver.list, emptyText: 'Every active van has a driver.',
                },
                {
                  label: 'Active drivers, no van', count: ins.driverGaps.activeDriversNoVan.count,
                  columns: [{ key: 'fullname', label: 'Driver' }],
                  rows: ins.driverGaps.activeDriversNoVan.list, emptyText: 'Every active driver has a van.',
                },
              ]}
            />
            <InsightCard
              title="Driver App Onboarding"
              icon={Smartphone} color="#6366F1"
              actionHint="Follow up with drivers who still need onboarding"
              sections={[{
                label: `Never linked the app (${ins.driverOnboarding.linked} linked)`, count: ins.driverOnboarding.neverLinked,
                columns: [{ key: 'fullname', label: 'Driver' }],
                rows: ins.driverOnboarding.neverLinkedList, emptyText: 'Every driver has opened the app at least once.',
              }]}
            />
            <InsightCard
              title="Missing Parent Contact Details"
              icon={PhoneOff} color="#EF4444"
              actionHint="Complete contact information before transport starts"
              sections={[{
                label: 'Parents with no usable phone number', count: ins.missingParentContact.count,
                columns: [{ key: 'fullname', label: 'Parent' }, { key: 'email', label: 'Email' }],
                rows: ins.missingParentContact.list, emptyText: 'Every parent has a phone number on file.',
              }]}
            />
            <InsightCard
              title="Driver Document Completeness"
              icon={FileWarning} color="#F59E0B"
              actionHint="Obtain missing licence / vehicle-card documents"
              sections={[{
                label: 'Drivers missing a document', count: ins.driverDocumentGaps.count,
                columns: [{ key: 'fullname', label: 'Driver' }],
                rows: ins.driverDocumentGaps.list, emptyText: 'All drivers have complete documents.',
              }]}
            />
          </>
        )}
      </div>

      {/* Medium priority insights */}
      <SectionHeading title="Operational Insights" sub="Worth a periodic review" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading || !ins ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#10B98115]">
                  <Satellite size={16} className="text-[#10B981]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">GPS Device Coverage</p>
                  <p className="text-xs text-gray-400">Complete device setup on vans without one</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <p className="text-xs text-gray-500">With Device</p>
                  <p className="text-xl font-bold text-emerald-600">{ins.gpsDeviceCoverage.withDevice}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-xl text-center">
                  <p className="text-xs text-gray-500">Without Device</p>
                  <p className="text-xl font-bold text-gray-500">{ins.gpsDeviceCoverage.withoutDevice}</p>
                </div>
              </div>
            </div>

            <InsightCard
              title="Students by Van and Route"
              icon={Layers} color="#1B2B6B"
              actionHint="Review workload distribution across the fleet"
              sections={[{
                label: 'Vans', count: ins.studentsByVanAndRoute.length,
                columns: [
                  { key: 'carNumber', label: 'Van' },
                  { key: 'studentCount', label: 'Students' },
                  { key: 'routesLabel', label: 'Routes' },
                ],
                rows: ins.studentsByVanAndRoute.map((v) => ({
                  ...v,
                  routesLabel: v.routes.map((r) => (r.tripType ? `${r.title} (${r.tripType})` : r.title)).join(', ') || '—',
                })),
                emptyText: 'No vans yet.',
              }]}
            />

            <InsightCard
              title="Parent–Student Linkage"
              icon={Link2} color="#6366F1"
              actionHint={`Repair account relationships · up to ${ins.parentStudentLinkage.maxChildrenPerParent} children on one account`}
              sections={[
                {
                  label: 'Parents with no linked children', count: ins.parentStudentLinkage.parentsWithNoChildren.count,
                  columns: [{ key: 'fullname', label: 'Parent' }, { key: 'email', label: 'Email' }],
                  rows: ins.parentStudentLinkage.parentsWithNoChildren.list, emptyText: 'Every parent account has at least one child.',
                },
                {
                  label: 'Students with no parent record', count: ins.parentStudentLinkage.studentsWithNoParentRecord.count,
                  columns: [{ key: 'fullname', label: 'Student' }],
                  rows: ins.parentStudentLinkage.studentsWithNoParentRecord.list, emptyText: 'Every student resolves to a real parent account.',
                },
              ]}
            />

            <InsightCard
              title="Data-Quality Exceptions"
              icon={ShieldAlert} color="#EF4444"
              actionHint="Clean records that distort the analytics above"
              sections={[
                {
                  label: 'Missing age', count: ins.dataQualityExceptions.missingAge.count,
                  columns: [{ key: 'fullname', label: 'Student' }],
                  rows: ins.dataQualityExceptions.missingAge.list, emptyText: 'Every student has an age on file.',
                },
                {
                  label: 'Non-standard grade value', count: ins.dataQualityExceptions.inconsistentGrade.count,
                  columns: [{ key: 'fullname', label: 'Student' }, { key: 'grade', label: 'Grade' }],
                  rows: ins.dataQualityExceptions.inconsistentGrade.list, emptyText: 'All grade values match the standard list.',
                },
                {
                  label: 'Placeholder-looking parent emails', count: ins.dataQualityExceptions.placeholderEmails.count,
                  columns: [{ key: 'fullname', label: 'Parent' }, { key: 'email', label: 'Email' }],
                  rows: ins.dataQualityExceptions.placeholderEmails.list, emptyText: 'No placeholder-looking emails found.',
                },
                {
                  label: 'Possible duplicate students', count: ins.dataQualityExceptions.possibleDuplicates.count,
                  columns: [{ key: 'fullname', label: 'Name' }, { key: 'count', label: 'Records' }],
                  rows: duplicateRows, emptyText: 'No likely duplicates found.',
                },
              ]}
            />
          </>
        )}
      </div>

      {/* Registration activity */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-[#1B2B6B15]">
            <CalendarClock size={16} className="text-[#1B2B6B]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Registration Activity</p>
            <p className="text-xs text-gray-400">New students by week, and how many are still unassigned today</p>
          </div>
        </div>
        {isLoading || !ins ? (
          <div className="h-56 bg-gray-50 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={ins.registrationActivity.map((w) => ({ ...w, week: formatWeek(w.weekStart) }))}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }} />
              <Legend
                iconType="circle" iconSize={8}
                formatter={(v) => <span style={{ fontSize: 11, color: '#6B7280' }}>{v}</span>}
              />
              <Bar dataKey="newStudents" name="New students" fill="#1B2B6B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="stillUnassigned" name="Still unassigned" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
