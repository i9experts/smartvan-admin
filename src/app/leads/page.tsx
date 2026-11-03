'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, Building2, ChevronRight, Plus, Upload, RefreshCw, X, Trophy, UserCircle2, Flame } from 'lucide-react';
import { leadsApi, employeeApi, Lead, LeadStatus, LeaderboardRow } from '@/lib/api';

const STAGES: { key: LeadStatus; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: '#1B3B69' },
  { key: 'contacted', label: 'Contacted', color: '#F2994A' },
  { key: 'demo', label: 'Demo', color: '#9B59B6' },
  { key: 'trial', label: 'Trial', color: '#2D9CDB' },
  { key: 'won', label: 'Won', color: '#27AE60' },
  { key: 'lost', label: 'Lost', color: '#EB5757' },
];

const SOURCE_LABELS: Record<string, string> = {
  website: 'Website',
  contact_us: 'Contact Us',
  manual: 'Manual',
  import: 'Import',
  stalled_trial: 'Stalled Trial',
  parent_demand: 'Parent Demand',
};

// Maps common spreadsheet header spellings to the field names the backend
// expects — lets people import without rewriting their own column headers.
const IMPORT_HEADER_ALIASES: Record<string, string> = {
  school: 'schoolName', schoolname: 'schoolName', 'school name': 'schoolName',
  type: 'schoolType', schooltype: 'schoolType', 'school type': 'schoolType',
  admin: 'adminName', adminname: 'adminName', 'admin name': 'adminName', contact: 'adminName', 'contact name': 'adminName',
  title: 'designation', role: 'designation',
  email: 'email', 'e-mail': 'email',
  phone: 'phone', phonenumber: 'phone', 'phone number': 'phone', mobile: 'phone',
  country: 'country',
  city: 'city',
  address: 'address',
  vans: 'vanCount', vancount: 'vanCount', 'van count': 'vanCount', 'no of vans': 'vanCount',
  students: 'studentCount', studentcount: 'studentCount', 'student count': 'studentCount',
  plan: 'plan',
  currency: 'currency',
  notes: 'challenges', challenges: 'challenges',
};

function normalizeImportRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    const normalized = IMPORT_HEADER_ALIASES[key.trim().toLowerCase()];
    if (normalized) out[normalized] = value;
  }
  return out;
}

function ScoreBadge({ score }: { score?: number }) {
  if (score == null) return null;
  const tier = score >= 70 ? 'bg-emerald-50 text-emerald-600' : score >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500';
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${tier}`}>{score}</span>;
}

function LeadCard({ lead, salesReps }: { lead: Lead; salesReps: { _id: string; name: string }[] }) {
  const qc = useQueryClient();
  const moveStage = useMutation({
    mutationFn: (status: LeadStatus) => leadsApi.updateStatus(lead._id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
  const assign = useMutation({
    mutationFn: (employeeId: string) => leadsApi.assign(lead._id, employeeId || null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm hover:shadow-md transition-shadow">
      <Link href={`/leads/${lead._id}`} className="block">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-gray-800 text-sm truncate flex items-center gap-1">
            {lead.lastEscalatedAt && <Flame size={12} className="text-red-400 shrink-0" />}
            {lead.schoolName}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <ScoreBadge score={lead.score} />
            {lead.source && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
                {SOURCE_LABELS[lead.source] || lead.source}
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 truncate">{lead.adminName}{lead.city ? ` · ${lead.city}` : ''}</p>
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
      {salesReps.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100">
          <UserCircle2 size={13} className="text-gray-300 shrink-0" />
          <select
            value={lead.assignedTo || ''}
            disabled={assign.isPending}
            onChange={(e) => assign.mutate(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-xs border-none bg-transparent text-gray-500 outline-none"
          >
            <option value="">Unassigned</option>
            {salesReps.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function LeaderboardStrip({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5">
      <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-3"><Trophy size={15} className="text-amber-500" /> Leaderboard — Won This Month</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {rows.map((r, i) => (
          <div key={r.employeeId} className="flex-shrink-0 w-44 bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 truncate">{i === 0 && r.wonThisMonth > 0 ? '🏆 ' : ''}{r.name}</span>
              <span className="text-xs text-gray-400">#{i + 1}</span>
            </div>
            <p className="text-xl font-bold text-[#1B3B69] mt-1">{r.wonThisMonth}{r.target > 0 && <span className="text-xs text-gray-400 font-normal"> / {r.target}</span>}</p>
            {r.target > 0 && (
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1.5">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(r.progressPercent || 0, 100)}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AddLeadModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    schoolName: '', adminName: '', email: '', phone: '', city: '', country: '', vanCount: '', studentCount: '',
  });

  const create = useMutation({
    mutationFn: () => leadsApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); onClose(); },
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
          <div className="flex gap-2">
            <input placeholder="Vans" value={form.vanCount} onChange={set('vanCount')}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
            <input placeholder="Students" value={form.studentCount} onChange={set('studentCount')}
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

function ImportResultBanner({ result, onClose }: { result: { created: number; merged: number; failed: { row: number; reason: string }[] }; onClose: () => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-emerald-600">{result.created} added</span>
          {' · '}
          <span className="font-semibold text-amber-600">{result.merged} merged into existing leads</span>
          {result.failed.length > 0 && <>{' · '}<span className="font-semibold text-red-500">{result.failed.length} skipped</span></>}
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>
      {result.failed.length > 0 && (
        <ul className="mt-2 text-xs text-gray-400 space-y-0.5">
          {result.failed.slice(0, 10).map((f, i) => <li key={i}>Row {f.row}: {f.reason}</li>)}
          {result.failed.length > 10 && <li>…and {result.failed.length - 10} more</li>}
        </ul>
      )}
    </div>
  );
}

export default function LeadsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; merged: number; failed: { row: number; reason: string }[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => leadsApi.getAll(),
    select: (res) => res.data.data,
    staleTime: 30_000,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeApi.getAll(),
    select: (res: any) => (res.data?.data ?? []) as { _id: string; name: string; permissions: string[]; status: string }[],
    staleTime: 60_000,
  });
  const salesReps = (employees ?? []).filter((e) => e.status === 'active' && e.permissions.includes('manage_leads'));

  const { data: leaderboard } = useQuery({
    queryKey: ['leads-leaderboard'],
    queryFn: () => leadsApi.getLeaderboard(),
    select: (res) => res.data.data,
    staleTime: 30_000,
    enabled: salesReps.length > 0,
  });

  const syncStalled = useMutation({
    mutationFn: () => leadsApi.syncStalledSchools(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      setImportResult({ created: res.data.data.created, merged: 0, failed: [] });
    },
  });

  const importMutation = useMutation({
    mutationFn: (rows: Record<string, any>[]) => leadsApi.import(rows),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['leads'] }); setImportResult(res.data.data); },
    onError: () => setImportError('Import failed — please check the file and try again.'),
  });

  const handleFile = async (file: File) => {
    setImportError(null);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);
      const rows = rawRows.map(normalizeImportRow).filter((r) => r.schoolName || r.adminName || r.email);
      if (rows.length === 0) {
        setImportError('No recognizable rows found — check the column headers (School Name, Contact Name, Email, Phone, City, Country…).');
        return;
      }
      importMutation.mutate(rows);
    } catch {
      setImportError('Could not read that file — please upload a .xlsx or .csv file.');
    }
  };

  const leads = data ?? [];
  const filtered = leads.filter((l) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      l.schoolName.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q) ||
      l.adminName.toLowerCase().includes(q)
    );
  });

  const byStage = (stage: LeadStatus) =>
    filtered.filter((l) => l.status === stage).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}

      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
            <Users size={24} /> School Leads
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Pipeline from first contact to a paying school — click a card for notes, tasks and email.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => syncStalled.mutate()}
            disabled={syncStalled.isPending}
            title="Pull in schools with real vans but no active subscription"
            className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-[#1B3B69] hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncStalled.isPending ? 'animate-spin' : ''} /> Sync stalled schools
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importMutation.isPending}
            className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-[#1B3B69] hover:bg-gray-50 disabled:opacity-50"
          >
            <Upload size={14} /> {importMutation.isPending ? 'Importing…' : 'Import'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl bg-[#1B3B69] text-white"
          >
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {importError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm flex items-center justify-between">
          {importError}
          <button onClick={() => setImportError(null)}><X size={14} /></button>
        </div>
      )}
      {importResult && <ImportResultBanner result={importResult} onClose={() => setImportResult(null)} />}

      {leaderboard && <LeaderboardStrip rows={leaderboard} />}

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
                    stageLeads.map((lead) => <LeadCard key={lead._id} lead={lead} salesReps={salesReps} />)
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
