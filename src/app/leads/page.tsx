'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, Building2, ChevronRight } from 'lucide-react';
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/leads/${lead._id}`} className="block">
        <p className="font-semibold text-gray-800 text-sm truncate">{lead.schoolName}</p>
        <p className="text-xs text-gray-400 truncate">{lead.adminName} · {lead.city}</p>
        {(lead.vanCount || lead.studentCount) && (
          <p className="text-xs text-gray-400 mt-1">{lead.vanCount || '—'} vans · {lead.studentCount || '—'} students</p>
        )}
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
        <Link href={`/leads/${lead._id}`} className="text-gray-300 hover:text-[#1B3B69] shrink-0">
          <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsApi.getAll(),
    select: (res) => res.data.data,
    staleTime: 30_000,
  });

  const leads = data ?? [];
  const filtered = leads.filter((l) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      l.schoolName.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.city.toLowerCase().includes(q) ||
      l.adminName.toLowerCase().includes(q)
    );
  });

  const byStage = (stage: LeadStatus) => filtered.filter((l) => l.status === stage);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
          <Users size={24} /> School Leads
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Pipeline from first contact to a paying school — click a card for notes, tasks and email.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48 max-w-sm">
          <Search size={15} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by school, email, city, admin…"
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
          <Building2 size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No leads yet</p>
          <p className="text-sm mt-1">Leads from smartvan.pk will appear here</p>
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
                    <div className="text-center py-8 text-xs text-gray-300 border border-dashed border-gray-200 rounded-xl">
                      No leads
                    </div>
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
