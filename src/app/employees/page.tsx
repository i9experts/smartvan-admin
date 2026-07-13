'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, X, Shield } from 'lucide-react';
import { employeeApi } from '@/lib/api';

interface Employee {
  _id: string;
  name: string;
  email: string;
  permissions: string[];
  status: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  view_dashboard: 'View Dashboard',
  view_billing: 'View Billing',
  manage_billing: 'Manage Billing',
  view_fleet: 'View Fleet',
  view_tickets: 'View Tickets',
  manage_tickets: 'Manage Tickets',
  view_schools: 'View Schools',
  manage_schools: 'Manage Schools',
};

async function fetchEmployees(): Promise<Employee[]> {
  const res = await employeeApi.getAll();
  return res.data?.data ?? [];
}

async function fetchPermissions(): Promise<string[]> {
  const res = await employeeApi.getPermissions();
  return res.data?.data ?? [];
}

function AddEmployeeModal({ availablePermissions, onClose, onSuccess }: { availablePermissions: string[]; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => employeeApi.create({ name, email, password, permissions: selectedPerms }),
    onSuccess: () => onSuccess(),
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to create employee'),
  });

  function togglePerm(p: string) {
    setSelectedPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Employee</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="off" name="employee-name-field" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="off" name="employee-email-field" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" autoComplete="new-password" name="employee-password-field" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Permissions</p>
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
            disabled={mutation.isPending || !name || !email || !password}
            className="w-full py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating…' : 'Create Employee'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: employees = [], isLoading } = useQuery({ queryKey: ['employees'], queryFn: fetchEmployees });
  const { data: availablePermissions = [] } = useQuery({ queryKey: ['employee-permissions'], queryFn: fetchPermissions });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeeApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => employeeApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });

  return (
    <div className="p-6 space-y-6">
      {showAddModal && (
        <AddEmployeeModal
          availablePermissions={availablePermissions}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); qc.invalidateQueries({ queryKey: ['employees'] }); }}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage internal team access and permissions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B2B6B] text-white rounded-xl text-sm font-semibold"
        >
          <UserPlus size={16} /> Add Employee
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
            ) : employees.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-400">No employees yet</td></tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp._id} className="border-b border-gray-50">
                  <td className="p-4 text-gray-900 font-medium">{emp.name}</td>
                  <td className="p-4 text-gray-600">{emp.email}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {emp.permissions.map((p) => (
                        <span key={p} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          <Shield size={10} /> {PERMISSION_LABELS[p] ?? p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => statusMutation.mutate({ id: emp._id, status: emp.status === 'active' ? 'inactive' : 'active' })}
                      className={`text-xs px-2 py-1 rounded-full ${emp.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {emp.status}
                    </button>
                  </td>
                  <td className="p-4">
                    <button onClick={() => deleteMutation.mutate(emp._id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
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
