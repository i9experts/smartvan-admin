'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Building2,
  Bus,
  Users,
  AlertTriangle,
  Wallet,
  Wifi,
  WifiOff,
  Activity,
} from 'lucide-react';
import { api, schoolApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuperAdminOverview {
  institutions: {
    total: number;
    active: number;
    inactive: number;
    snapshot: { schoolId: string; schoolName: string; status: string; totalVans: number; avgHealth: number | null }[];
  };
  fleet: {
    total: number;
    active: number;
    gpsOnline: number;
    gpsOffline: number;
    avgHealth: number;
  };
  drivers: {
    total: number;
    active: number;
  };
  trips: {
    today: number;
    completedToday: number;
  };
  complaints: {
    total: number;
    open: number;
    byCategory: { category: string; count: number }[];
    avgResolutionHours: number | null;
    resolvedCount: number;
  };
  billing: {
    activeSubscriptions: number;
    expiringSoon: number;
    paymentFailed: number;
    inactiveSubscriptions: number;
    estimatedMonthlyRevenue: number;
    averageRevenuePerSchool: number;
    averageRevenuePerVehicle: number;
    currency: string;
    revenueBySchool: { schoolId: string; schoolName: string; totalVans: number; monthlyRevenue: number; currency: string }[];
  };
}

async function fetchOverview(): Promise<SuperAdminOverview> {
  const res = await api.get('/Admin/GetSuperAdminOverview');
  return res.data.data;
}

// ─── Stat Card (matches Dashboard style) ──────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
      <div>
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
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

function InstitutionRow({ school, onChanged }: { school: { schoolId: string; schoolName: string; status: string; totalVans: number; avgHealth: number | null }; onChanged: () => void }) {
  const toggleMutation = useMutation({
    mutationFn: () => schoolApi.changeStatus(school.schoolId, school.status === 'active' ? 'inActive' : 'active'),
    onSuccess: () => onChanged(),
  });

  return (
    <tr className="border-b border-gray-50">
      <td className="py-2 text-gray-900">{school.schoolName}</td>
      <td className="py-2">
        <span className={`text-xs px-2 py-1 rounded-full ${school.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
          {school.status}
        </span>
      </td>
      <td className="py-2 text-gray-600">{school.totalVans}</td>
      <td className="py-2 text-gray-900">{school.avgHealth !== null ? `${school.avgHealth}%` : '—'}</td>
      <td className="py-2 text-right">
        <button
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition disabled:opacity-50 ${
            school.status === 'active'
              ? 'text-red-600 hover:bg-red-50'
              : 'text-emerald-600 hover:bg-emerald-50'
          }`}
        >
          {toggleMutation.isPending ? '…' : school.status === 'active' ? 'Suspend' : 'Activate'}
        </button>
      </td>
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['super-admin-overview'],
    queryFn: fetchOverview,
    staleTime: 60_000,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">Platform-wide intelligence across all institutions</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {/* Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Institutions"
              value={data?.institutions.total ?? 0}
              sub={`${data?.institutions.active ?? 0} active · ${data?.institutions.inactive ?? 0} inactive`}
              icon={<Building2 size={20} />}
              color="#1B2B6B"
            />
            <StatCard
              title="Total Fleet"
              value={data?.fleet.total ?? 0}
              sub={`${data?.fleet.active ?? 0} active`}
              icon={<Bus size={20} />}
              color="#0EA5E9"
            />
            <StatCard
              title="Fleet Health"
              value={`${data?.fleet.avgHealth ?? 0}%`}
              sub="Average across platform"
              icon={<Activity size={20} />}
              color="#10B981"
            />
            <StatCard
              title="Total Drivers"
              value={data?.drivers.total ?? 0}
              sub={`${data?.drivers.active ?? 0} active`}
              icon={<Users size={20} />}
              color="#8B5CF6"
            />
            <StatCard
              title="GPS Online"
              value={data?.fleet.gpsOnline ?? 0}
              sub={`${data?.fleet.gpsOffline ?? 0} offline`}
              icon={<Wifi size={20} />}
              color="#10B981"
            />
            <StatCard
              title="GPS Offline"
              value={data?.fleet.gpsOffline ?? 0}
              sub="Need attention"
              icon={<WifiOff size={20} />}
              color="#EF4444"
            />
            <StatCard
              title="Open Complaints"
              value={data?.complaints.open ?? 0}
              sub={`${data?.complaints.total ?? 0} total`}
              icon={<AlertTriangle size={20} />}
              color="#F59E0B"
            />
            <StatCard
              title="Est. Monthly Revenue"
              value={`${data?.billing.currency ?? 'PKR'} ${(data?.billing.estimatedMonthlyRevenue ?? 0).toLocaleString()}`}
              sub={`${data?.billing.activeSubscriptions ?? 0} active subscriptions`}
              icon={<Wallet size={20} />}
              color="#1B2B6B"
            />
          </>
        )}
      </div>

      {/* Billing Intelligence */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing Intelligence</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-400">Expiring Soon (30d)</p>
            <p className="text-xl font-bold text-amber-600">{data?.billing.expiringSoon ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Payment Failed</p>
            <p className="text-xl font-bold text-red-600">{data?.billing.paymentFailed ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Avg Revenue / School</p>
            <p className="text-xl font-bold text-gray-900">{data?.billing.currency} {(data?.billing.averageRevenuePerSchool ?? 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Avg Revenue / Vehicle</p>
            <p className="text-xl font-bold text-gray-900">{data?.billing.currency} {(data?.billing.averageRevenuePerVehicle ?? 0).toLocaleString()}</p>
          </div>
        </div>
        {data?.billing.revenueBySchool && data.billing.revenueBySchool.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">School</th>
                  <th className="pb-2 font-medium">Vans</th>
                  <th className="pb-2 font-medium">Monthly Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.billing.revenueBySchool.map((s) => (
                  <tr key={s.schoolId} className="border-b border-gray-50">
                    <td className="py-2 text-gray-900">{s.schoolName}</td>
                    <td className="py-2 text-gray-600">{s.totalVans}</td>
                    <td className="py-2 text-gray-900 font-medium">{s.currency} {s.monthlyRevenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Institution Snapshot */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Institution Snapshot</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-medium">School</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Vans</th>
                <th className="pb-2 font-medium">Fleet Health</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {data?.institutions.snapshot.map((s) => (
                <InstitutionRow key={s.schoolId} school={s} onChanged={refetch} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complaints & SLA */}
      {data?.complaints && (data.complaints.byCategory.length > 0 || data.complaints.resolvedCount > 0) && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Complaint Categories</h2>
            {data.complaints.avgResolutionHours !== null && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Avg. Resolution Time</p>
                <p className="text-sm font-bold text-gray-900">
                  {data.complaints.avgResolutionHours < 1
                    ? `${Math.round(data.complaints.avgResolutionHours * 60)}m`
                    : `${data.complaints.avgResolutionHours}h`}
                  <span className="text-xs font-normal text-gray-400 ml-1">({data.complaints.resolvedCount} resolved)</span>
                </p>
              </div>
            )}
          </div>
          {data.complaints.byCategory.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.complaints.byCategory.map((c) => (
                <div key={c.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">{c.category}</span>
                  <span className="text-sm font-bold text-gray-900">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
