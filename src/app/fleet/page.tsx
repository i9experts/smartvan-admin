'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bus, Plus, Search, X, AlertCircle, CheckCircle2,
  Wrench, Calendar, Clock, ChevronRight, Eye,
  AlertTriangle, Shield, Fuel, Gauge, Activity,
  FileText, Camera, Bell, TrendingUp, Filter,
  Star, Zap, BarChart2, Settings,
} from 'lucide-react';
import { vanApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Van {
  _id: string;
  carNumber?: string;
  vehicleType?: string;
  venCapacity?: number;
  condition?: string;
  status: string;
  ownVan: boolean;
  driverId?: string;
  venImage?: string;
  expiryDate?: string;
  licenceImageFront?: string;
  licenceImageBack?: string;
  vehicleCardImageFront?: string;
  vehicleCardImageBack?: string;
  createdAt?: string;
  driver?: { fullname?: string; phoneNo?: string };
}

interface MaintenanceLog {
  id: string;
  vanId: string;
  type: 'service' | 'repair' | 'inspection' | 'fuel' | 'tyre' | 'oil' | 'other';
  title: string;
  description: string;
  date: string;
  cost: string;
  mileage: string;
  nextDueDate?: string;
  status: 'completed' | 'pending' | 'overdue';
  createdAt: string;
}

interface VanHealth {
  vanId: string;
  overallScore: number; // 0-100
  engineHealth: number;
  tyreCondition: number;
  brakeCondition: number;
  bodyCondition: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  totalMileage: string;
  fuelType: string;
  insuranceExpiry?: string;
  registrationExpiry?: string;
  notes: string;
}

// ─── Local Storage helpers ────────────────────────────────────────────────────

const LOGS_KEY = 'smartvan_maintenance_logs';
const HEALTH_KEY = 'smartvan_van_health';

function getLogs(): MaintenanceLog[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LOGS_KEY) ?? '[]'); } catch { return []; }
}

function saveLogs(logs: MaintenanceLog[]) {
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

function getHealth(): Record<string, VanHealth> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(HEALTH_KEY) ?? '{}'); } catch { return {}; }
}

function saveHealth(health: Record<string, VanHealth>) {
  localStorage.setItem(HEALTH_KEY, JSON.stringify(health));
}

function defaultHealth(vanId: string): VanHealth {
  return {
    vanId,
    overallScore: 85,
    engineHealth: 90,
    tyreCondition: 80,
    brakeCondition: 85,
    bodyCondition: 90,
    totalMileage: '',
    fuelType: 'Petrol',
    notes: '',
  };
}

// ─── Health Score Badge ───────────────────────────────────────────────────────

function HealthBadge({ score }: { score: number }) {
  if (score >= 80) return (
    <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">
      <CheckCircle2 size={11} /> Excellent
    </span>
  );
  if (score >= 60) return (
    <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full">
      <AlertTriangle size={11} /> Fair
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 text-xs font-semibold rounded-full">
      <AlertCircle size={11} /> Critical
    </span>
  );
}

// ─── Health Ring ──────────────────────────────────────────────────────────────

function HealthRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F3F4F6" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize={size * 0.22} fontWeight="bold" fill={color}>
        {score}
      </text>
    </svg>
  );
}

// ─── Health Bar ───────────────────────────────────────────────────────────────

function HealthBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold text-gray-700">{value}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Maintenance Type Config ──────────────────────────────────────────────────

const LOG_TYPE_CONFIG = {
  service: { label: 'Service', icon: <Wrench size={14} />, color: '#1B2B6B', bg: '#EEF2FF' },
  repair: { label: 'Repair', icon: <AlertTriangle size={14} />, color: '#EF4444', bg: '#FEF2F2' },
  inspection: { label: 'Inspection', icon: <Shield size={14} />, color: '#10B981', bg: '#F0FDF4' },
  fuel: { label: 'Fuel', icon: <Fuel size={14} />, color: '#F59E0B', bg: '#FFFBEB' },
  tyre: { label: 'Tyre', icon: <Gauge size={14} />, color: '#6366F1', bg: '#EEF2FF' },
  oil: { label: 'Oil Change', icon: <Activity size={14} />, color: '#F97316', bg: '#FFF7ED' },
  other: { label: 'Other', icon: <FileText size={14} />, color: '#6B7280', bg: '#F9FAFB' },
};

// ─── Log Status Badge ─────────────────────────────────────────────────────────

function LogStatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">Completed</span>;
  if (status === 'overdue') return <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded-full">Overdue</span>;
  return <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">Pending</span>;
}

// ─── Add Log Modal ────────────────────────────────────────────────────────────

function AddLogModal({ vanId, onClose, onSave }: { vanId: string; onClose: () => void; onSave: (log: MaintenanceLog) => void }) {
  const [form, setForm] = useState({
    type: 'service' as keyof typeof LOG_TYPE_CONFIG,
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    cost: '',
    mileage: '',
    nextDueDate: '',
    status: 'completed' as 'completed' | 'pending' | 'overdue',
  });
  const [error, setError] = useState('');

  function handleSave() {
    if (!form.title) { setError('Title is required.'); return; }
    if (!form.date) { setError('Date is required.'); return; }
    const log: MaintenanceLog = {
      id: Date.now().toString(),
      vanId,
      ...form,
      createdAt: new Date().toISOString(),
    };
    onSave(log);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add Maintenance Log</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Type *</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(LOG_TYPE_CONFIG) as [keyof typeof LOG_TYPE_CONFIG, any][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setForm(f => ({ ...f, type: key }))}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition ${
                    form.type === key ? 'border-current shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                  style={form.type === key ? { backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.color } : {}}
                >
                  <span style={form.type === key ? { color: cfg.color } : { color: '#9CA3AF' }}>{cfg.icon}</span>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Monthly service, Tyre replacement…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Details about the maintenance…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Cost (PKR/AED)</label>
              <input value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                placeholder="e.g. 5000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Mileage (km)</label>
              <input value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))}
                placeholder="e.g. 45000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Next Due Date</label>
              <input type="date" value={form.nextDueDate} onChange={e => setForm(f => ({ ...f, nextDueDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Status</label>
            <div className="flex gap-2">
              {(['completed', 'pending', 'overdue'] as const).map(s => (
                <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition ${
                    form.status === s
                      ? s === 'completed' ? 'bg-emerald-100 text-emerald-700'
                        : s === 'pending' ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>{s}</button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] transition">
            Save Log
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Health Edit Modal ────────────────────────────────────────────────────────

function HealthEditModal({ health, onClose, onSave }: { health: VanHealth; onClose: () => void; onSave: (h: VanHealth) => void }) {
  const [form, setForm] = useState({ ...health });

  function updateScore() {
    const overall = Math.round((form.engineHealth + form.tyreCondition + form.brakeCondition + form.bodyCondition) / 4);
    setForm(f => ({ ...f, overallScore: overall }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Update Van Health</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Health scores */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Component Health (0-100)</h4>
            {[
              { key: 'engineHealth', label: 'Engine Health', color: '#1B2B6B' },
              { key: 'tyreCondition', label: 'Tyre Condition', color: '#6366F1' },
              { key: 'brakeCondition', label: 'Brake Condition', color: '#EF4444' },
              { key: 'bodyCondition', label: 'Body Condition', color: '#10B981' },
            ].map(item => (
              <div key={item.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{item.label}</span>
                  <span className="font-bold" style={{ color: item.color }}>{(form as any)[item.key]}%</span>
                </div>
                <input
                  type="range" min={0} max={100} value={(form as any)[item.key]}
                  onChange={e => { setForm(f => ({ ...f, [item.key]: Number(e.target.value) })); }}
                  onMouseUp={updateScore} onTouchEnd={updateScore}
                  className="w-full accent-[#1B2B6B]"
                  style={{ accentColor: item.color }}
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Fuel Type</label>
              <select value={form.fuelType} onChange={e => setForm(f => ({ ...f, fuelType: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30">
                {['Petrol', 'Diesel', 'CNG', 'Electric', 'Hybrid'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Total Mileage (km)</label>
              <input value={form.totalMileage} onChange={e => setForm(f => ({ ...f, totalMileage: e.target.value }))}
                placeholder="e.g. 45000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Last Service Date</label>
              <input type="date" value={form.lastServiceDate ?? ''} onChange={e => setForm(f => ({ ...f, lastServiceDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Next Service Date</label>
              <input type="date" value={form.nextServiceDate ?? ''} onChange={e => setForm(f => ({ ...f, nextServiceDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Insurance Expiry</label>
              <input type="date" value={form.insuranceExpiry ?? ''} onChange={e => setForm(f => ({ ...f, insuranceExpiry: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Registration Expiry</label>
              <input type="date" value={form.registrationExpiry ?? ''} onChange={e => setForm(f => ({ ...f, registrationExpiry: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Any notes about this van…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={() => { onSave(form); onClose(); }}
            className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] transition">
            Save Health Data
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Van Detail Panel ─────────────────────────────────────────────────────────

function VanDetailPanel({
  van, health, logs, onClose, onAddLog, onEditHealth,
}: {
  van: Van;
  health: VanHealth;
  logs: MaintenanceLog[];
  onClose: () => void;
  onAddLog: () => void;
  onEditHealth: () => void;
}) {
  const vanLogs = logs.filter(l => l.vanId === van._id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalCost = vanLogs.reduce((sum, l) => sum + (Number(l.cost) || 0), 0);
  const overdueCount = vanLogs.filter(l => l.status === 'overdue').length;
  const pendingCount = vanLogs.filter(l => l.status === 'pending').length;

  // Upcoming alerts
  const alerts: string[] = [];
  if (health.nextServiceDate && new Date(health.nextServiceDate) <= new Date(Date.now() + 7 * 86400000)) {
    alerts.push('Service due within 7 days');
  }
  if (health.insuranceExpiry && new Date(health.insuranceExpiry) <= new Date(Date.now() + 30 * 86400000)) {
    alerts.push('Insurance expiring within 30 days');
  }
  if (health.registrationExpiry && new Date(health.registrationExpiry) <= new Date(Date.now() + 30 * 86400000)) {
    alerts.push('Registration expiring within 30 days');
  }
  if (health.overallScore < 60) alerts.push('Vehicle health is critical — service needed');
  if (overdueCount > 0) alerts.push(`${overdueCount} overdue maintenance task${overdueCount > 1 ? 's' : ''}`);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#FFB800]/10 rounded-2xl flex items-center justify-center">
                <Bus size={24} className="text-[#FFB800]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{van.carNumber ?? '—'}</h2>
                <p className="text-xs text-gray-400">{van.vehicleType ?? 'Vehicle'} · {van.ownVan ? 'Owner Van' : 'School Van'}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
              <X size={16} />
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 px-5 pb-4">
            <div className="bg-gray-50 rounded-xl p-2.5 text-center">
              <p className="text-xs text-gray-400">Total Logs</p>
              <p className="text-xl font-bold text-gray-800">{vanLogs.length}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-2.5 text-center">
              <p className="text-xs text-amber-500">Pending</p>
              <p className="text-xl font-bold text-amber-600">{pendingCount + overdueCount}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
              <p className="text-xs text-emerald-500">Total Cost</p>
              <p className="text-lg font-bold text-emerald-600">{totalCost > 0 ? `${totalCost.toLocaleString()}` : '—'}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="mx-5 mt-5 p-4 bg-red-50 border border-red-100 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Bell size={14} className="text-red-500" />
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Action Required</p>
              </div>
              {alerts.map((alert, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-red-600">
                  <AlertCircle size={11} className="shrink-0" />
                  {alert}
                </div>
              ))}
            </div>
          )}

          {/* Health Overview */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Health Overview</h3>
              <button onClick={onEditHealth}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B2B6B] bg-[#1B2B6B]/10 rounded-lg hover:bg-[#1B2B6B]/20 transition">
                <Settings size={12} /> Update
              </button>
            </div>
            <div className="flex items-center gap-5">
              <HealthRing score={health.overallScore} size={90} />
              <div className="flex-1 space-y-3">
                <HealthBar label="Engine" value={health.engineHealth} color="#1B2B6B" />
                <HealthBar label="Tyres" value={health.tyreCondition} color="#6366F1" />
                <HealthBar label="Brakes" value={health.brakeCondition} color="#EF4444" />
                <HealthBar label="Body" value={health.bodyCondition} color="#10B981" />
              </div>
            </div>
          </div>

          {/* Key Details */}
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Vehicle Details</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Fuel Type', val: health.fuelType, icon: <Fuel size={13} /> },
                { label: 'Mileage', val: health.totalMileage ? `${health.totalMileage} km` : '—', icon: <Gauge size={13} /> },
                { label: 'Capacity', val: van.venCapacity ? `${van.venCapacity} seats` : '—', icon: <Bus size={13} /> },
                { label: 'Condition', val: van.condition ?? '—', icon: <Star size={13} /> },
                { label: 'Last Service', val: health.lastServiceDate ? new Date(health.lastServiceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', icon: <Wrench size={13} /> },
                { label: 'Next Service', val: health.nextServiceDate ? new Date(health.nextServiceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', icon: <Calendar size={13} /> },
                { label: 'Insurance', val: health.insuranceExpiry ? new Date(health.insuranceExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', icon: <Shield size={13} /> },
                { label: 'Registration', val: health.registrationExpiry ? new Date(health.registrationExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—', icon: <FileText size={13} /> },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-xl">
                  <span className="text-gray-400 mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-xs font-semibold text-gray-700">{item.val}</p>
                  </div>
                </div>
              ))}
            </div>
            {health.notes && (
              <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-600 font-medium mb-1">Notes</p>
                <p className="text-xs text-blue-700">{health.notes}</p>
              </div>
            )}
          </div>

          {/* Driver */}
          {van.driver && (
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Assigned Driver</h3>
              <div className="flex items-center gap-3 p-3 bg-[#1B2B6B]/5 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-[#1B2B6B] flex items-center justify-center text-white font-bold text-sm">
                  {van.driver.fullname?.charAt(0) ?? 'D'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{van.driver.fullname ?? '—'}</p>
                  <p className="text-xs text-gray-400">{van.driver.phoneNo ?? ''}</p>
                </div>
              </div>
            </div>
          )}

          {/* Maintenance History */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Maintenance History ({vanLogs.length})</h3>
              <button onClick={onAddLog}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1B2B6B] text-white text-xs font-medium rounded-lg hover:bg-[#162356] transition">
                <Plus size={12} /> Add Log
              </button>
            </div>

            {vanLogs.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-gray-400">
                <Wrench size={32} className="mb-3 opacity-20" />
                <p className="text-sm">No maintenance logs yet</p>
                <p className="text-xs mt-1 opacity-60">Add the first log to start tracking</p>
              </div>
            ) : (
              <div className="space-y-3">
                {vanLogs.map(log => {
                  const cfg = LOG_TYPE_CONFIG[log.type];
                  return (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg }}>
                        <span style={{ color: cfg.color }}>{cfg.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-800 truncate">{log.title}</p>
                          <LogStatusBadge status={log.status} />
                        </div>
                        {log.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{log.description}</p>}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar size={10} />
                            {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          {log.cost && <span className="text-xs text-gray-500 font-medium">PKR {Number(log.cost).toLocaleString()}</span>}
                          {log.mileage && <span className="text-xs text-gray-400">{Number(log.mileage).toLocaleString()} km</span>}
                        </div>
                        {log.nextDueDate && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                            <Clock size={10} />
                            Next due: {new Date(log.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FleetPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedVan, setSelectedVan] = useState<Van | null>(null);
  const [showAddLog, setShowAddLog] = useState(false);
  const [showEditHealth, setShowEditHealth] = useState(false);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [healthData, setHealthData] = useState<Record<string, VanHealth>>({});

  // Load from localStorage on mount
  useEffect(() => {
    setLogs(getLogs());
    setHealthData(getHealth());
  }, []);

  const { data: vansRaw, isLoading } = useQuery({
    queryKey: ['fleet-vans'],
    queryFn: () => vanApi.getByAdmin({ page: 1, limit: 100 }),
    select: r => r.data?.data ?? [],
    staleTime: 60_000,
  });

  const vans: Van[] = vansRaw ?? [];

  // Get or create health for a van
  function getVanHealth(vanId: string): VanHealth {
    return healthData[vanId] ?? defaultHealth(vanId);
  }

  function saveLog(log: MaintenanceLog) {
    const updated = [...logs, log];
    setLogs(updated);
    saveLogs(updated);
  }

  function saveVanHealth(health: VanHealth) {
    const updated = { ...healthData, [health.vanId]: health };
    setHealthData(updated);
    saveHealth(updated);
  }

  // Fleet stats
  const totalVans = vans.length;
  const activeVans = vans.filter(v => v.status === 'active').length;
  const criticalVans = vans.filter(v => getVanHealth(v._id).overallScore < 60).length;
  const overdueVans = vans.filter(v => logs.some(l => l.vanId === v._id && l.status === 'overdue')).length;

  const filtered = vans.filter(v => {
    const matchSearch = !search || v.carNumber?.toLowerCase().includes(search.toLowerCase()) || v.vehicleType?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filter === 'active') return v.status === 'active';
    if (filter === 'inactive') return v.status !== 'active';
    if (filter === 'critical') return getVanHealth(v._id).overallScore < 60;
    if (filter === 'overdue') return logs.some(l => l.vanId === v._id && l.status === 'overdue');
    return true;
  });

  return (
    <>
      {selectedVan && !showAddLog && !showEditHealth && (
        <VanDetailPanel
          van={selectedVan}
          health={getVanHealth(selectedVan._id)}
          logs={logs}
          onClose={() => setSelectedVan(null)}
          onAddLog={() => setShowAddLog(true)}
          onEditHealth={() => setShowEditHealth(true)}
        />
      )}
      {showAddLog && selectedVan && (
        <AddLogModal
          vanId={selectedVan._id}
          onClose={() => setShowAddLog(false)}
          onSave={saveLog}
        />
      )}
      {showEditHealth && selectedVan && (
        <HealthEditModal
          health={getVanHealth(selectedVan._id)}
          onClose={() => setShowEditHealth(false)}
          onSave={saveVanHealth}
        />
      )}

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">Monitor health, maintenance & compliance of your entire fleet</p>
          </div>
        </div>

        {/* Fleet Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Fleet', value: totalVans, icon: <Bus size={20} />, color: '#1B2B6B', bg: '#EEF2FF', sub: `${activeVans} active` },
            { label: 'Active Vans', value: activeVans, icon: <Zap size={20} />, color: '#10B981', bg: '#F0FDF4', sub: 'On road' },
            { label: 'Critical Health', value: criticalVans, icon: <AlertTriangle size={20} />, color: '#EF4444', bg: '#FEF2F2', sub: 'Need service' },
            { label: 'Overdue Tasks', value: overdueVans, icon: <Clock size={20} />, color: '#F59E0B', bg: '#FFFBEB', sub: 'Vans affected' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">{card.label}</span>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.bg }}>
                  <span style={{ color: card.color }}>{card.icon}</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{isLoading ? '—' : card.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Fleet Health Overview Bar */}
        {!isLoading && vans.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Fleet Health Distribution</h2>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Excellent (80-100)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Fair (60-79)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Critical (&lt;60)</span>
              </div>
            </div>
            <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
              {(() => {
                const excellent = vans.filter(v => getVanHealth(v._id).overallScore >= 80).length;
                const fair = vans.filter(v => { const s = getVanHealth(v._id).overallScore; return s >= 60 && s < 80; }).length;
                const critical = vans.filter(v => getVanHealth(v._id).overallScore < 60).length;
                return (
                  <>
                    {excellent > 0 && <div className="bg-emerald-500 transition-all" style={{ flex: excellent }} title={`${excellent} excellent`} />}
                    {fair > 0 && <div className="bg-amber-400 transition-all" style={{ flex: fair }} title={`${fair} fair`} />}
                    {critical > 0 && <div className="bg-red-500 transition-all" style={{ flex: critical }} title={`${critical} critical`} />}
                  </>
                );
              })()}
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>{vans.filter(v => getVanHealth(v._id).overallScore >= 80).length} Excellent</span>
              <span>{vans.filter(v => { const s = getVanHealth(v._id).overallScore; return s >= 60 && s < 80; }).length} Fair</span>
              <span>{vans.filter(v => getVanHealth(v._id).overallScore < 60).length} Critical</span>
            </div>
          </div>
        )}

        {/* Filters + Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by plate or type…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            {[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'critical', label: '⚠ Critical' },
              { value: 'overdue', label: '🔴 Overdue' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
                  filter === f.value ? 'bg-[#1B2B6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Van Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="flex gap-4 mb-4">
                  <div className="w-14 h-14 bg-gray-200 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded mb-2" />
                <div className="h-2 bg-gray-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Bus size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">{search ? 'No vans match your search.' : 'No vans in fleet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(van => {
              const health = getVanHealth(van._id);
              const vanLogs = logs.filter(l => l.vanId === van._id);
              const hasOverdue = vanLogs.some(l => l.status === 'overdue');
              const hasPending = vanLogs.some(l => l.status === 'pending');
              const scoreColor = health.overallScore >= 80 ? '#10B981' : health.overallScore >= 60 ? '#F59E0B' : '#EF4444';

              return (
                <div
                  key={van._id}
                  onClick={() => setSelectedVan(van)}
                  className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                    health.overallScore < 60 ? 'border-red-200' : hasOverdue ? 'border-amber-200' : 'border-gray-100 hover:border-[#1B2B6B]/20'
                  }`}
                >
                  {/* Card header */}
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Health ring */}
                      <div className="shrink-0">
                        <HealthRing score={health.overallScore} size={60} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-bold text-gray-900">{van.carNumber ?? '—'}</h3>
                            <p className="text-xs text-gray-400">{van.vehicleType ?? 'Vehicle'}</p>
                          </div>
                          <HealthBadge score={health.overallScore} />
                        </div>

                        {/* Status pills */}
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            van.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {van.status === 'active' ? '● Active' : '○ Inactive'}
                          </span>
                          {hasOverdue && (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-medium rounded-full">⚠ Overdue</span>
                          )}
                          {hasPending && !hasOverdue && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-medium rounded-full">Pending</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Health bars mini */}
                    <div className="mt-4 space-y-2">
                      {[
                        { label: 'Engine', val: health.engineHealth, color: '#1B2B6B' },
                        { label: 'Tyres', val: health.tyreCondition, color: '#6366F1' },
                        { label: 'Brakes', val: health.brakeCondition, color: '#EF4444' },
                      ].map(bar => (
                        <div key={bar.label} className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 w-12 shrink-0">{bar.label}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${bar.val}%`, backgroundColor: bar.color }} />
                          </div>
                          <span className="text-xs font-medium text-gray-500 w-8 text-right">{bar.val}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between rounded-b-2xl hover:bg-gray-50/50 transition">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <FileText size={11} /> {vanLogs.length} log{vanLogs.length !== 1 ? 's' : ''}
                      </span>
                      {health.nextServiceDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          Next: {new Date(health.nextServiceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-[#1B2B6B] transition" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
