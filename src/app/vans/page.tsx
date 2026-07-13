'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, X, AlertCircle, RefreshCw,
  Bus, Filter, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, UserCheck, MapPin, Cpu, User, Phone,
} from 'lucide-react';
import { vanApi, api, uploadApi } from '@/lib/api';

interface VanItem {
  _id: string;
  carNumber: string;
  vehicleType: string;
  venCapacity?: number;
  condition: string;
  status: string;
  ownVan: boolean;
  deviceId?: string;
  assignRoute?: string;
  driver?: { id: string | null; fullname: string; phoneNo: string; image: string };
  routes?: { id: string; title: string; tripType: string }[];
  insuranceExpiry?: string;
  registrationExpiry?: string;
  fitnessExpiry?: string;
  routePermitExpiry?: string;
  insuranceDocUrl?: string;
  registrationDocUrl?: string;
  fitnessDocUrl?: string;
  routePermitDocUrl?: string;
}
interface Driver {
  _id: string; fullname: string; email: string; phoneNo: string; image: string; status: string;
}
interface VanForm {
  carNumber: string; vehicleType: string; venCapacity: string;
  condition: string; deviceId: string; assignRoute: string; ownVan: boolean;
  insuranceExpiry: string; registrationExpiry: string; fitnessExpiry: string; routePermitExpiry: string;
  insuranceDocUrl: string; registrationDocUrl: string; fitnessDocUrl: string; routePermitDocUrl: string;
}
const EMPTY_FORM: VanForm = {
  carNumber: '', vehicleType: '', venCapacity: '', condition: '', deviceId: '', assignRoute: '', ownVan: false,
  insuranceExpiry: '', registrationExpiry: '', fitnessExpiry: '', routePermitExpiry: '',
  insuranceDocUrl: '', registrationDocUrl: '', fitnessDocUrl: '', routePermitDocUrl: '',
};
const VEHICLE_TYPES = ['Suzuki Bolan','Toyota Hiace','Suzuki Carry','Honda Civic','Toyota Corolla','Hyundai H100','Datsun','Other'];
const CONDITIONS = ['Excellent','Good','Fair','Poor'];

function mapVans(raw: any): { data: VanItem[]; total: number } {
  return {
    data: (raw.data ?? []).map((item: any) => ({
      _id: item.van?.id,
      carNumber: item.van?.carNumber ?? '',
      vehicleType: item.van?.vehicleType ?? '',
      venCapacity: item.van?.venCapacity,
      condition: item.van?.condition ?? '',
      status: item.van?.status ?? 'inactive',
      ownVan: item.van?.ownVan ?? false,
      deviceId: item.van?.deviceId ?? '',
      assignRoute: item.van?.assignRoute ?? '',
      driver: item.driver ?? null,
      routes: item.routes ?? [],
      insuranceExpiry: item.van?.insuranceExpiry ?? '',
      registrationExpiry: item.van?.registrationExpiry ?? '',
      fitnessExpiry: item.van?.fitnessExpiry ?? '',
      routePermitExpiry: item.van?.routePermitExpiry ?? '',
      insuranceDocUrl: item.van?.insuranceDocUrl ?? '',
      registrationDocUrl: item.van?.registrationDocUrl ?? '',
      fitnessDocUrl: item.van?.fitnessDocUrl ?? '',
      routePermitDocUrl: item.van?.routePermitDocUrl ?? '',
    })),
    total: raw.pagination?.total ?? 0,
  };
}

function VanStatusBadge({ status }: { status: string }) {
  return status === 'active' ? (
    <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full"><CheckCircle2 size={11} /> Active</span>
  ) : (
    <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full"><XCircle size={11} /> Inactive</span>
  );
}

function ConditionBadge({ condition }: { condition: string }) {
  const map: Record<string,string> = { Excellent:'bg-emerald-50 text-emerald-700', Good:'bg-blue-50 text-blue-700', Fair:'bg-amber-50 text-amber-700', Poor:'bg-red-50 text-red-600' };
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${map[condition] ?? 'bg-gray-100 text-gray-500'}`}>{condition || '—'}</span>;
}

function VanModal({ mode, van, onClose, onSuccess }: { mode: 'add'|'edit'; van?: VanItem|null; onClose: ()=>void; onSuccess: ()=>void }) {
  const [form, setForm] = useState<VanForm>(
    van ? {
      carNumber: van.carNumber, vehicleType: van.vehicleType, venCapacity: String(van.venCapacity ?? ''), condition: van.condition,
      deviceId: van.deviceId ?? '', assignRoute: van.assignRoute ?? '', ownVan: van.ownVan,
      insuranceExpiry: van.insuranceExpiry ?? '', registrationExpiry: van.registrationExpiry ?? '',
      fitnessExpiry: van.fitnessExpiry ?? '', routePermitExpiry: van.routePermitExpiry ?? '',
      insuranceDocUrl: van.insuranceDocUrl ?? '', registrationDocUrl: van.registrationDocUrl ?? '',
      fitnessDocUrl: van.fitnessDocUrl ?? '', routePermitDocUrl: van.routePermitDocUrl ?? '',
    } : EMPTY_FORM
  );
  const [error, setError] = useState('');
  const addMutation = useMutation({
    mutationFn: (f: VanForm) => vanApi.addByAdmin({
      carNumber: f.carNumber, vehicleType: f.vehicleType, venCapacity: f.venCapacity ? Number(f.venCapacity) : undefined, condition: f.condition,
      deviceId: f.deviceId || undefined, assignRoute: f.assignRoute || undefined, ownVan: f.ownVan,
      insuranceExpiry: f.insuranceExpiry || undefined, registrationExpiry: f.registrationExpiry || undefined,
      fitnessExpiry: f.fitnessExpiry || undefined, routePermitExpiry: f.routePermitExpiry || undefined,
      insuranceDocUrl: f.insuranceDocUrl || undefined, registrationDocUrl: f.registrationDocUrl || undefined,
      fitnessDocUrl: f.fitnessDocUrl || undefined, routePermitDocUrl: f.routePermitDocUrl || undefined,
    }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to add van'),
  });
  const editMutation = useMutation({
    mutationFn: (f: VanForm) => vanApi.editByAdmin({
      vanId: van!._id, carNumber: f.carNumber, vehicleType: f.vehicleType, venCapacity: f.venCapacity ? Number(f.venCapacity) : undefined, condition: f.condition,
      deviceId: f.deviceId || undefined, assignRoute: f.assignRoute || undefined, ownVan: f.ownVan,
      insuranceExpiry: f.insuranceExpiry || undefined, registrationExpiry: f.registrationExpiry || undefined,
      fitnessExpiry: f.fitnessExpiry || undefined, routePermitExpiry: f.routePermitExpiry || undefined,
      insuranceDocUrl: f.insuranceDocUrl || undefined, registrationDocUrl: f.registrationDocUrl || undefined,
      fitnessDocUrl: f.fitnessDocUrl || undefined, routePermitDocUrl: f.routePermitDocUrl || undefined,
    }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to update van'),
  });
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  async function handleFileUpload(field: 'insuranceDocUrl' | 'registrationDocUrl' | 'fitnessDocUrl' | 'routePermitDocUrl', file: File) {
    setUploadingField(field);
    try {
      const res = await uploadApi.image(file);
      const url = res.data?.url ?? res.data?.data?.url ?? '';
      setForm(f => ({ ...f, [field]: url }));
    } catch (e) {
      setError('File upload failed. Please try again.');
    } finally {
      setUploadingField(null);
    }
  }
  const isLoading = addMutation.isPending || editMutation.isPending;
  function handleSubmit() {
    if (!form.carNumber || !form.vehicleType || !form.condition) { setError('Plate number, vehicle type and condition are required.'); return; }
    setError('');
    mode === 'add' ? addMutation.mutate(form) : editMutation.mutate(form);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{mode === 'add' ? 'Add New Van' : 'Edit Van'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fill in the vehicle details below</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Vehicle Identity</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plate Number *</label>
                <input value={form.carNumber} onChange={e => setForm(f => ({ ...f, carNumber: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white" placeholder="e.g. KHI-1234" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Type *</label>
                <select value={form.vehicleType} onChange={e => setForm(f => ({ ...f, vehicleType: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white">
                  <option value="">Select type</option>
                  {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Capacity & Condition</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Seating Capacity</label>
                <input type="number" min={1} max={50} value={form.venCapacity} onChange={e => setForm(f => ({ ...f, venCapacity: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white" placeholder="e.g. 12" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Condition *</label>
                <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white">
                  <option value="">Select condition</option>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">GPS & Route</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">GPS Device ID</label>
                <input value={form.deviceId} onChange={e => setForm(f => ({ ...f, deviceId: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white" placeholder="e.g. GPS-TRK-00123" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Assigned Route</label>
                <input value={form.assignRoute} onChange={e => setForm(f => ({ ...f, assignRoute: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white" placeholder="e.g. Route A - Gulshan to School" />
              </div>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Compliance & Documents</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Insurance Expiry</label>
                <input type="date" value={form.insuranceExpiry} onChange={e => setForm(f => ({ ...f, insuranceExpiry: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white" />
                <label className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg py-1.5 cursor-pointer hover:bg-gray-100">
                  {uploadingField === 'insuranceDocUrl' ? 'Uploading…' : form.insuranceDocUrl ? '✓ Document uploaded' : 'Upload document'}
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => e.target.files?.[0] && handleFileUpload('insuranceDocUrl', e.target.files[0])} />
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Registration Expiry</label>
                <input type="date" value={form.registrationExpiry} onChange={e => setForm(f => ({ ...f, registrationExpiry: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white" />
                <label className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg py-1.5 cursor-pointer hover:bg-gray-100">
                  {uploadingField === 'registrationDocUrl' ? 'Uploading…' : form.registrationDocUrl ? '✓ Document uploaded' : 'Upload document'}
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => e.target.files?.[0] && handleFileUpload('registrationDocUrl', e.target.files[0])} />
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fitness Cert. Expiry</label>
                <input type="date" value={form.fitnessExpiry} onChange={e => setForm(f => ({ ...f, fitnessExpiry: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white" />
                <label className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg py-1.5 cursor-pointer hover:bg-gray-100">
                  {uploadingField === 'fitnessDocUrl' ? 'Uploading…' : form.fitnessDocUrl ? '✓ Document uploaded' : 'Upload document'}
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => e.target.files?.[0] && handleFileUpload('fitnessDocUrl', e.target.files[0])} />
                </label>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Route Permit Expiry</label>
                <input type="date" value={form.routePermitExpiry} onChange={e => setForm(f => ({ ...f, routePermitExpiry: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white" />
                <label className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg py-1.5 cursor-pointer hover:bg-gray-100">
                  {uploadingField === 'routePermitDocUrl' ? 'Uploading…' : form.routePermitDocUrl ? '✓ Document uploaded' : 'Upload document'}
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => e.target.files?.[0] && handleFileUpload('routePermitDocUrl', e.target.files[0])} />
                </label>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input type="checkbox" id="ownVan" checked={form.ownVan} onChange={e => setForm(f => ({ ...f, ownVan: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 accent-[#1B2B6B]" />
            <div>
              <label htmlFor="ownVan" className="text-sm font-medium text-gray-700 cursor-pointer">School-owned vehicle</label>
              <p className="text-xs text-gray-400">Check if this van is owned by the school</p>
            </div>
          </div>
          {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs"><AlertCircle size={14} /> {error}</div>}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSubmit} disabled={isLoading} className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] transition disabled:opacity-50">{isLoading ? 'Saving…' : mode === 'add' ? 'Add Van' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}

function AssignDriverModal({ van, drivers, onClose, onSuccess }: { van: VanItem; drivers: Driver[]; onClose: ()=>void; onSuccess: ()=>void }) {
  const qc = useQueryClient();
  const [selectedDriver, setSelectedDriver] = useState('');
  const [error, setError] = useState('');
  const assignMutation = useMutation({
    mutationFn: () => vanApi.assignVanToDriver(selectedDriver, van._id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vans'] }); onSuccess(); onClose(); },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to assign driver'),
  });
  const unassignMutation = useMutation({
    mutationFn: () => vanApi.removeDriverFromVan(van._id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vans'] }); onClose(); },
  });
  const activeDrivers = drivers.filter(d => d.status === 'active');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assign Driver</h2>
            <p className="text-xs text-gray-400 mt-0.5">Van: {van.carNumber} · {van.vehicleType}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={16} /></button>
        </div>
        {van.driver?.id && (
          <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
            <div className="w-9 h-9 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 font-bold text-sm">{van.driver.fullname?.[0]?.toUpperCase()}</div>
            <div className="flex-1"><p className="text-sm font-medium text-gray-900">{van.driver.fullname}</p><p className="text-xs text-gray-500">{van.driver.phoneNo}</p></div>
            <button onClick={() => unassignMutation.mutate()} disabled={unassignMutation.isPending} className="text-xs text-red-500 hover:text-red-700 font-medium">Unassign</button>
          </div>
        )}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {activeDrivers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No active drivers available</p>
          ) : activeDrivers.map(d => (
            <label key={d._id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${selectedDriver === d._id ? 'border-[#1B2B6B] bg-[#1B2B6B]/5' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" name="driver" value={d._id} checked={selectedDriver === d._id} onChange={() => setSelectedDriver(d._id)} className="hidden" />
              <div className="w-9 h-9 rounded-full bg-[#1B2B6B]/10 flex items-center justify-center text-[#1B2B6B] font-bold text-sm shrink-0">{d.fullname?.[0]?.toUpperCase()}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900">{d.fullname}</p><p className="text-xs text-gray-400">{d.phoneNo}</p></div>
              {selectedDriver === d._id && <CheckCircle2 size={16} className="text-[#1B2B6B] shrink-0" />}
            </label>
          ))}
        </div>
        {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs mt-3"><AlertCircle size={14} />{error}</div>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={() => assignMutation.mutate()} disabled={!selectedDriver || assignMutation.isPending} className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] disabled:opacity-50">{assignMutation.isPending ? 'Assigning…' : 'Assign Driver'}</button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirm({ van, onConfirm, onCancel, loading }: { van: VanItem; onConfirm: ()=>void; onCancel: ()=>void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 mx-4 text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-red-500" /></div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Van?</h3>
        <p className="text-sm text-gray-500 mb-1"><span className="font-medium">{van.carNumber}</span> · {van.vehicleType}</p>
        <p className="text-sm text-gray-400 mb-6">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 disabled:opacity-50">{loading ? 'Removing…' : 'Yes, Remove'}</button>
        </div>
      </div>
    </div>
  );
}

function AddDriverModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullname: '', email: '', phoneNo: '', alternatePhoneNo: '',
    password: '', NIC: '', address: '',
    expiryDateLicense: '', expiryDateVehicleCard: '',
  });
  const [error, setError] = useState('');
  const f = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => api.post('/van/addDriverByAdmin', form),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['drivers-list'] });
      const tempPassword = res?.data?.data?.temporaryPassword;
      if (tempPassword) {
        alert(`Driver added! A WhatsApp with login details was sent to ${form.phoneNo || 'the driver'}.\n\nIf WhatsApp delivery fails, share this password manually:\n${tempPassword}`);
      }
      onClose();
    },
    onError: (e: any) => setError(e?.response?.data?.message ?? 'Failed to add driver'),
  });

  function handleNext() {
    if (!form.fullname) { setError('Full name is required.'); return; }
    if (!form.phoneNo && !form.NIC && !form.email) { setError('Please provide at least a phone number, CNIC, or email.'); return; }
    if (form.password && form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError(''); setStep(2);
  }

  function handleSubmit() {
    if (!form.phoneNo && !form.NIC && !form.email) { setError('Please provide at least a phone number, CNIC, or email.'); return; }
    setError(''); mutation.mutate();
  }

  const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 bg-white";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add New Driver</h2>
              <p className="text-xs text-gray-400 mt-0.5">Complete driver profile with legal documents</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"><X size={16} /></button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-3">
            {[{ n: 1, label: 'Personal Info' }, { n: 2, label: 'Legal Documents' }].map((s, i) => (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step >= s.n ? 'bg-[#1B2B6B] text-white' : 'bg-gray-100 text-gray-400'}`}>{s.n}</div>
                <span className={`text-xs font-medium ${step >= s.n ? 'text-[#1B2B6B]' : 'text-gray-400'}`}>{s.label}</span>
                {i < 1 && <div className={`flex-1 h-0.5 ${step > s.n ? 'bg-[#1B2B6B]' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              {/* Personal Info */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Personal Information</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Full Name *</label>
                    <input value={form.fullname} onChange={e => f('fullname', e.target.value)} className={inputClass} placeholder="e.g. Muhammad Ahmed Khan" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input value={form.phoneNo} onChange={e => f('phoneNo', e.target.value)} className={inputClass} placeholder="+92300..." />
                    </div>
                    <div>
                      <label className={labelClass}>Alternate Phone</label>
                      <input value={form.alternatePhoneNo} onChange={e => f('alternatePhoneNo', e.target.value)} className={inputClass} placeholder="+92301..." />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Home Address</label>
                    <input value={form.address} onChange={e => f('address', e.target.value)} className={inputClass} placeholder="Street, Area, City" />
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">App Account</p>
                <p className="text-xs text-gray-400 -mt-1 mb-3">Most drivers log in with just their phone number — email is optional.</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Email Address (optional)</label>
                    <input type="email" value={form.email} onChange={e => f('email', e.target.value)} className={inputClass} placeholder="driver@example.com" autoComplete="off" />
                  </div>
                  <div>
                    <label className={labelClass}>Password (optional — auto-generated if left blank)</label>
                    <input type="password" value={form.password} onChange={e => f('password', e.target.value)} className={inputClass} placeholder="Leave blank to auto-generate" autoComplete="new-password" />
                    <p className="text-xs text-gray-400 mt-1">Sent directly to the driver via WhatsApp — no email or OTP needed.</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* CNIC */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">CNIC / National ID</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>CNIC Number (optional) <span className="text-gray-400 font-normal">(e.g. 42101-1234567-1)</span></label>
                    <input value={form.NIC} onChange={e => f('NIC', e.target.value)} className={inputClass} placeholder="XXXXX-XXXXXXX-X" />
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-xs text-blue-700 font-medium">📎 CNIC Document Upload</p>
                    <p className="text-xs text-blue-500 mt-1">CNIC image upload coming soon. For now the driver can upload it from the Driver App.</p>
                  </div>
                </div>
              </div>

              {/* Driving Licence */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Driving Licence</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Licence Expiry Date</label>
                    <input type="date" value={form.expiryDateLicense} onChange={e => f('expiryDateLicense', e.target.value)} className={inputClass} />
                    {form.expiryDateLicense && new Date(form.expiryDateLicense) < new Date() && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} /> This licence has expired!</p>
                    )}
                    {form.expiryDateLicense && new Date(form.expiryDateLicense) > new Date() && (() => {
                      const days = Math.floor((new Date(form.expiryDateLicense).getTime() - Date.now()) / 86400000);
                      return days < 90 ? <p className="text-xs text-amber-500 mt-1">⚠ Expires in {days} days</p> : null;
                    })()}
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-xs text-blue-700 font-medium">📎 Licence Image Upload</p>
                    <p className="text-xs text-blue-500 mt-1">Front & back licence images can be uploaded from the Driver App or via document upload section.</p>
                  </div>
                </div>
              </div>

              {/* Vehicle Card */}
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Vehicle Registration Card</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Vehicle Card Expiry Date</label>
                    <input type="date" value={form.expiryDateVehicleCard} onChange={e => f('expiryDateVehicleCard', e.target.value)} className={inputClass} />
                    {form.expiryDateVehicleCard && new Date(form.expiryDateVehicleCard) < new Date() && (
                      <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} /> Vehicle card has expired!</p>
                    )}
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-xs text-blue-700 font-medium">📎 Vehicle Card Upload</p>
                    <p className="text-xs text-blue-500 mt-1">Vehicle registration card images can be uploaded from the Driver App.</p>
                  </div>
                </div>
              </div>

              {/* Compliance Summary */}
              <div className="p-3 bg-[#1B2B6B]/5 border border-[#1B2B6B]/10 rounded-xl">
                <p className="text-xs font-semibold text-[#1B2B6B] mb-2">Compliance Checklist</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'CNIC provided', ok: !!form.NIC },
                    { label: 'Licence expiry set', ok: !!form.expiryDateLicense },
                    { label: 'Vehicle card expiry set', ok: !!form.expiryDateVehicleCard },
                    { label: 'Licence not expired', ok: !form.expiryDateLicense || new Date(form.expiryDateLicense) > new Date() },
                  ].map(c => (
                    <div key={c.label} className="flex items-center gap-2">
                      {c.ok ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> : <XCircle size={13} className="text-gray-300 shrink-0" />}
                      <span className={`text-xs ${c.ok ? 'text-gray-700' : 'text-gray-400'}`}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs"><AlertCircle size={14} />{error}</div>}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          {step === 1 ? (
            <>
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleNext} className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356]">Next: Documents →</button>
            </>
          ) : (
            <>
              <button onClick={() => { setStep(1); setError(''); }} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">← Back</button>
              <button onClick={handleSubmit} disabled={mutation.isPending}
                className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] disabled:opacity-50 flex items-center justify-center gap-2">
                {mutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {mutation.isPending ? 'Adding Driver…' : 'Add Driver'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VansPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<'add'|'edit'|'assign'|null>(null);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [target, setTarget] = useState<VanItem|null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VanItem|null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['vans', page, search, statusFilter],
    queryFn: () => vanApi.getByAdmin({ page, limit: 10, search: search || undefined }),
    select: (r: any) => mapVans(r.data),
    staleTime: 30_000,
  });

  const { data: driversData } = useQuery({
    queryKey: ['drivers-list'],
    queryFn: () => vanApi.getDrivers({ page: 1, limit: 100 }),
    select: (r: any) => r.data?.data ?? [],
    staleTime: 60_000,
  });

  const vans: VanItem[] = data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 10);

  const deleteMutation = useMutation({
    mutationFn: (vanId: string) => vanApi.deleteByAdmin(vanId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vans'] }); setDeleteTarget(null); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) => vanApi.changeStatus(ids, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vans'] }); setSelected(new Set()); },
  });

  function toggleSelect(id: string) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }
  function toggleAll() { selected.size === vans.length ? setSelected(new Set()) : setSelected(new Set(vans.map(v => v._id))); }
  const selectedArr = Array.from(selected);

  return (
    <>
      {showAddDriver && <AddDriverModal onClose={() => setShowAddDriver(false)} />}
      {modal === 'add' && <VanModal mode="add" onClose={() => setModal(null)} onSuccess={() => qc.invalidateQueries({ queryKey: ['vans'] })} />}
      {modal === 'edit' && target && <VanModal mode="edit" van={target} onClose={() => setModal(null)} onSuccess={() => qc.invalidateQueries({ queryKey: ['vans'] })} />}
      {modal === 'assign' && target && <AssignDriverModal van={target} drivers={driversData ?? []} onClose={() => setModal(null)} onSuccess={() => {}} />}
      {deleteTarget && <DeleteConfirm van={deleteTarget} loading={deleteMutation.isPending} onConfirm={() => deleteMutation.mutate(deleteTarget._id)} onCancel={() => setDeleteTarget(null)} />}

      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fleet</h1>
            <p className="text-sm text-gray-400 mt-0.5">{total} van{total !== 1 ? 's' : ''} registered</p>
          </div>
          <button onClick={() => setShowAddDriver(true)} className="flex items-center gap-2 px-4 py-2.5 border border-[#1B2B6B] text-[#1B2B6B] text-sm font-medium rounded-xl hover:bg-[#1B2B6B]/5 transition"><Plus size={16} /> Add Driver</button>
          <button onClick={() => setModal('add')} className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2B6B] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition"><Plus size={16} /> Add Van</button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by plate or type…" className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            {(['','active','inActive'] as const).map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${statusFilter === s ? 'bg-[#1B2B6B] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s === '' ? 'All' : s === 'active' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-[#1B2B6B]/5 rounded-xl">
            <span className="text-sm font-medium text-[#1B2B6B]">{selected.size} selected</span>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => statusMutation.mutate({ ids: selectedArr, status: 'active' })} disabled={statusMutation.isPending} className="px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition">Activate</button>
              <button onClick={() => statusMutation.mutate({ ids: selectedArr, status: 'inActive' })} disabled={statusMutation.isPending} className="px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition">Deactivate</button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="p-4 w-10"><input type="checkbox" checked={selected.size === vans.length && vans.length > 0} onChange={toggleAll} className="rounded border-gray-300" /></th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Van</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Capacity</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Condition</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">GPS Device</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Driver</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Routes</th>
                  <th className="p-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="p-4 w-28" />
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 animate-pulse">{Array.from({ length: 10 }).map((_, j) => <td key={j} className="p-4"><div className="h-4 bg-gray-100 rounded" /></td>)}</tr>
                )) : vans.length === 0 ? (
                  <tr><td colSpan={10} className="p-12 text-center"><Bus size={32} className="text-gray-300 mx-auto mb-3" /><p className="text-gray-400 text-sm">{search ? 'No vans match your search.' : 'No vans yet. Add one above.'}</p></td></tr>
                ) : vans.map(van => (
                  <tr key={van._id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition ${selected.has(van._id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="p-4"><input type="checkbox" checked={selected.has(van._id)} onChange={() => toggleSelect(van._id)} className="rounded border-gray-300" /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#FFB800]/20 flex items-center justify-center shrink-0"><Bus size={18} className="text-[#FFB800]" /></div>
                        <div><p className="text-sm font-semibold text-gray-900">{van.carNumber || '—'}</p><p className="text-xs text-gray-400">{van.ownVan ? 'School-owned' : 'Private'}</p></div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">{van.vehicleType || '—'}</td>
                    <td className="p-4">{van.venCapacity ? <span className="flex items-center gap-1 text-sm text-gray-600"><User size={12} className="text-gray-400" />{van.venCapacity} seats</span> : <span className="text-gray-400 text-sm">—</span>}</td>
                    <td className="p-4"><ConditionBadge condition={van.condition} /></td>
                    <td className="p-4">{van.deviceId ? <span className="flex items-center gap-1 text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded-lg"><Cpu size={11} />{van.deviceId}</span> : <span className="text-gray-400 text-xs">No GPS</span>}</td>
                    <td className="p-4">
                      {van.driver?.id ? (
                        <div><p className="text-sm font-medium text-gray-900">{van.driver.fullname}</p><p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{van.driver.phoneNo}</p></div>
                      ) : (
                        <button onClick={() => { setTarget(van); setModal('assign'); }} className="flex items-center gap-1 text-xs text-[#1B2B6B] hover:underline font-medium"><UserCheck size={12} /> Assign</button>
                      )}
                    </td>
                    <td className="p-4">
                      {van.routes && van.routes.length > 0 ? (
                        <div className="space-y-1">
                          {van.routes.slice(0, 2).map(r => (
                            <span key={r.id} className="flex items-center gap-1 text-xs text-gray-600">
                              <MapPin size={10} className="text-gray-400 shrink-0" />
                              <span className="truncate max-w-[100px]">{r.title}</span>
                              <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${r.tripType === 'pick' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{r.tripType}</span>
                            </span>
                          ))}
                          {van.routes.length > 2 && <span className="text-xs text-gray-400">+{van.routes.length - 2} more</span>}
                        </div>
                      ) : <span className="text-gray-400 text-xs">No routes</span>}
                    </td>
                    <td className="p-4"><VanStatusBadge status={van.status} /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setTarget(van); setModal('assign'); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition" title="Assign driver"><UserCheck size={14} /></button>
                        <button onClick={() => { setTarget(van); setModal('edit'); }} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition" title="Edit van"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget(van)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition" title="Remove van"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">Page {page} of {totalPages} · {total} total</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isFetching} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"><ChevronLeft size={14} /></button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition ${page === p ? 'bg-[#1B2B6B] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{p}</button>;
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || isFetching} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
