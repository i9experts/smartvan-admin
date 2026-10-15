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
  Smartphone,
  Megaphone,
  Plus,
  X,
} from 'lucide-react';
import { api, schoolApi } from '@/lib/api';
import { useState } from 'react';
import { SchoolFeaturesModal } from '@/components/super-admin/SchoolFeaturesModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuperAdminOverview {
  institutions: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    newToday: number;
    newThisWeek: number;
    churnRatePercent: number;
    snapshot: { schoolId: string; schoolName: string; status: string; totalVans: number; avgHealth: number | null }[];
  };
  revenue: {
    vanBillingMrr: number;
    premiumMrr: number;
    totalMrr: number;
    totalArr: number;
    currency: string;
    planBreakdown: { totalSchools: number; byTier: { basic: number; premium: number }; premiumActiveCount: number } | null;
    potentialVanBillingByCurrency: Record<string, number>;
    unbilledSchoolsWithVans: number;
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
  appConnections: {
    parents: { total: number; connected: number; rate: number };
    drivers: { total: number; connected: number; rate: number };
    bySchool: {
      schoolId: string;
      schoolName: string;
      parents: { total: number; connected: number };
      drivers: { total: number; connected: number };
    }[];
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

function InstitutionRow({
  school,
  onChanged,
  onManageFeatures,
}: {
  school: { schoolId: string; schoolName: string; status: string; totalVans: number; avgHealth: number | null };
  onChanged: () => void;
  onManageFeatures: () => void;
}) {
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
      <td className="py-2 text-right space-x-2">
        <button
          onClick={onManageFeatures}
          className="text-xs px-2.5 py-1 rounded-lg font-medium text-[#1B3B69] hover:bg-[#1B3B69]/5 transition"
        >
          Features
        </button>
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

function BroadcastModal({ onClose }: { onClose: () => void }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.post('/Admin/broadcast', { subject, message }),
    onSuccess: () => onClose(),
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Megaphone size={18} className="text-[#FEC610]" /> Broadcast to All Admins
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Scheduled maintenance this weekend"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1B3B69]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="Emailed to every active school's admin."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1B3B69] resize-none"
            />
          </div>
          {mutation.isError && <p className="text-sm text-red-600">Could not send. Please try again.</p>}
          {mutation.isSuccess && (
            <p className="text-sm text-emerald-600">
              Sent to {(mutation.data as any)?.data?.data?.recipientCount ?? 0} admin(s).
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={!subject.trim() || !message.trim() || mutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#1B3B69] text-white text-sm font-semibold hover:bg-[#111d4a] disabled:opacity-50"
            >
              {mutation.isPending ? 'Sending…' : 'Send Broadcast'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddInstitutionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ schoolName: '', adminName: '', email: '', phone: '', address: '', featureTier: 'basic' as 'basic' | 'premium' });
  const mutation = useMutation({
    mutationFn: () => schoolApi.createInstitution(form),
    onSuccess: () => { onCreated(); onClose(); },
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Plus size={18} className="text-[#1B3B69]" /> Add Institution
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-xs text-gray-400 -mt-1">
            Creates the school and admin account immediately — credentials are emailed. For reviewing an inbound lead first, use School Leads instead.
          </p>
          <input placeholder="School name" value={form.schoolName} onChange={set('schoolName')}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1B3B69]" />
          <input placeholder="Admin full name" value={form.adminName} onChange={set('adminName')}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1B3B69]" />
          <input placeholder="Admin email" type="email" value={form.email} onChange={set('email')}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1B3B69]" />
          <input placeholder="Phone" value={form.phone} onChange={set('phone')}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1B3B69]" />
          <input placeholder="Address (optional)" value={form.address} onChange={set('address')}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1B3B69]" />
          <select
            value={form.featureTier}
            onChange={(e) => setForm((f) => ({ ...f, featureTier: e.target.value as 'basic' | 'premium' }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#1B3B69] bg-white"
          >
            <option value="basic">Basic tier</option>
            <option value="premium">Premium tier</option>
          </select>
          {mutation.isError && (
            <p className="text-sm text-red-600">{(mutation.error as any)?.response?.data?.message || 'Could not create. Please try again.'}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={!form.schoolName || !form.adminName || !form.email || !form.phone || mutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#1B3B69] text-white text-sm font-semibold hover:bg-[#111d4a] disabled:opacity-50"
            >
              {mutation.isPending ? 'Creating…' : 'Create Institution'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['super-admin-overview'],
    queryFn: fetchOverview,
    staleTime: 60_000,
  });
  const [featuresSchool, setFeaturesSchool] = useState<{ id: string; name: string } | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showAddInstitution, setShowAddInstitution] = useState(false);

  return (
    <div className="p-6 space-y-6">
      {featuresSchool && (
        <SchoolFeaturesModal
          schoolId={featuresSchool.id}
          schoolName={featuresSchool.name}
          onClose={() => setFeaturesSchool(null)}
        />
      )}
      {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}
      {showAddInstitution && <AddInstitutionModal onClose={() => setShowAddInstitution(false)} onCreated={() => refetch()} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Command Center</h1>
          <p className="text-sm text-gray-400 mt-0.5">Platform-wide intelligence across all institutions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBroadcast(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#FEC610] text-[#1B3B69] rounded-xl text-sm font-semibold hover:bg-[#e6b40d] transition"
          >
            <Megaphone size={15} /> Broadcast
          </button>
          <button
            onClick={() => setShowAddInstitution(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#1B3B69] text-white rounded-xl text-sm font-semibold hover:bg-[#111d4a] transition"
          >
            <Plus size={15} /> Add Institution
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Revenue Intelligence */}
      {!isLoading && data && (
        <div className="bg-gradient-to-br from-[#1B3B69] to-[#2D4099] rounded-2xl p-6 text-white">
          <p className="text-xs uppercase tracking-wide text-white/60 mb-1">Monthly Recurring Revenue</p>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="text-4xl font-bold">{data.revenue.currency} {data.revenue.totalMrr.toLocaleString()}</p>
              <p className="text-xs text-white/60 mt-1">ARR: {data.revenue.currency} {(data.revenue.totalArr / 1_000_000).toFixed(1)}M</p>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-lg font-bold">{data.institutions.total}</p>
                <p className="text-xs text-white/60">Institutions</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{data.revenue.planBreakdown?.premiumActiveCount ?? 0}</p>
                <p className="text-xs text-white/60">Premium (Paid)</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{data.institutions.newThisWeek}</p>
                <p className="text-xs text-white/60">New This Week</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${data.institutions.churnRatePercent > 10 ? 'text-red-300' : 'text-white'}`}>
                  {data.institutions.churnRatePercent}%
                </p>
                <p className="text-xs text-white/60">Suspended Rate</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-white/60">Van Billing MRR (confirmed)</p>
              <p className="text-lg font-bold">{data.revenue.currency} {data.revenue.vanBillingMrr.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-white/60">Premium MRR</p>
              <p className="text-lg font-bold">{data.revenue.currency} {data.revenue.premiumMrr.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-xs text-white/60">New Today</p>
              <p className="text-lg font-bold">{data.institutions.newToday}</p>
            </div>
            {data.revenue.unbilledSchoolsWithVans > 0 && (
              <div className="bg-amber-400/20 rounded-xl p-3 border border-amber-300/40">
                <p className="text-xs text-white/70">Unbilled Fleet Value</p>
                <p className="text-lg font-bold text-amber-200">
                  {data.revenue.currency} {(data.revenue.potentialVanBillingByCurrency?.[data.revenue.currency] ?? 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-white/60 mt-0.5">{data.revenue.unbilledSchoolsWithVans} institution{data.revenue.unbilledSchoolsWithVans === 1 ? '' : 's'} with vans, no subscription</p>
              </div>
            )}
          </div>
        </div>
      )}

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
              color="#1B3B69"
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
              color="#1B3B69"
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

      {/* App Connection Status */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone size={18} className="text-[#1B3B69]" />
          <h2 className="text-lg font-semibold text-gray-900">App Connection Status</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Parents</span>
              <span className="text-xs text-gray-400">
                {data?.appConnections.parents.connected ?? 0} / {data?.appConnections.parents.total ?? 0} connected
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1B3B69] rounded-full transition-all"
                style={{ width: `${data?.appConnections.parents.rate ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{data?.appConnections.parents.rate ?? 0}% have logged into the app</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Drivers</span>
              <span className="text-xs text-gray-400">
                {data?.appConnections.drivers.connected ?? 0} / {data?.appConnections.drivers.total ?? 0} connected
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FEC610] rounded-full transition-all"
                style={{ width: `${data?.appConnections.drivers.rate ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">{data?.appConnections.drivers.rate ?? 0}% have logged into the app</p>
          </div>
        </div>

        {data?.appConnections.bySchool && data.appConnections.bySchool.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">School</th>
                  <th className="pb-2 font-medium">Parents Connected</th>
                  <th className="pb-2 font-medium">Drivers Connected</th>
                </tr>
              </thead>
              <tbody>
                {data.appConnections.bySchool.map((s) => (
                  <tr key={s.schoolId} className="border-b border-gray-50">
                    <td className="py-2 text-gray-900">{s.schoolName}</td>
                    <td className="py-2 text-gray-600">
                      {s.parents.connected} / {s.parents.total}
                      {s.parents.total > 0 && (
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${s.parents.connected === s.parents.total ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {Math.round((s.parents.connected / s.parents.total) * 100)}%
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-gray-600">
                      {s.drivers.connected} / {s.drivers.total}
                      {s.drivers.total > 0 && (
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${s.drivers.connected === s.drivers.total ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {Math.round((s.drivers.connected / s.drivers.total) * 100)}%
                        </span>
                      )}
                    </td>
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
                <InstitutionRow
                  key={s.schoolId}
                  school={s}
                  onChanged={refetch}
                  onManageFeatures={() => setFeaturesSchool({ id: s.schoolId, name: s.schoolName })}
                />
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
