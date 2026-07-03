'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  Bus,
} from "lucide-react";
import { api, vanApi } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  _id: string;
  fullname: string;
  grade: number;
  gender: string;
  age: number;
  dob: string;
  status: string;
  verifiedBySchool: boolean;
  VanId?: string;
  schoolId?: string;
  parentId: string;
  image?: string;
  createdAt: string;
}

interface AddStudentForm {
  fullname: string;
  grade: string;
  gender: string;
  age: string;
  dob: string;
  parentEmail: string;
}

const EMPTY_FORM: AddStudentForm = {
  fullname: '',
  grade: '',
  gender: '',
  age: '',
  dob: '',
  parentEmail: '',
};

// ─── API calls ────────────────────────────────────────────────────────────────

async function fetchStudents(page: number, search: string, status: string) {
  const params = new URLSearchParams({
    page: String(page),
    limit: '10',
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  });
  const res = await api.get(`/Admin/Get-Students?${params}`);
  const raw = res.data;
  const students = (raw.data ?? []).map((item: any) => ({
    _id: item.student?.id,
    fullname: item.student?.fullname,
    grade: item.student?.grade,
    gender: item.student?.gender,
    age: item.student?.age,
    dob: item.student?.dob,
    status: item.student?.status,
    verifiedBySchool: item.student?.verifiedBySchool ?? false,
    VanId: item.van?.id,
    parentId: item.parent?.id,
    parentName: item.parent?.fullname,
    parentEmail: item.parent?.email,
    image: item.student?.image,
    createdAt: item.student?.createdAt ?? item.student?.dob,
  }));
  return {
    data: students,
    total: raw.pagination?.total ?? 0,
  };
}

async function addStudent(form: AddStudentForm) {
  return api.post('/Admin/addStudent', {
    fullname: form.fullname,
    grade: Number(form.grade),
    gender: form.gender,
    age: Number(form.age),
    dob: form.dob,
    parentEmail: form.parentEmail,
  });
}

async function editStudent(kidId: string, form: Partial<AddStudentForm>) {
  return api.post('/Admin/editStudent', {
    KidId: kidId,
    fullname: form.fullname,
    grade: Number(form.grade),
    gender: form.gender,
    age: Number(form.age),
    dob: form.dob,
  });
}

async function removeStudents(kidIds: string[]) {
  return api.post('/Admin/removeStudents', { kidIds });
}

async function changeStatus(kidIds: string[], status: string) {
  return api.post('/kid/changeKidStatus', { kidIds, status });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, verified }: { status: string; verified: boolean }) {
  if (status === 'active' && verified) {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
        <CheckCircle2 size={11} /> Active
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
        <Clock size={11} /> Pending Verify
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
      <X size={11} /> Inactive
    </span>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface StudentModalProps {
  mode: 'add' | 'edit';
  student?: Student | null;
  onClose: () => void;
  onSuccess: () => void;
}

function StudentModal({ mode, student, onClose, onSuccess }: StudentModalProps) {
  const [form, setForm] = useState<AddStudentForm>(
    student
      ? {
          fullname: student.fullname ?? '',
          grade: String(student.grade ?? ''),
          gender: student.gender ?? '',
          age: String(student.age ?? ''),
          dob: student.dob ? student.dob.split('T')[0] : '',
          parentEmail: '',
        }
      : EMPTY_FORM
  );
  const [error, setError] = useState('');

  const addMutation = useMutation({
    mutationFn: addStudent,
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to add student'),
  });

  const editMutation = useMutation({
    mutationFn: (f: AddStudentForm) => editStudent(student!._id, f),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to update student'),
  });

  const isLoading = addMutation.isPending || editMutation.isPending;

  async function sendWhatsAppCredentials() {
    if (!form.parentEmail || !form.fullname) return;
    try {
      await api.post('/whatsapp/send-credentials', {
        to: form.parentEmail,
        parentName: 'Parent',
        email: form.parentEmail,
        password: 'SmartVan@123',
        schoolName: 'Your School',
      });
      setError('');
      alert('WhatsApp credentials sent!');
    } catch (e: any) {
      setError('WhatsApp send failed: ' + (e?.response?.data?.message ?? 'Error'));
    }
  }

  function handleSubmit() {
    if (!form.fullname || !form.grade || !form.gender) {
      setError('Name, grade and gender are required.');
      return;
    }
    if (mode === 'add' && !form.parentEmail) {
      setError('Parent email is required for new students.');
      return;
    }
    setError('');
    mode === 'add' ? addMutation.mutate(form) : editMutation.mutate(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === 'add' ? 'Add Student' : 'Edit Student'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
            <input
              value={form.fullname}
              onChange={(e) => setForm((f) => ({ ...f, fullname: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
              placeholder="e.g. Ahmed Khan"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Grade *</label>
              <select
                value={form.grade}
                onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
              >
                <option value="">Select</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Gender *</label>
              <select
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Age</label>
              <input
                type="number"
                min={3}
                max={20}
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.dob}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
              />
            </div>
          </div>

          {mode === 'add' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Parent Email *
              </label>
              <input
                type="email"
                value={form.parentEmail}
                onChange={(e) => setForm((f) => ({ ...f, parentEmail: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
                placeholder="parent@example.com"
              />
              <p className="text-xs text-gray-400 mt-1">
                Parent account will be linked to this student.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs">
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] transition disabled:opacity-50"
          >
            {isLoading ? 'Saving…' : mode === 'add' ? 'Add Student' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

// ─── Assign Route Modal ───────────────────────────────────────────────────────
function AssignVanModal({ student, onClose, onSuccess }: { student: any; onClose: () => void; onSuccess: () => void }) {
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [studentRoutes, setStudentRoutes] = useState<any[]>([]);
  const [tab, setTab] = useState<'assign' | 'current'>('current');

  const { data: routes = [], isLoading: routesLoading } = useQuery({
    queryKey: ['routes-for-assign'],
    queryFn: () => api.get('/route/getRoutes'),
    select: (r: any) => {
      const raw = r.data?.data ?? [];
      const allRoutes: any[] = [];
      raw.forEach((group: any) => {
        if (group.routes) {
          group.routes.forEach((route: any) => {
            allRoutes.push({
              _id: route.id,
              title: route.title || 'Untitled Route',
              tripType: route.tripType,
              startTime: route.startTime,
              van: group.van,
            });
          });
        }
      });
      return allRoutes;
    },
  });

  useEffect(() => {
    api.get(`/route/student-routes/${student._id}`)
      .then(r => setStudentRoutes(r.data?.data ?? []))
      .catch(() => setStudentRoutes([]));
  }, [student._id]);

  async function handleAssign() {
    if (!selectedRouteId) { setError('Please select a route'); return; }
    setLoading(true);
    try {
      await api.post('/route/assignStudentToRoute', {
        routeId: selectedRouteId,
        kidId: student._id,
        lat: 0,
        long: 0,
      });
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to assign route');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnassign(routeId: string) {
    try {
      await api.post('/route/removeStudentFromRoute', {
        routeId,
        kidId: student._id,
      });
      setStudentRoutes(prev => prev.filter((r: any) => r._id !== routeId));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to remove from route');
    }
  }

  const tripTypeLabel = (t: string) => t === 'pick' ? '🌅 Pick Up' : t === 'drop' ? '🌆 Drop Off' : '🔄 Pick & Drop';
  const formatTime = (t: string) => t ? new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1B2B6B]/10 rounded-xl flex items-center justify-center">
              <Bus size={18} className="text-[#1B2B6B]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Route Assignment</h2>
              <p className="text-xs text-gray-400">{student.fullname}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {(['current', 'assign'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${tab === t ? 'border-[#1B2B6B] text-[#1B2B6B]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'current' ? `Current Routes (${studentRoutes.length})` : 'Assign New Route'}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {tab === 'current' ? (
            studentRoutes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Bus size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No routes assigned yet</p>
                <button onClick={() => setTab('assign')} className="mt-3 text-xs text-[#1B2B6B] font-medium hover:underline">
                  Assign to a route →
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {studentRoutes.map((route: any) => (
                  <div key={route._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{route.title || 'Untitled Route'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{tripTypeLabel(route.tripType)} · {formatTime(route.startTime)}</p>
                    </div>
                    <button
                      onClick={() => handleUnassign(route._id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
                    >
                      Unassign
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Select Route</label>
                {routesLoading ? (
                  <div className="text-xs text-gray-400 py-2">Loading routes...</div>
                ) : routes.length === 0 ? (
                  <div className="text-xs text-gray-400 py-2">No routes found. Create a route first in Route Planner.</div>
                ) : (
                  <div className="space-y-2">
                    {routes.map((route: any) => (
                      <div
                        key={route._id}
                        onClick={() => setSelectedRouteId(route._id)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                          selectedRouteId === route._id
                            ? 'border-[#1B2B6B] bg-[#1B2B6B]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{route.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {tripTypeLabel(route.tripType)} · {route.van?.carNumber || 'No van'} · {formatTime(route.startTime)}
                          </p>
                        </div>
                        {selectedRouteId === route._id && (
                          <div className="w-5 h-5 rounded-full bg-[#1B2B6B] flex items-center justify-center shrink-0">
                            <CheckCircle2 size={12} className="text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={loading || !selectedRouteId}
                  className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] transition disabled:opacity-50"
                >
                  {loading ? 'Assigning...' : 'Assign to Route'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({
  count,
  onConfirm,
  onCancel,
  loading,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 mx-4 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={24} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Student{count > 1 ? 's' : ''}?</h3>
        <p className="text-sm text-gray-500 mb-6">
          You are about to remove {count} student{count > 1 ? 's' : ''} from your school. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition disabled:opacity-50"
          >
            {loading ? 'Removing…' : 'Yes, Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [assignVanTarget, setAssignVanTarget] = useState<Student | null>(null);
  const [editTarget, setEditTarget] = useState<Student | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['students', page, search, statusFilter],
    queryFn: () => fetchStudents(page, search, statusFilter),
    staleTime: 30_000,
  });

  const students: Student[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  const removeMutation = useMutation({
    mutationFn: removeStudents,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      setSelected(new Set());
      setShowDelete(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      changeStatus(ids, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      setSelected(new Set());
    },
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === students.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(students.map((s) => s._id)));
    }
  }

  function openEdit(student: Student) {
    setEditTarget(student);
    setModal('edit');
  }

  const selectedArr = Array.from(selected);

  return (
    <>
      {assignVanTarget && (
        <AssignVanModal
          student={assignVanTarget}
          onClose={() => setAssignVanTarget(null)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['students'] }); setAssignVanTarget(null); }}
        />
      )}
      {modal === 'add' && (
        <StudentModal
          mode="add"
          onClose={() => setModal(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['students'] })}
        />
      )}
      {modal === 'edit' && (
        <StudentModal
          mode="edit"
          student={editTarget}
          onClose={() => setModal(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['students'] })}
        />
      )}
      {showDelete && (
        <DeleteConfirm
          count={selectedArr.length}
          loading={removeMutation.isPending}
          onConfirm={() => removeMutation.mutate(selectedArr)}
          onCancel={() => setShowDelete(false)}
        />
      )}

      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Students</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {total} student{total !== 1 ? 's' : ''} registered
            </p>
          </div>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2B6B] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition"
          >
            <Plus size={16} />
            Add Student
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            {(['', 'active', 'inActive'] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
                  statusFilter === s
                    ? 'bg-[#1B2B6B] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === '' ? 'All' : s === 'active' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-[#1B2B6B]/5 rounded-xl">
            <span className="text-sm font-medium text-[#1B2B6B]">
              {selected.size} selected
            </span>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => statusMutation.mutate({ ids: selectedArr, status: 'active' })}
                disabled={statusMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition"
              >
                Activate
              </button>
              <button
                onClick={() => statusMutation.mutate({ ids: selectedArr, status: 'inActive' })}
                disabled={statusMutation.isPending}
                className="px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition"
              >
                Deactivate
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="px-3 py-1.5 text-xs font-medium bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === students.length && students.length > 0}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Student
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Grade
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Gender
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Van
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Joined
                  </th>
                  <th className="p-4 w-20" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50 animate-pulse">
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="p-4">
                          <div className="h-4 bg-gray-100 rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-gray-400 text-sm">
                      {search ? 'No students match your search.' : 'No students yet. Add one above.'}
                    </td>
                  </tr>
                ) : (
                  students.map((student) => (
                    <tr
                      key={student._id}
                      className={`border-b border-gray-50 hover:bg-gray-50/50 transition ${
                        selected.has(student._id) ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selected.has(student._id)}
                          onChange={() => toggleSelect(student._id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#1B2B6B]/10 flex items-center justify-center text-[#1B2B6B] font-semibold text-sm shrink-0">
                            {student.fullname?.charAt(0)?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {student.fullname ?? '—'}
                            </p>
                            <p className="text-xs text-gray-400">{student.age ? `Age ${student.age}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {student.grade ? `Grade ${student.grade}` : '—'}
                      </td>
                      <td className="p-4 text-sm text-gray-600 capitalize">
                        {student.gender ?? '—'}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        {student.VanId ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                            Assigned
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="p-4">
                        <StatusBadge
                          status={student.status}
                          verified={student.verifiedBySchool}
                        />
                      </td>
                      <td className="p-4 text-xs text-gray-400">
                        {new Date(student.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setAssignVanTarget(student)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                            title="Assign Van"
                          >
                            <Bus size={14} />
                          </button>
                          <button
                            onClick={() => openEdit(student)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
                            title="Edit student"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setSelected(new Set([student._id]));
                              setShowDelete(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                            title="Remove student"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Page {page} of {totalPages} · {total} total
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || isFetching}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition ${
                        page === p
                          ? 'bg-[#1B2B6B] text-white'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || isFetching}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
