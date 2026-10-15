'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Building2, Eye, ShieldCheck, Power, Sparkles,
  ChevronLeft, ChevronRight, Mail, Phone, MapPin, X,
} from 'lucide-react';
import { schoolApi } from '@/lib/api';
import { SchoolFeaturesModal } from '@/components/super-admin/SchoolFeaturesModal';

interface Institution {
  schoolId: string;
  schoolName: string;
  schoolEmail?: string;
  contactPerson?: string;
  contactNumber?: string;
  address?: string;
  status: string;
  image?: string;
  createdAt?: string;
  featureTier: 'basic' | 'premium';
  premiumSubscriptionStatus: string;
  currentPlan: string;
  subscriptionStatus: string;
  totalKids: number;
  totalVans: number;
  totalRoutes: number;
  activeVans: number;
  estimatedMonthlyVanBilling: number;
  currency: string;
}

function TierBadge({ tier }: { tier: 'basic' | 'premium' }) {
  return tier === 'premium' ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-[#FEC610]/20 text-[#8a6500]">
      <Sparkles size={11} /> Premium
    </span>
  ) : (
    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-500">Basic</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'active';
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
      {active ? 'Active' : 'Suspended'}
    </span>
  );
}

function DetailDrawer({ inst, onClose }: { inst: Institution; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={onClose}>
      <div className="bg-white h-full w-full max-w-md shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{inst.schoolName}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex gap-2">
            <StatusBadge status={inst.status} />
            <TierBadge tier={inst.featureTier} />
          </div>
          <div className="space-y-3 text-sm">
            {inst.contactPerson && (
              <div className="flex items-center gap-2 text-gray-600"><Building2 size={14} className="text-gray-400" /> {inst.contactPerson}</div>
            )}
            {inst.schoolEmail && (
              <div className="flex items-center gap-2 text-gray-600"><Mail size={14} className="text-gray-400" /> {inst.schoolEmail}</div>
            )}
            {inst.contactNumber && (
              <div className="flex items-center gap-2 text-gray-600"><Phone size={14} className="text-gray-400" /> {inst.contactNumber}</div>
            )}
            {inst.address && (
              <div className="flex items-center gap-2 text-gray-600"><MapPin size={14} className="text-gray-400" /> {inst.address}</div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{inst.totalKids}</p>
              <p className="text-xs text-gray-400">Students</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{inst.totalVans}</p>
              <p className="text-xs text-gray-400">Vans</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{inst.totalRoutes}</p>
              <p className="text-xs text-gray-400">Routes</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Van billing</span><span className="font-medium text-gray-800">{inst.subscriptionStatus}</span></div>
            {inst.activeVans > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-400">Estimated fleet value</span>
                <span className="font-medium text-gray-800">
                  {inst.currency} {inst.estimatedMonthlyVanBilling.toLocaleString()}/mo
                  {inst.subscriptionStatus !== 'active' && <span className="text-amber-600"> (unbilled)</span>}
                </span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-gray-400">Premium billing</span><span className="font-medium text-gray-800">{inst.premiumSubscriptionStatus}</span></div>
            {inst.createdAt && (
              <div className="flex justify-between"><span className="text-gray-400">Joined</span><span className="font-medium text-gray-800">{new Date(inst.createdAt).toLocaleDateString()}</span></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InstitutionsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState<'all' | 'basic' | 'premium'>('all');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<Institution | null>(null);
  const [managingFeatures, setManagingFeatures] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['institutions', page, search, plan],
    queryFn: () => schoolApi.getAll({ page, limit: 10, search: search || undefined, plan: plan === 'all' ? undefined : plan }),
    select: (res) => res.data,
  });

  const institutions: Institution[] = data?.data ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 1 };

  const toggleStatus = useMutation({
    mutationFn: (inst: Institution) => schoolApi.changeStatus(inst.schoolId, inst.status === 'active' ? 'inActive' : 'active'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['institutions'] }),
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {viewing && <DetailDrawer inst={viewing} onClose={() => setViewing(null)} />}
      {managingFeatures && (
        <SchoolFeaturesModal
          schoolId={managingFeatures.id}
          schoolName={managingFeatures.name}
          onClose={() => setManagingFeatures(null)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
          <Building2 size={24} /> Institutions
        </h1>
        <p className="text-gray-500 text-sm mt-1">Every school on the platform — status, plan, and quick actions.</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search size={15} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by school or city…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="text-sm text-gray-700 bg-transparent outline-none w-full"
          />
        </div>
        <select
          value={plan}
          onChange={(e) => { setPlan(e.target.value as any); setPage(1); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-gray-50 outline-none"
        >
          <option value="all">All Plans</option>
          <option value="basic">Basic</option>
          <option value="premium">Premium</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : institutions.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Building2 size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No institutions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Institution</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Plan</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Students</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Vans</th>
                    <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {institutions.map((inst) => (
                    <tr key={inst.schoolId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-gray-800">{inst.schoolName}</div>
                        <div className="text-xs text-gray-400">{inst.contactPerson}</div>
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={inst.status} /></td>
                      <td className="px-5 py-3.5"><TierBadge tier={inst.featureTier} /></td>
                      <td className="px-5 py-3.5 text-gray-600">{inst.totalKids}</td>
                      <td className="px-5 py-3.5 text-gray-600">{inst.totalVans}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setViewing(inst)} title="View details"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#1B3B69] hover:bg-gray-100">
                            <Eye size={15} />
                          </button>
                          <button onClick={() => setManagingFeatures({ id: inst.schoolId, name: inst.schoolName })} title="Manage features"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#1B3B69] hover:bg-gray-100">
                            <ShieldCheck size={15} />
                          </button>
                          <button
                            onClick={() => toggleStatus.mutate(inst)}
                            disabled={toggleStatus.isPending}
                            title={inst.status === 'active' ? 'Suspend' : 'Reactivate'}
                            className={`p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 ${inst.status === 'active' ? 'text-gray-400 hover:text-red-600' : 'text-gray-400 hover:text-emerald-600'}`}
                          >
                            <Power size={15} />
                          </button>
                        </div>
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
