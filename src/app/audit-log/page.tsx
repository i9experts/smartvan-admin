'use client';

import { useQuery } from '@tanstack/react-query';
import {
  LogIn, XCircle, CheckCircle2, UserPlus, UserMinus, ShieldCheck, Send, History,
} from 'lucide-react';
import { auditLogApi } from '@/lib/api';

interface LogEntry {
  _id: string;
  action: string;
  actorEmail: string;
  actorRole: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

const ACTION_META: Record<string, { icon: any; iconBg: string; iconText: string; describe: (l: LogEntry) => string }> = {
  login: {
    icon: LogIn, iconBg: 'bg-blue-50', iconText: 'text-blue-600',
    describe: (l) => `${l.actorEmail} logged in`,
  },
  school_suspended: {
    icon: XCircle, iconBg: 'bg-red-50', iconText: 'text-red-600',
    describe: (l) => `Suspended ${l.metadata?.schoolName ?? 'a school'}`,
  },
  school_activated: {
    icon: CheckCircle2, iconBg: 'bg-emerald-50', iconText: 'text-emerald-600',
    describe: (l) => `Activated ${l.metadata?.schoolName ?? 'a school'}`,
  },
  employee_created: {
    icon: UserPlus, iconBg: 'bg-purple-50', iconText: 'text-purple-600',
    describe: (l) => `Created employee ${l.metadata?.employeeEmail ?? ''}`,
  },
  employee_deleted: {
    icon: UserMinus, iconBg: 'bg-gray-100', iconText: 'text-gray-500',
    describe: (l) => `Removed employee ${l.metadata?.deletedEmployeeEmail ?? ''}`,
  },
  employee_permissions_changed: {
    icon: ShieldCheck, iconBg: 'bg-amber-50', iconText: 'text-amber-600',
    describe: (l) => `Updated permissions (${(l.metadata?.newPermissions ?? []).join(', ')})`,
  },
  ticket_assigned: {
    icon: Send, iconBg: 'bg-[#1B2B6B]/5', iconText: 'text-[#1B2B6B]',
    describe: (l) => `Assigned a ticket to ${l.metadata?.employeeName ?? 'a team member'}`,
  },
};

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

async function fetchLogs(): Promise<LogEntry[]> {
  const res = await auditLogApi.getRecent();
  return res.data?.data ?? [];
}

export default function AuditLogPage() {
  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({ queryKey: ['audit-logs'], queryFn: fetchLogs });

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-400 mt-0.5">Recent actions across the platform</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl p-14 text-center border border-gray-100">
          <div className="w-12 h-12 rounded-full bg-[#1B2B6B]/5 flex items-center justify-center mx-auto mb-3.5">
            <History size={20} className="text-[#1B2B6B]" />
          </div>
          <p className="text-[13.5px] font-medium text-gray-700">No activity yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {logs.map((log) => {
            const meta = ACTION_META[log.action] ?? {
              icon: History, iconBg: 'bg-gray-100', iconText: 'text-gray-500',
              describe: (l: LogEntry) => l.action,
            };
            const Icon = meta.icon;
            return (
              <div key={log._id} className="flex items-center gap-3 px-5 py-3.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.iconBg}`}>
                  <Icon size={15} className={meta.iconText} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-gray-800 truncate">{meta.describe(log)}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{log.actorEmail} · {log.actorRole}</p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(log.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
