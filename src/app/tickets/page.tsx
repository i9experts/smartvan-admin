'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock3, MapPin, WifiOff, Wrench, MessageSquare, UserCheck } from 'lucide-react';
import { reportApi, employeeApi } from '@/lib/api';

interface Ticket {
  _id: string;
  schoolName?: string;
  issueType?: string;
  description?: string;
  status: string;
  driverName?: string;
  parentName?: string;
  kidName?: string;
  vanCarNumber?: string;
  assignedTo?: string;
  createdAt: string;
}

interface Employee {
  _id: string;
  name: string;
  permissions: string[];
}

const STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  pending: { label: 'Pending', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  in_progress: { label: 'In progress', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  resolved: { label: 'Resolved', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  rejected: { label: 'Rejected', dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-100' },
};

function categoryMeta(issueType?: string) {
  const t = (issueType || '').toLowerCase();
  if (t.includes('child') || t.includes('not picked') || t.includes('not dropped')) {
    return { icon: AlertTriangle, accent: 'bg-red-500', iconBg: 'bg-red-50', iconText: 'text-red-600' };
  }
  if (t.includes('late') || t.includes('delay')) {
    return { icon: Clock3, accent: 'bg-amber-500', iconBg: 'bg-amber-50', iconText: 'text-amber-600' };
  }
  if (t.includes('route')) {
    return { icon: MapPin, accent: 'bg-blue-500', iconBg: 'bg-blue-50', iconText: 'text-blue-600' };
  }
  if (t.includes('tracking')) {
    return { icon: WifiOff, accent: 'bg-purple-500', iconBg: 'bg-purple-50', iconText: 'text-purple-600' };
  }
  if (t.includes('vehicle')) {
    return { icon: Wrench, accent: 'bg-slate-400', iconBg: 'bg-slate-50', iconText: 'text-slate-600' };
  }
  return { icon: MessageSquare, accent: 'bg-[#1B2B6B]', iconBg: 'bg-[#1B2B6B]/5', iconText: 'text-[#1B2B6B]' };
}

function timeAgo(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

async function fetchTickets(status: string): Promise<Ticket[]> {
  const res = await reportApi.getByAdmin({ page: 1, limit: 100, ...(status ? { status } : {}) });
  return res.data?.data ?? [];
}

async function fetchEmployees(): Promise<Employee[]> {
  const res = await employeeApi.getAll();
  return (res.data?.data ?? []).filter((e: Employee) => e.permissions?.includes('manage_tickets'));
}

function TicketRow({ ticket, employees }: { ticket: Ticket; employees: Employee[] }) {
  const qc = useQueryClient();
  const cat = categoryMeta(ticket.issueType);
  const Icon = cat.icon;
  const meta = STATUS_META[ticket.status] ?? STATUS_META.pending;

  const assignMutation = useMutation({
    mutationFn: (employeeId: string) => employeeApi.assignTicket(ticket._id, employeeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-tickets'] }),
  });

  const who = ticket.parentName || ticket.driverName || null;

  return (
    <div className="relative bg-white rounded-xl border border-gray-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${cat.accent}`} />
      <div className="pl-5 pr-4 py-4 flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cat.iconBg}`}>
          <Icon size={16} className={cat.iconText} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13.5px] font-semibold text-gray-900 truncate">{ticket.issueType || 'General Complaint'}</p>
            <span className={`shrink-0 flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full ${meta.bg} ${meta.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {ticket.schoolName || 'Unknown school'}{who ? ` · ${who}` : ''}{ticket.vanCarNumber ? ` · ${ticket.vanCarNumber}` : ''} · {timeAgo(ticket.createdAt)}
          </p>
          {ticket.description && <p className="text-[13px] text-gray-600 mt-2 leading-relaxed">{ticket.description}</p>}

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
            <UserCheck size={13} className="text-gray-400" />
            <select
              defaultValue={ticket.assignedTo || ''}
              onChange={(e) => e.target.value && assignMutation.mutate(e.target.value)}
              disabled={assignMutation.isPending}
              className="text-[12px] text-gray-700 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/20 bg-white"
            >
              <option value="">Unassigned</option>
              {employees.map((e) => (
                <option key={e._id} value={e._id}>{e.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: tickets = [], isLoading } = useQuery({ queryKey: ['all-tickets', statusFilter], queryFn: () => fetchTickets(statusFilter) });
  const { data: employees = [] } = useQuery({ queryKey: ['assignable-employees'], queryFn: fetchEmployees });

  const filters = ['', 'pending', 'in_progress', 'resolved', 'rejected'];

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
        <p className="text-sm text-gray-400 mt-0.5">All complaints across every institution</p>
      </div>

      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === f ? 'bg-[#1B2B6B] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f ? (STATUS_META[f]?.label ?? f) : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl p-14 text-center border border-gray-100">
          <p className="text-sm text-gray-400">No tickets match this filter</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tickets.map((t) => <TicketRow key={t._id} ticket={t} employees={employees} />)}
        </div>
      )}
    </div>
  );
}
