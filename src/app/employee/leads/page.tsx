'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, ChevronRight, Plus, X, Trophy } from 'lucide-react';
import { leadsApi, Lead, LeadStatus } from '@/lib/api';

const STAGES: { key: LeadStatus; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: '#1B3B69' },
  { key: 'contacted', label: 'Contacted', color: '#F2994A' },
  { key: 'demo', label: 'Demo', color: '#9B59B6' },
  { key: 'trial', label: 'Trial', color: '#2D9CDB' },
  { key: 'won', label: 'Won', color: '#27AE60' },
  { key: 'lost', label: 'Lost', color: '#EB5757' },
];

function LeadCard({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const moveStage = useMutation({
    mutationFn: (status: LeadStatus) => leadsApi.updateStatus(lead._id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-leads'] }),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/employee/leads/${lead._id}`} className="block">
        <p className="font-semibold text-gray-800 text-sm truncate">{lead.schoolName}</p>
        <p className="text-xs text-gray-400 truncate">{lead.adminName}{lead.city ? ` · ${lead.city}` : ''}</p>
      </Link>
      <div className="flex items-center justify-between mt-2.5 gap-2">
        <select
          value={lead.status}
          disabled={moveStage.isPending}
          onChange={(e) => moveStage.mutate(e.target.value as LeadStatus)}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-gray-50 outline-none"
        >
          {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <Link href={`/employee/leads/${lead._id}`} className="text-gray-300 hover:text-[#1B3B69] shrink-0">
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function AddLeadModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ schoolName: '', adminName: '', email: '', phone: '', city: '', country: '' });

  const create = useMutation({
    mutationFn: () => leadsApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-leads'] }); onClose(); },
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Add Lead</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input placeholder="School name *" value={form.schoolName} onChange={set('schoolName')}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
          <input placeholder="Contact name *" value={form.adminName} onChange={set('adminName')}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
          <input placeholder="Email *" type="email" value={form.email} onChange={set('email')}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
          <input placeholder="Phone" value={form.phone} onChange={set('phone')}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
          <div className="flex gap-2">
            <input placeholder="City" value={form.city} onChange={set('city')}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
            <input placeholder="Country" value={form.country} onChange={set('country')}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
          </div>
        </div>
        {create.isError && <p className="text-xs text-red-500 mt-2">Couldn&apos;t save — check the required fields.</p>}
        <button
          onClick={() => create.mutate()}
          disabled={!form.schoolName.trim() || !form.adminName.trim() || !form.email.trim() || create.isPending}
          className="mt-4 w-full text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#1B3B69] text-white disabled:opacity-40"
        >
          {create.isPending ? 'Adding…' : 'Add Lead'}
        </button>
      </div>
    </div>
  );
}

export default function MyLeadsPage() {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-leads'],
    queryFn: () => leadsApi.getAll(),
    select: (res) => res.data.data,
    staleTime: 30_000,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ['leads-leaderboard'],
    queryFn: () => leadsApi.getLeaderboard(),
    select: (res) => res.data.data,
    staleTime: 30_000,
  });

  const me = (() => {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem('smartvan_user') ?? '{}'); } catch { return null; }
  })();
  const myRow = (leaderboard ?? []).find((r) => r.employeeId === me?.id);
  const myRank = myRow ? (leaderboard ?? []).findIndex((r) => r.employeeId === me?.id) + 1 : null;

  const leads = data ?? [];
  const filtered = leads.filter((l) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return l.schoolName.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.adminName.toLowerCase().includes(q);
  });

  const byStage = (stage: LeadStatus) => filtered.filter((l) => l.status === stage);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}

      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
            <Users size={24} /> My Leads
          </h1>
          <p className="text-gray-500 text-sm mt-1">Your assigned pipeline — click a card for notes, tasks and email.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl bg-[#1B3B69] text-white"
        >
          <Plus size={14} /> Add Lead
        </button>
      </div>

      {myRow && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5 flex items-center gap-4">
          <Trophy size={20} className="text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-gray-700">
              <span className="font-bold text-[#1B3B69]">{myRow.wonThisMonth}</span>
              {myRow.target > 0 ? ` / ${myRow.target} won this month` : ' won this month'}
              {myRank && <span className="text-gray-400"> · ranked #{myRank} of {leaderboard?.length}</span>}
            </p>
            {myRow.target > 0 && (
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1.5 max-w-xs">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(myRow.progressPercent || 0, 100)}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48 max-w-sm">
          <Search size={15} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by school, email, admin…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm text-gray-700 bg-transparent outline-none w-full"
          />
        </div>
        <span className="text-xs text-gray-400">{filtered.length} lead{filtered.length === 1 ? '' : 's'}</span>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 text-center py-16 text-gray-400">
          <Users size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No leads assigned yet</p>
          <p className="text-sm mt-1">Leads your manager assigns to you will show up here.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STAGES.map((stage) => {
            const stageLeads = byStage(stage.key);
            return (
              <div key={stage.key} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm font-semibold text-gray-700">{stage.label}</span>
                  </div>
                  <span className="text-xs font-medium text-gray-400">{stageLeads.length}</span>
                </div>
                <div className="space-y-2.5 min-h-[80px]">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-300 border border-dashed border-gray-200 rounded-xl">No leads</div>
                  ) : (
                    stageLeads.map((lead) => <LeadCard key={lead._id} lead={lead} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
