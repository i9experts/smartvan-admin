'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bus, AlertTriangle, CheckCircle2, XCircle,
  Cpu, MapPin, User, Phone, FileText,
  Activity, Eye, ChevronRight, Search, Filter,
  BadgeCheck, BarChart3, RefreshCw,
} from 'lucide-react';
import { vanApi } from '@/lib/api';

interface VanItem {
  _id: string; carNumber: string; vehicleType: string; venCapacity?: number;
  condition: string; status: string; ownVan: boolean; deviceId?: string;
  assignRoute?: string; expiryDate?: string;
  driver?: { id: string | null; fullname: string; phoneNo: string; image: string };
  routes?: { id: string; title: string; tripType: string }[];
}

function mapVans(raw: any): { data: VanItem[]; total: number } {
  return {
    data: (raw.data ?? []).map((item: any) => ({
      _id: item.van?.id, carNumber: item.van?.carNumber ?? '',
      vehicleType: item.van?.vehicleType ?? '', venCapacity: item.van?.venCapacity,
      condition: item.van?.condition ?? 'Unknown', status: item.van?.status ?? 'inactive',
      ownVan: item.van?.ownVan ?? false, deviceId: item.van?.deviceId ?? '',
      assignRoute: item.van?.assignRoute ?? '', expiryDate: item.van?.expiryDate ?? '',
      driver: item.driver ?? null, routes: item.routes ?? [],
    })),
    total: raw.pagination?.total ?? 0,
  };
}

function getHealthScore(van: VanItem): number {
  let score = 100;
  if (van.condition === 'Poor') score -= 40;
  else if (van.condition === 'Fair') score -= 20;
  else if (van.condition === 'Good') score -= 5;
  if (van.status !== 'active') score -= 20;
  if (!van.driver?.id) score -= 15;
  if (!van.deviceId) score -= 10;
  if (!van.routes || van.routes.length === 0) score -= 10;
  if (van.expiryDate) {
    const days = Math.floor((new Date(van.expiryDate).getTime() - Date.now()) / 86400000);
    if (days < 0) score -= 25;
    else if (days < 30) score -= 15;
  }
  return Math.max(0, score);
}

function getHealthColor(score: number) {
  if (score >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200', label: 'Excellent' };
  if (score >= 60) return { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200', label: 'Good' };
  if (score >= 40) return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-200', label: 'Fair' };
  return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50', border: 'border-red-200', label: 'Critical' };
}

function getConditionColor(condition: string) {
  const map: Record<string,string> = {
    Excellent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Good: 'bg-blue-50 text-blue-700 border-blue-200',
    Fair: 'bg-amber-50 text-amber-700 border-amber-200',
    Poor: 'bg-red-50 text-red-600 border-red-200',
  };
  return map[condition] ?? 'bg-gray-100 text-gray-500 border-gray-200';
}

function getExpiryStatus(expiryDate: string) {
  if (!expiryDate) return { label: 'No date', color: 'text-gray-400', urgent: false };
  const days = Math.floor((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, color: 'text-red-600', urgent: true };
  if (days < 30) return { label: `Expires in ${days}d`, color: 'text-amber-600', urgent: true };
  if (days < 90) return { label: `Expires in ${days}d`, color: 'text-blue-600', urgent: false };
  return { label: new Date(expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), color: 'text-gray-500', urgent: false };
}

function VanDetailDrawer({ van, onClose }: { van: VanItem; onClose: () => void }) {
  const score = getHealthScore(van);
  const health = getHealthColor(score);
  const expiry = getExpiryStatus(van.expiryDate ?? '');
  const checks = [
    { label: 'Driver assigned', ok: !!van.driver?.id },
    { label: 'GPS device active', ok: !!van.deviceId },
    { label: 'Route assigned', ok: !!(van.routes && van.routes.length > 0) },
    { label: 'Vehicle active', ok: van.status === 'active' },
    { label: 'Condition acceptable', ok: van.condition !== 'Poor' },
    { label: 'Documents valid', ok: !expiry.urgent },
  ];
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#1B2B6B] to-[#2d3d7a]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Bus size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{van.carNumber || '—'}</h2>
                <p className="text-blue-200 text-sm">{van.vehicleType}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition"><XCircle size={20} /></button>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="white" strokeWidth="3"
                  strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{score}</span>
              </div>
            </div>
            <div>
              <p className="text-white/70 text-xs">Health Score</p>
              <p className="text-white font-semibold">{health.label}</p>
              <div className="flex gap-1 mt-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`w-4 h-1.5 rounded-full ${i < Math.ceil(score / 20) ? 'bg-white' : 'bg-white/20'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Vehicle Details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Type', value: van.vehicleType || '—' },
                { label: 'Capacity', value: van.venCapacity ? `${van.venCapacity} seats` : '—' },
                { label: 'Condition', value: van.condition || '—' },
                { label: 'Ownership', value: van.ownVan ? 'School-owned' : 'Private' },
                { label: 'GPS Device', value: van.deviceId || 'Not assigned' },
                { label: 'Status', value: van.status === 'active' ? 'Active' : 'Inactive' },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Assigned Driver</p>
            {van.driver?.id ? (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-[#1B2B6B]/10 flex items-center justify-center text-[#1B2B6B] font-bold">{van.driver.fullname?.[0]?.toUpperCase()}</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{van.driver.fullname}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{van.driver.phoneNo}</p>
                </div>
                <BadgeCheck size={16} className="text-emerald-500 ml-auto" />
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <User size={16} className="text-amber-600" />
                <p className="text-sm text-amber-700">No driver assigned</p>
              </div>
            )}
          </div>
          {van.routes && van.routes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Routes ({van.routes.length})</p>
              <div className="space-y-2">
                {van.routes.map(r => (
                  <div key={r.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                    <MapPin size={12} className="text-[#1B2B6B] shrink-0" />
                    <span className="text-sm text-gray-700 flex-1 truncate">{r.title}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${r.tripType === 'pick' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{r.tripType}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Document Compliance</p>
            <div className={`p-3 rounded-xl border ${expiry.urgent ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <FileText size={14} className={expiry.urgent ? 'text-red-500' : 'text-gray-400'} />
                <div>
                  <p className="text-xs text-gray-500">Document Expiry</p>
                  <p className={`text-sm font-medium ${expiry.color}`}>{expiry.label}</p>
                </div>
                {expiry.urgent && <AlertTriangle size={14} className="text-red-500 ml-auto" />}
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Readiness Checklist</p>
            <div className="space-y-2">
              {checks.map(c => (
                <div key={c.label} className="flex items-center gap-3">
                  {c.ok ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> : <XCircle size={15} className="text-red-400 shrink-0" />}
                  <span className={`text-sm ${c.ok ? 'text-gray-700' : 'text-gray-400 line-through'}`}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VanCard({ van, onClick }: { van: VanItem; onClick: () => void }) {
  const score = getHealthScore(van);
  const health = getHealthColor(score);
  const expiry = getExpiryStatus(van.expiryDate ?? '');
  return (
    <div onClick={onClick} className={`bg-white rounded-2xl border-2 ${health.border} hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden`}>
      <div className={`h-1 ${health.bg}`} style={{ width: `${score}%` }} />
      <div className="h-1 bg-gray-100 -mt-1" />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl ${health.light} flex items-center justify-center`}>
              <Bus size={18} className={health.text} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{van.carNumber || '—'}</p>
              <p className="text-xs text-gray-400">{van.vehicleType}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${health.light} ${health.text}`}>{score}% health</div>
            {van.status === 'active'
              ? <span className="flex items-center gap-1 text-[10px] text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Active</span>
              : <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-1.5 h-1.5 rounded-full bg-gray-300" />Inactive</span>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-400">Condition</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">{van.condition || '—'}</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-400">Capacity</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">{van.venCapacity ? `${van.venCapacity}` : '—'}</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-400">Routes</p>
            <p className="text-xs font-semibold text-gray-700 mt-0.5">{van.routes?.length ?? 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          {van.driver?.id ? (
            <>
              <div className="w-5 h-5 rounded-full bg-[#1B2B6B]/10 flex items-center justify-center text-[#1B2B6B] text-[9px] font-bold shrink-0">{van.driver.fullname?.[0]?.toUpperCase()}</div>
              <span className="text-xs text-gray-600 truncate">{van.driver.fullname}</span>
              <BadgeCheck size={12} className="text-emerald-500 shrink-0 ml-auto" />
            </>
          ) : (
            <>
              <User size={12} className="text-amber-500 shrink-0" />
              <span className="text-xs text-amber-600">No driver assigned</span>
            </>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className={`flex items-center gap-1 text-[10px] ${van.deviceId ? 'text-blue-600' : 'text-gray-400'}`}>
            <Cpu size={10} />{van.deviceId ? 'GPS Active' : 'No GPS'}
          </span>
          {expiry.urgent && <span className={`flex items-center gap-1 text-[10px] ${expiry.color}`}><AlertTriangle size={10} />{expiry.label}</span>}
        </div>
      </div>
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition"><ChevronRight size={16} className="text-gray-400" /></div>
    </div>
  );
}

export default function FleetPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'active'|'inactive'|'critical'|'overdue'>('all');
  const [selectedVan, setSelectedVan] = useState<VanItem|null>(null);
  const [view, setView] = useState<'grid'|'list'>('grid');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['fleet-vans'],
    queryFn: () => vanApi.getByAdmin({ page: 1, limit: 100 }),
    select: (r: any) => mapVans(r.data),
    staleTime: 30_000,
  });

  const vans: VanItem[] = data?.data ?? [];

  const stats = useMemo(() => {
    const total = vans.length;
    const active = vans.filter(v => v.status === 'active').length;
    const critical = vans.filter(v => getHealthScore(v) < 40).length;
    const overdue = vans.filter(v => v.expiryDate && new Date(v.expiryDate) < new Date()).length;
    const expiringSoon = vans.filter(v => { if (!v.expiryDate) return false; const d = Math.floor((new Date(v.expiryDate).getTime() - Date.now()) / 86400000); return d >= 0 && d < 30; }).length;
    const withGPS = vans.filter(v => !!v.deviceId).length;
    const withDriver = vans.filter(v => !!v.driver?.id).length;
    const avgHealth = total > 0 ? Math.round(vans.reduce((s, v) => s + getHealthScore(v), 0) / total) : 0;
    return { total, active, critical, overdue, expiringSoon, withGPS, withDriver, avgHealth };
  }, [vans]);

  const filtered = useMemo(() => {
    let list = vans;
    if (search) { const q = search.toLowerCase(); list = list.filter(v => v.carNumber?.toLowerCase().includes(q) || v.vehicleType?.toLowerCase().includes(q) || v.driver?.fullname?.toLowerCase().includes(q)); }
    if (filter === 'active') list = list.filter(v => v.status === 'active');
    else if (filter === 'inactive') list = list.filter(v => v.status !== 'active');
    else if (filter === 'critical') list = list.filter(v => getHealthScore(v) < 40);
    else if (filter === 'overdue') list = list.filter(v => v.expiryDate && new Date(v.expiryDate) < new Date());
    return list;
  }, [vans, search, filter]);

  return (
    <>
      {selectedVan && <VanDetailDrawer van={selectedVan} onClose={() => setSelectedVan(null)} />}
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">Monitor health, compliance & performance of your entire fleet</p>
          </div>
          <button onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50">
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Fleet', value: stats.total, sub: `${stats.active} active`, icon: Bus, light: 'bg-blue-50', text: 'text-[#1B2B6B]' },
            { label: 'Fleet Health', value: `${stats.avgHealth}%`, sub: 'Average score', icon: Activity, light: 'bg-emerald-50', text: 'text-emerald-600' },
            { label: 'Critical Vans', value: stats.critical, sub: 'Need attention', icon: AlertTriangle, light: 'bg-red-50', text: 'text-red-600' },
            { label: 'Doc Issues', value: stats.overdue + stats.expiringSoon, sub: `${stats.overdue} expired · ${stats.expiringSoon} soon`, icon: FileText, light: 'bg-amber-50', text: 'text-amber-600' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                </div>
                <div className={`w-10 h-10 ${card.light} rounded-xl flex items-center justify-center`}>
                  <card.icon size={20} className={card.text} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'GPS Enabled', value: stats.withGPS, total: stats.total, color: 'bg-blue-500', icon: Cpu, iconColor: 'text-blue-600', light: 'bg-blue-50' },
            { label: 'Driver Assigned', value: stats.withDriver, total: stats.total, color: 'bg-emerald-500', icon: User, iconColor: 'text-emerald-600', light: 'bg-emerald-50' },
            { label: 'Total Routes', value: vans.reduce((s,v) => s+(v.routes?.length??0),0), total: null, color: 'bg-purple-500', icon: MapPin, iconColor: 'text-purple-600', light: 'bg-purple-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 ${s.light} rounded-xl flex items-center justify-center`}><s.icon size={18} className={s.iconColor} /></div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}{s.total !== null && <span className="text-sm text-gray-400 font-normal">/{s.total}</span>}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
              {s.total !== null && s.total > 0 && (
                <div className="ml-auto w-12 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full`} style={{ width: `${(s.value/s.total)*100}%` }} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by plate, type or driver…" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            {([{key:'all',label:'All'},{key:'active',label:'Active'},{key:'inactive',label:'Inactive'},{key:'critical',label:'⚠ Critical'},{key:'overdue',label:'📄 Overdue'}] as const).map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${filter===f.key?'bg-[#1B2B6B] text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{f.label}</button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-1 border border-gray-200 rounded-lg p-1">
            <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition ${view==='grid'?'bg-[#1B2B6B] text-white':'text-gray-400 hover:text-gray-600'}`}><BarChart3 size={14} /></button>
            <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition ${view==='list'?'bg-[#1B2B6B] text-white':'text-gray-400 hover:text-gray-600'}`}><Filter size={14} /></button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({length:6}).map((_,i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
                <div className="flex gap-3 mb-3"><div className="w-10 h-10 bg-gray-100 rounded-xl"/><div className="flex-1 space-y-2"><div className="h-4 bg-gray-100 rounded w-24"/><div className="h-3 bg-gray-100 rounded w-16"/></div></div>
                <div className="grid grid-cols-3 gap-2">{[1,2,3].map(j=><div key={j} className="h-12 bg-gray-100 rounded-lg"/>)}</div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <Bus size={40} className="text-gray-200 mx-auto mb-4"/>
            <p className="text-gray-400 font-medium">No vans found</p>
            <p className="text-gray-300 text-sm mt-1">{search?'Try a different search':'Add vans from Van & Driver Management'}</p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(van => <VanCard key={van._id} van={van} onClick={() => setSelectedVan(van)} />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['Van','Health','Condition','Driver','GPS','Documents','Status',''].map(h => <th key={h} className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(van => {
                  const score = getHealthScore(van); const health = getHealthColor(score); const expiry = getExpiryStatus(van.expiryDate??'');
                  return (
                    <tr key={van._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition cursor-pointer" onClick={() => setSelectedVan(van)}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl ${health.light} flex items-center justify-center`}><Bus size={16} className={health.text}/></div>
                          <div><p className="text-sm font-semibold text-gray-900">{van.carNumber}</p><p className="text-xs text-gray-400">{van.vehicleType}</p></div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full ${health.bg} rounded-full`} style={{width:`${score}%`}}/></div>
                          <span className={`text-xs font-semibold ${health.text}`}>{score}%</span>
                        </div>
                      </td>
                      <td className="p-4"><span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getConditionColor(van.condition)}`}>{van.condition||'—'}</span></td>
                      <td className="p-4">{van.driver?.id?<span className="text-sm text-gray-700">{van.driver.fullname}</span>:<span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle size={11}/>Unassigned</span>}</td>
                      <td className="p-4">{van.deviceId?<span className="flex items-center gap-1 text-xs text-blue-600"><Cpu size={11}/>{van.deviceId}</span>:<span className="text-xs text-gray-400">No GPS</span>}</td>
                      <td className="p-4"><span className={`text-xs ${expiry.color}`}>{expiry.label}</span></td>
                      <td className="p-4">{van.status==='active'?<span className="flex items-center gap-1 text-xs text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>Active</span>:<span className="flex items-center gap-1 text-xs text-gray-400"><span className="w-1.5 h-1.5 rounded-full bg-gray-300"/>Inactive</span>}</td>
                      <td className="p-4"><Eye size={15} className="text-gray-400"/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {(stats.overdue > 0 || stats.critical > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-semibold text-red-700">Action Required</p>
              <p className="text-xs text-red-600 mt-0.5">
                {stats.overdue>0&&`${stats.overdue} van${stats.overdue>1?'s have':' has'} expired documents. `}
                {stats.critical>0&&`${stats.critical} van${stats.critical>1?'s are':' is'} in critical condition. `}
                Click on the van cards above for details.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
