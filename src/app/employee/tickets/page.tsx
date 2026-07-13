'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock3, CheckCircle2, XCircle, MessageSquare, MapPin,
  WifiOff, Wrench, AlertTriangle, Inbox, ChevronRight,
} from 'lucide-react';
import { employeeApi } from '@/lib/api';

interface Ticket {
  _id: string;
  issueType?: string;
  description?: string;
  status: string;
  dateOfIncident?: string;
  adminRemarks?: string;
  createdAt: string;
}

const STATUS_OPTIONS = ['pending', 'in_progress', 'resolved', 'rejected'];

const STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  pending: { label: 'Pending', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
  in_progress: { label: 'In progress', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
  resolved: { label: 'Resolved', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  rejected: { label: 'Rejected', dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-100' },
};

// Category → icon + urgency accent. Child-safety issues get the highest urgency color.
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

function TicketCard({ ticket }: { ticket: Ticket }) {
  const qc = useQueryClient();
  const [remarks, setRemarks] = useState(ticket.adminRemarks ?? '');
  const [showRemarks, setShowRemarks] = useState(false);
  const cat = categoryMeta(ticket.issueType);
  const Icon = cat.icon;
  const meta = STATUS_META[ticket.status] ?? STATUS_META.pending;

  const statusMutation = useMutation({
    mutationFn: (status: string) => employeeApi.updateTicketStatus(ticket._id, status, remarks || undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-tickets'] }),
  });

  return (
    <div className="relative bg-white rounded-xl border border-gray-100 shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${cat.accent}`} />
      <div className="pl-5 pr-4 py-4">
        <div className="flex items-start gap-3">
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
            <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(ticket.createdAt)}</p>
            {ticket.description && (
              <p className="text-[13px] text-gray-600 mt-2 leading-relaxed">{ticket.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3.5 pt-3.5 border-t border-gray-50">
          <select
            value={ticket.status}
            onChange={(e) => statusMutation.mutate(e.target.value)}
            disabled={statusMutation.isPending}
            className="text-[12px] font-medium text-gray-700 border border-gray-200 rounded-lg pl-2.5 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/20 bg-white"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowRemarks((v) => !v)}
            className="flex items-center gap-1.5 text-[12px] text-gray-500 hover:text-[#1B2B6B] transition px-2 py-1.5"
          >
            <MessageSquare size={13} />
            {ticket.adminRemarks ? 'Edit note' : 'Add note'}
            <ChevronRight size={12} className={`transition-transform ${showRemarks ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {showRemarks && (
          <div className="flex gap-2 mt-2.5">
            <input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="What did you do about this?"
              className="flex-1 text-[12.5px] border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/20"
            />
            <button
              onClick={() => { statusMutation.mutate(ticket.status); setShowRemarks(false); }}
              className="text-[12px] font-medium px-3.5 py-2 bg-[#1B2B6B] text-white rounded-lg hover:bg-[#162356] transition"
            >
              Save note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmployeeTicketsPage() {
  const { data: tickets = [], isLoading } = useQuery({ queryKey: ['my-tickets'], queryFn: fetchMyTickets });

  const active = tickets.filter((t) => t.status === 'pending' || t.status === 'in_progress');
  const closed = tickets.filter((t) => t.status === 'resolved' || t.status === 'rejected');

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Tickets</h1>
          <p className="text-[13px] text-gray-400 mt-0.5">Complaints and issues assigned to you</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-lg font-bold text-[#1B2B6B] leading-none">{active.length}</p>
            <p className="text-[10.5px] text-gray-400 mt-1">Active</p>
          </div>
          <div className="w-px h-8 bg-gray-200" />
          <div className="text-right">
            <p className="text-lg font-bold text-emerald-600 leading-none">{closed.length}</p>
            <p className="text-[10.5px] text-gray-400 mt-1">Closed</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl p-14 text-center border border-gray-100">
          <div className="w-12 h-12 rounded-full bg-[#1B2B6B]/5 flex items-center justify-center mx-auto mb-3.5">
            <Inbox size={20} className="text-[#1B2B6B]" />
          </div>
          <p className="text-[13.5px] font-medium text-gray-700">Nothing assigned yet</p>
          <p className="text-[12.5px] text-gray-400 mt-1">Tickets routed to you will show up here.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {active.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-0.5">Active</p>
              {active.map((t) => <TicketCard key={t._id} ticket={t} />)}
            </div>
          )}
          {closed.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-0.5">Closed</p>
              {closed.map((t) => <TicketCard key={t._id} ticket={t} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

async function fetchMyTickets(): Promise<Ticket[]> {
  const res = await employeeApi.getMyTickets();
  return res.data?.data ?? [];
}
