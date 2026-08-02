'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, X, Shield, Pencil } from 'lucide-react';
import { staffApi } from '@/lib/api';

interface Staff {
  _id: string;
  fullname: string;
  email: string;
  phoneNo?: string;
  roleTitle?: string;
  permissions: string[];
  status: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  view_dashboard: 'View Dashboard',
  manage_students: 'Student Management',
  manage_fleet: 'Vans & Drivers',
  manage_parents: 'Parent Management',
  manage_routes: 'Route Planner',
  view_alerts: 'Alerts Overview',
  manage_complaints: 'Complaints & Reported Issues',
  manage_fees: 'Fee Management',
  view_fleet_health: 'Fleet Health',
  view_attendance: 'Attendance',
  view_analytics: 'Analytics',
};

async function fetchStaff(): Promise<Staff[]> {
  const res = await staffApi.getAll();
  return res.data?.data ?? [];
}

async function fetchPermissions(): Promise<string[]> {
  const res = await staffApi.getPermissions();
  return res.data?.data ?? [];
}

function StaffModal({
  staff,
  availablePermissions,
  onClose,
  onSuccess,
}: {
  staff: Staff | null;
  availablePermissions: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [fullname, setFullname] = useState(staff?.fullname ?? '');
  const [email, setEmail] = useState(staff?.email ?? '');
  const [phoneNo, setPhoneNo] = useState(staff?.phoneNo ?? '');
  const [roleTitle, setRoleTitle] = useState(staff?.roleTitle ?? '');
  const [password, setPassword] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(staff?.permissions ?? []);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      staff
        ? staffApi.update(staff._id, { fullname, phoneNo, roleTitle, permissions: selectedPerms })
        : staffApi.create({ fullname, email, password, phoneNo: phoneNo || undefined, roleTitle: roleTitle || undefined, permissions: selectedPerms }),
    onSuccess: () => onSuccess(),
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to save staff member'),
  });

  function togglePerm(p: string) {
    setSelectedPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  const canSubmit = staff
    ? !!fullname
    : !!fullname && !!email && !!password;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{staff ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input value={fullname} onChange={(e) => setFullname(e.target.value)} placeholder="Full name" autoComplete="off" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            autoComplete="off"
            disabled={!!staff}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50 disabled:text-gray-400"
          />
          <input value={phoneNo} onChange={(e) => setPhoneNo(e.target.value)} placeholder="Phone number (optional)" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="Role title, e.g. Fleet Manager (optional)" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          {!staff && (
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="new-password" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          )}

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Permissions — what this staff member can access</p>
            <div className="grid grid-cols-2 gap-2">
              {availablePermissions.map((p) => (
                <label key={p} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={selectedPerms.includes(p)} onChange={() => togglePerm(p)} className="rounded" />
                  {PERMISSION_LABELS[p] ?? p}
                </label>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</div>}

          <button
            onClick={() => { setError(''); mutation.mutate(); }}
            disabled={mutation.isPending || !canSubmit}
            className="w-full py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : staff ? 'Save Changes' : 'Create Staff Member'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamRolesPage() {
  const qc = useQueryClient();
  const [modalTarget, setModalTarget] = useState<Staff | null | 'new'>(null);

  const { data: staffList = [], isLoading } = useQuery({ queryKey: ['school-staff'], queryFn: fetchStaff });
  const { data: availablePermissions = [] } = useQuery({ queryKey: ['school-staff-permissions'], queryFn: fetchPermissions });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => staffApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['school-staff'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => staffApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['school-staff'] }),
  });

  return (
    <div className="p-6 space-y-6">
      {modalTarget && (
        <StaffModal
          staff={modalTarget === 'new' ? null : modalTarget}
          availablePermissions={availablePermissions}
          onClose={() => setModalTarget(null)}
          onSuccess={() => { setModalTarget(null); qc.invalidateQueries({ queryKey: ['school-staff'] }); }}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team &amp; Roles</h1>
          <p className="text-sm text-gray-400 mt-0.5">Create staff accounts with their own login, limited to only what they need</p>
        </div>
        <button
          onClick={() => setModalTarget('new')}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B2B6B] text-white rounded-xl text-sm font-semibold"
        >
          <UserPlus size={16} /> Add Staff Member
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Permissions</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">Loading…</td></tr>
            ) : staffList.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">No staff members yet</td></tr>
            ) : (
              staffList.map((s) => (
                <tr key={s._id} className="border-b border-gray-50">
                  <td className="p-4 text-gray-900 font-medium">
                    {s.fullname}
                    {s.roleTitle && <span className="block text-xs text-gray-400 font-normal">{s.roleTitle}</span>}
                  </td>
                  <td className="p-4 text-gray-600">{s.email}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {s.permissions.length === 0 ? (
                        <span className="text-xs text-gray-400">No access granted</span>
                      ) : (
                        s.permissions.map((p) => (
                          <span key={p} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            <Shield size={10} /> {PERMISSION_LABELS[p] ?? p}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => statusMutation.mutate({ id: s._id, status: s.status === 'active' ? 'inactive' : 'active' })}
                      className={`text-xs px-2 py-1 rounded-full ${s.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {s.status}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setModalTarget(s)} className="text-gray-400 hover:text-[#1B2B6B]">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => deleteMutation.mutate(s._id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
