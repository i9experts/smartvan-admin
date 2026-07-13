'use client';
import { useTheme } from '@/theme/ThemeContext';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, User, Clock, Bell, Shield, Palette,
  Save, Camera, MapPin, Phone, Mail, Globe,
  ChevronRight, CheckCircle2, AlertCircle, Eye, EyeOff,
  Sun, Moon, Monitor, Zap, Bus, Users, Route,
  Info, Lock, LogOut, Loader2, MessageSquare,
} from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchoolProfile {
  _id: string;
  schoolName?: string;
  schoolImage?: string;
  schoolEmail?: string;
  contactPerson?: string;
  contactNumber?: string;
  address?: string;
  branchName?: string;
  startTime?: string;
  endTime?: string;
  maxTripDuration?: number;
  bufferTime?: number;
  currentPlan?: string;
  billingCycle?: string;
  paymentMethod?: string;
  allowedVans?: number;
  allowedStudents?: number;
  allowedRoutes?: number;
  lat?: number;
  long?: number;
  autoRenew?: boolean;
  status?: string;
  currency?: string;
  country?: string;
  waConnected?: boolean;
  waPhoneNumber?: string;
  waPhoneNumberId?: string;
  wabaId?: string;
}

interface AdminProfile {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  image?: string;
}

// ─── Local notification prefs ─────────────────────────────────────────────────

interface NotifPrefs {
  tripStart: boolean;
  tripEnd: boolean;
  sosAlert: boolean;
  newComplaint: boolean;
  studentPickup: boolean;
  studentDrop: boolean;
  driverOnline: boolean;
  dailySummary: boolean;
  weeklyReport: boolean;
  maintenanceReminder: boolean;
  emailNotifs: boolean;
  pushNotifs: boolean;
  smsNotifs: boolean;
}

const DEFAULT_NOTIF: NotifPrefs = {
  tripStart: true, tripEnd: true, sosAlert: true, newComplaint: true,
  studentPickup: true, studentDrop: true, driverOnline: false,
  dailySummary: true, weeklyReport: false, maintenanceReminder: true,
  emailNotifs: true, pushNotifs: true, smsNotifs: false,
};

function getNotifPrefs(): NotifPrefs {
  if (typeof window === 'undefined') return DEFAULT_NOTIF;
  try { return { ...DEFAULT_NOTIF, ...JSON.parse(localStorage.getItem('sv_notif_prefs') ?? '{}') }; } catch { return DEFAULT_NOTIF; }
}

function saveNotifPrefs(p: NotifPrefs) {
  localStorage.setItem('sv_notif_prefs', JSON.stringify(p));
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-10 h-10 bg-[#1B2B6B]/10 rounded-xl flex items-center justify-center shrink-0">
        <span className="text-[#1B2B6B]">{icon}</span>
      </div>
      <div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-all duration-200 ${value ? 'bg-[#1B2B6B]' : 'bg-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Save Banner ──────────────────────────────────────────────────────────────

function SaveBanner({ show, loading, onSave, onDiscard }: { show: boolean; loading: boolean; onSave: () => void; onDiscard: () => void }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[#1B2B6B] text-white px-6 py-3.5 rounded-2xl shadow-2xl">
      <span className="text-sm font-medium">You have unsaved changes</span>
      <div className="flex gap-2">
        <button onClick={onDiscard} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition">Discard</button>
        <button onClick={onSave} disabled={loading} className="flex items-center gap-2 px-4 py-1.5 bg-[#FFB800] text-[#1B2B6B] font-semibold rounded-lg text-sm hover:bg-[#e5a600] transition disabled:opacity-60">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'school', label: 'School Profile', icon: <Building2 size={16} /> },
  { id: 'admin', label: 'Admin Profile', icon: <User size={16} /> },
  { id: 'trip', label: 'Trip Settings', icon: <Clock size={16} /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
  { id: 'security', label: 'Security', icon: <Shield size={16} /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('school');
  const [isDirty, setIsDirty] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [waForm, setWaForm] = useState({ wabaId: '', waPhoneNumberId: '', waAccessToken: '', waPhoneNumber: '' });
  const [waConnecting, setWaConnecting] = useState(false);
  const [waMsg, setWaMsg] = useState('');

  async function connectWhatsApp() {
    if (!waForm.waPhoneNumberId || !waForm.waAccessToken) {
      setWaMsg('Please fill in Phone Number ID and Access Token');
      return;
    }
    setWaConnecting(true);
    try {
      await api.post('/Admin/connectWhatsApp', waForm);
      setWaMsg('✓ WhatsApp connected successfully!');
      qc.invalidateQueries({ queryKey: ['school-profile'] });
      setTimeout(() => setWaMsg(''), 4000);
    } catch (e: any) {
      setWaMsg('✗ ' + (e?.response?.data?.message ?? 'Connection failed'));
    } finally {
      setWaConnecting(false);
    }
  }

  async function disconnectWhatsApp() {
    try {
      await api.post('/Admin/disconnectWhatsApp', {});
      setWaMsg('WhatsApp disconnected');
      qc.invalidateQueries({ queryKey: ['school-profile'] });
      setTimeout(() => setWaMsg(''), 3000);
    } catch (e: any) {
      setWaMsg('✗ ' + (e?.response?.data?.message ?? 'Failed to disconnect'));
    }
  }

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF);

  // Password form
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  useEffect(() => {
    setNotifPrefs(getNotifPrefs());
  }, []);

  const isSuperAdmin = typeof window !== 'undefined' && JSON.parse(localStorage.getItem('smartvan_user') ?? '{}').role === 'superadmin';
  // Fetch school profile — skipped entirely for superadmin, since they have no linked school
  // and this endpoint 401s for them, which would otherwise trigger a global logout
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => api.get('/Admin/getProfile'),
    select: r => r.data?.data as SchoolProfile,
    staleTime: 60_000,
    enabled: !isSuperAdmin,
  });

  const school = profileData;

  // Local editable copies
  const [schoolForm, setSchoolForm] = useState<Partial<SchoolProfile>>({});
  const CURRENCIES = [
    { code: 'PKR', label: 'Pakistani Rupee (PKR)', symbol: '₨', flag: '🇵🇰' },
    { code: 'SAR', label: 'Saudi Riyal (SAR)', symbol: '﷼', flag: '🇸🇦' },
    { code: 'AED', label: 'UAE Dirham (AED)', symbol: 'د.إ', flag: '🇦🇪' },
    { code: 'QAR', label: 'Qatari Riyal (QAR)', symbol: 'ر.ق', flag: '🇶🇦' },
    { code: 'USD', label: 'US Dollar (USD)', symbol: '$', flag: '🇺🇸' },
  ];
  const COUNTRIES = [
    { code: 'PK', label: 'Pakistan', flag: '🇵🇰' },
    { code: 'SA', label: 'Saudi Arabia', flag: '🇸🇦' },
    { code: 'AE', label: 'United Arab Emirates', flag: '🇦🇪' },
    { code: 'QA', label: 'Qatar', flag: '🇶🇦' },
  ];
  const [adminForm, setAdminForm] = useState<{ name: string; email: string }>({ name: '', email: '' });
  const [tripForm, setTripForm] = useState({
    startTime: '', endTime: '', maxTripDuration: '', bufferTime: '',
  });

  // Populate forms when data loads
  useEffect(() => {
    if (school) {
      setSchoolForm({
        schoolName: school.schoolName ?? '',
        schoolEmail: school.schoolEmail ?? '',
        contactPerson: school.contactPerson ?? '',
        contactNumber: school.contactNumber ?? '',
        address: school.address ?? '',
        branchName: school.branchName ?? '',
        currency: school.currency ?? 'PKR',
        country: school.country ?? 'PK',
      });
      setTripForm({
        startTime: school.startTime ?? '',
        endTime: school.endTime ?? '',
        maxTripDuration: String(school.maxTripDuration ?? ''),
        bufferTime: String(school.bufferTime ?? ''),
      });
    }
    const user = JSON.parse(localStorage.getItem('smartvan_user') ?? '{}');
    setAdminForm({ name: user.name ?? '', email: user.email ?? '' });
  }, [school]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (isSuperAdmin) {
        // Superadmin has no linked school — only update their own admin profile
        return api.patch('/Admin/update-own-profile', adminForm);
      }
      const payload = {
        schoolInfo: {
          ...schoolForm,
          startTime: tripForm.startTime || undefined,
          endTime: tripForm.endTime || undefined,
          maxTripDuration: tripForm.maxTripDuration ? Number(tripForm.maxTripDuration) : undefined,
          bufferTime: tripForm.bufferTime ? Number(tripForm.bufferTime) : undefined,
        },
        adminInfo: adminForm,
      };
      return api.post('/Admin/editSchoolProfile', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings-profile'] });
      setIsDirty(false);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (e: any) => {
      setError(e?.response?.data?.message ?? 'Failed to save settings.');
      setTimeout(() => setError(''), 4000);
    },
  });

  const changePwMutation = useMutation({
    mutationFn: () => api.post('/Admin/changePassword', { oldPassword: pwForm.current, newPassword: pwForm.newPw }),
    onSuccess: () => {
      setPwSuccess('Password changed successfully!');
      setPwForm({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setPwSuccess(''), 3000);
    },
    onError: (e: any) => setPwError(e?.response?.data?.message ?? 'Failed to change password.'),
  });

  function markDirty() { setIsDirty(true); }

  function handlePwChange() {
    setPwError('');
    if (!pwForm.current || !pwForm.newPw) { setPwError('All fields required.'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwError('New passwords do not match.'); return; }
    if (pwForm.newPw.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    changePwMutation.mutate();
  }

  function updateNotif(key: keyof NotifPrefs, val: boolean) {
    const updated = { ...notifPrefs, [key]: val };
    setNotifPrefs(updated);
    saveNotifPrefs(updated);
  }

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 focus:border-[#1B2B6B] transition";

  return (
    <div className="flex h-full min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-100 bg-white sticky top-0 h-screen overflow-y-auto">
        <div className="p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Settings</p>
          <nav className="space-y-1">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition text-left ${
                  activeSection === s.id
                    ? 'bg-[#1B2B6B] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className={activeSection === s.id ? 'text-white' : 'text-gray-400'}>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Plan info */}
        {school && (
          <div className="mx-4 mb-4 p-3 bg-[#FFB800]/10 rounded-xl border border-[#FFB800]/20">
            <p className="text-xs font-semibold text-[#1B2B6B] mb-1">{school.currentPlan ?? 'Free Plan'}</p>
            <div className="space-y-1 text-xs text-gray-500">
              <p>Vans: {school.allowedVans ?? '—'}</p>
              <p>Students: {school.allowedStudents ?? '—'}</p>
              <p>Routes: {school.allowedRoutes ?? '—'}</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {/* Success/Error banners */}
        {success && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-lg">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}
        {error && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-500 text-white px-5 py-3 rounded-xl shadow-lg">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="max-w-3xl mx-auto p-8 space-y-8">
          {/* ── School Profile ── */}
          {activeSection === 'school' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <SectionHeader
                icon={<Building2 size={20} />}
                title="School Profile"
                description="Manage your school's public information and contact details"
              />

              {isLoading ? (
                <div className="space-y-4 animate-pulse">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-xl" />
                  ))}
                </div>
              ) : !school ? (
                <div className="py-10 text-center">
                  <AlertCircle size={32} className="mx-auto text-amber-400 mb-3" />
                  <p className="text-sm text-gray-600 font-medium">No school linked to this account</p>
                  <p className="text-xs text-gray-400 mt-1">Contact your superadmin to link a school.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* School image */}
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl bg-[#1B2B6B]/10 flex items-center justify-center overflow-hidden">
                        {school.schoolImage ? (
                          <img src={school.schoolImage} alt="School" className="w-full h-full object-cover" />
                        ) : (
                          <Building2 size={32} className="text-[#1B2B6B]/40" />
                        )}
                      </div>
                      <button className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[#1B2B6B] rounded-full flex items-center justify-center shadow-md hover:bg-[#162356] transition">
                        <Camera size={13} className="text-white" />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{school.schoolName ?? 'Your School'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Upload school logo (PNG, JPG · max 2MB)</p>
                      <p className={`text-xs font-medium mt-1 ${school.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        ● {school.status === 'active' ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="School Name">
                      <input value={schoolForm.schoolName ?? ''} onChange={e => { setSchoolForm(f => ({ ...f, schoolName: e.target.value })); markDirty(); }}
                        className={inputClass} placeholder="e.g. The Deenway School" />
                    </Field>
                    <Field label="Branch Name">
                      <input value={schoolForm.branchName ?? ''} onChange={e => { setSchoolForm(f => ({ ...f, branchName: e.target.value })); markDirty(); }}
                        className={inputClass} placeholder="e.g. Main Campus" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="School Email">
                      <div className="relative">
                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="email" value={schoolForm.schoolEmail ?? ''} onChange={e => { setSchoolForm(f => ({ ...f, schoolEmail: e.target.value })); markDirty(); }}
                          className={`${inputClass} pl-9`} placeholder="school@example.com" />
                      </div>
                    </Field>
                    <Field label="Contact Number">
                      <div className="relative">
                        <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={schoolForm.contactNumber ?? ''} onChange={e => { setSchoolForm(f => ({ ...f, contactNumber: e.target.value })); markDirty(); }}
                          className={`${inputClass} pl-9`} placeholder="+92 300 0000000" />
                      </div>
                    </Field>
                  </div>

                  <Field label="Contact Person">
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={schoolForm.contactPerson ?? ''} onChange={e => { setSchoolForm(f => ({ ...f, contactPerson: e.target.value })); markDirty(); }}
                        className={`${inputClass} pl-9`} placeholder="Principal or coordinator name" />
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Country">
                      <select value={schoolForm.country ?? 'PK'} onChange={e => { setSchoolForm(f => ({ ...f, country: e.target.value })); markDirty(); }} className={inputClass}>
                        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Default Currency">
                      <select value={schoolForm.currency ?? 'PKR'} onChange={e => { setSchoolForm(f => ({ ...f, currency: e.target.value })); markDirty(); }} className={inputClass}>
                        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.label}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Address">
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3 top-3.5 text-gray-400" />
                      <textarea value={schoolForm.address ?? ''} onChange={e => { setSchoolForm(f => ({ ...f, address: e.target.value })); markDirty(); }}
                        rows={2} className={`${inputClass} pl-9 resize-none`} placeholder="Full school address" />
                    </div>
                  </Field>

                  {/* Plan info (read-only) */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Plan Limits (read-only)</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Max Vans', val: school.allowedVans, icon: <Bus size={14} /> },
                        { label: 'Max Students', val: school.allowedStudents, icon: <Users size={14} /> },
                        { label: 'Max Routes', val: school.allowedRoutes, icon: <Route size={14} /> },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-2 p-2 bg-white rounded-lg">
                          <span className="text-[#1B2B6B]">{item.icon}</span>
                          <div>
                            <p className="text-xs text-gray-400">{item.label}</p>
                            <p className="text-sm font-bold text-gray-800">{item.val ?? '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Admin Profile ── */}
          {activeSection === 'admin' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <SectionHeader icon={<User size={20} />} title="Admin Profile" description="Update your personal information" />
              <div className="space-y-5">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-[#1B2B6B] flex items-center justify-center text-white text-3xl font-bold">
                      {adminForm.name?.charAt(0)?.toUpperCase() ?? 'A'}
                    </div>
                    <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#FFB800] rounded-full flex items-center justify-center shadow-md">
                      <Camera size={13} className="text-white" />
                    </button>
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">{adminForm.name || 'Admin'}</p>
                    <p className="text-sm text-gray-400">{adminForm.email}</p>
                    <span className="mt-1 px-2.5 py-0.5 bg-[#1B2B6B]/10 text-[#1B2B6B] text-xs font-medium rounded-full capitalize inline-block">
                      {JSON.parse(localStorage.getItem('smartvan_user') ?? '{}').role ?? 'admin'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Full Name">
                    <input value={adminForm.name} onChange={e => { setAdminForm(f => ({ ...f, name: e.target.value })); markDirty(); }}
                      className={inputClass} placeholder="Your full name" />
                  </Field>
                  <Field label="Email Address" hint="Changing email will send a new password to the new address">
                    <div className="relative">
                      <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="email" value={adminForm.email} onChange={e => { setAdminForm(f => ({ ...f, email: e.target.value })); markDirty(); }}
                        className={`${inputClass} pl-9`} placeholder="admin@school.com" />
                    </div>
                  </Field>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                  <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">If you change your email, a new temporary password will be sent to the new email address. You'll need to log in with it and change your password.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Trip Settings ── */}
          {activeSection === 'trip' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <SectionHeader icon={<Clock size={20} />} title="Trip Settings" description="Configure school hours, trip duration and buffer times" />
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="School Start Time" hint="Morning pick-up trips start around this time">
                    <input type="time" value={tripForm.startTime} onChange={e => { setTripForm(f => ({ ...f, startTime: e.target.value })); markDirty(); }}
                      className={inputClass} />
                  </Field>
                  <Field label="School End Time" hint="Afternoon drop-off trips start around this time">
                    <input type="time" value={tripForm.endTime} onChange={e => { setTripForm(f => ({ ...f, endTime: e.target.value })); markDirty(); }}
                      className={inputClass} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Max Trip Duration (minutes)" hint="Alert if a trip exceeds this duration">
                    <input type="number" min={10} max={180} value={tripForm.maxTripDuration} onChange={e => { setTripForm(f => ({ ...f, maxTripDuration: e.target.value })); markDirty(); }}
                      className={inputClass} placeholder="e.g. 60" />
                  </Field>
                  <Field label="Buffer Time (minutes)" hint="Extra time allowed after school end before alerting">
                    <input type="number" min={0} max={60} value={tripForm.bufferTime} onChange={e => { setTripForm(f => ({ ...f, bufferTime: e.target.value })); markDirty(); }}
                      className={inputClass} placeholder="e.g. 10" />
                  </Field>
                </div>

                {/* Visual preview */}
                {(tripForm.startTime || tripForm.endTime) && (
                  <div className="p-4 bg-[#1B2B6B]/5 rounded-xl border border-[#1B2B6B]/10">
                    <p className="text-xs font-semibold text-[#1B2B6B] mb-3">Trip Schedule Preview</p>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-medium">
                        <Bus size={14} /> Morning: {tripForm.startTime || '—'}
                      </div>
                      <div className="flex-1 border-t-2 border-dashed border-gray-300" />
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
                        <Bus size={14} /> Afternoon: {tripForm.endTime || '—'}
                      </div>
                    </div>
                    {tripForm.maxTripDuration && (
                      <p className="text-xs text-gray-500 mt-2">
                        ⏱ Trips exceeding {tripForm.maxTripDuration} min will trigger an alert
                        {tripForm.bufferTime ? ` (+ ${tripForm.bufferTime} min buffer)` : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeSection === 'notifications' && (
            <div className="space-y-5">
              {/* Channels */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <SectionHeader icon={<Bell size={20} />} title="Notification Channels" description="Choose how you want to receive notifications" />
                <div className="space-y-4">
                  {[
                    { key: 'emailNotifs' as keyof NotifPrefs, label: 'Email Notifications', desc: 'Receive alerts and reports via email', icon: <Mail size={16} /> },
                    { key: 'pushNotifs' as keyof NotifPrefs, label: 'Push Notifications', desc: 'Browser and app push notifications', icon: <Bell size={16} /> },
                    { key: 'smsNotifs' as keyof NotifPrefs, label: 'SMS Alerts', desc: 'Critical alerts via SMS (charges may apply)', icon: <Phone size={16} /> },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#1B2B6B]/10 rounded-xl flex items-center justify-center">
                          <span className="text-[#1B2B6B]">{item.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                          <p className="text-xs text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                      <Toggle value={notifPrefs[item.key] as boolean} onChange={v => updateNotif(item.key, v)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Trip events */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Trip Events</h3>
                <div className="space-y-3">
                  {[
                    { key: 'tripStart' as keyof NotifPrefs, label: 'Trip Started', desc: 'When a driver starts a trip' },
                    { key: 'tripEnd' as keyof NotifPrefs, label: 'Trip Completed', desc: 'When a trip ends successfully' },
                    { key: 'studentPickup' as keyof NotifPrefs, label: 'Student Picked Up', desc: 'When a student is marked as boarded' },
                    { key: 'studentDrop' as keyof NotifPrefs, label: 'Student Dropped Off', desc: 'When a student is dropped at home' },
                    { key: 'driverOnline' as keyof NotifPrefs, label: 'Driver Online', desc: 'When a driver comes online' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.desc}</p>
                      </div>
                      <Toggle value={notifPrefs[item.key] as boolean} onChange={v => updateNotif(item.key, v)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Alerts & Reports */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Alerts & Reports</h3>
                <div className="space-y-3">
                  {[
                    { key: 'sosAlert' as keyof NotifPrefs, label: 'SOS Alerts', desc: 'Emergency alerts from drivers or parents', critical: true },
                    { key: 'newComplaint' as keyof NotifPrefs, label: 'New Complaints', desc: 'When a parent or driver submits a complaint' },
                    { key: 'maintenanceReminder' as keyof NotifPrefs, label: 'Maintenance Reminders', desc: 'Upcoming van service and inspection reminders' },
                    { key: 'dailySummary' as keyof NotifPrefs, label: 'Daily Summary', desc: 'End-of-day trip and attendance report' },
                    { key: 'weeklyReport' as keyof NotifPrefs, label: 'Weekly Report', desc: 'Weekly analytics and performance summary' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-start gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-800">{item.label}</p>
                            {item.critical && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-xs rounded">Critical</span>}
                          </div>
                          <p className="text-xs text-gray-400">{item.desc}</p>
                        </div>
                      </div>
                      <Toggle value={notifPrefs[item.key] as boolean} onChange={v => updateNotif(item.key, v)} disabled={item.critical} />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">* SOS alerts cannot be disabled for safety reasons.</p>
              </div>
            </div>
          )}

          {/* ── WhatsApp Business ── */}
          {activeSection === 'notifications' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <MessageSquare size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">WhatsApp Business API</h3>
                  <p className="text-xs text-gray-400">Connect your school's WhatsApp number to send alerts and fee reminders</p>
                </div>
                {profileData?.waConnected && (
                  <span className="ml-auto px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Connected
                  </span>
                )}
              </div>

              {profileData?.waConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                    <MessageSquare size={20} className="text-green-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{profileData?.waPhoneNumber || 'Connected'}</p>
                      <p className="text-xs text-gray-500">WhatsApp Business number is active and sending messages</p>
                    </div>
                  </div>
                  <button
                    onClick={disconnectWhatsApp}
                    className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition"
                  >
                    Disconnect WhatsApp
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700">
                    <p className="font-semibold mb-1">How to get these credentials:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to developers.facebook.com → Your App → WhatsApp</li>
                      <li>Register your school's phone number</li>
                      <li>Copy the Phone Number ID and Access Token</li>
                      <li>Paste them below and click Connect</li>
                    </ol>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">WhatsApp Phone Number</label>
                      <input
                        value={waForm.waPhoneNumber}
                        onChange={e => setWaForm(f => ({ ...f, waPhoneNumber: e.target.value }))}
                        placeholder="+923001234567"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">WABA ID (WhatsApp Business Account ID)</label>
                      <input
                        value={waForm.wabaId}
                        onChange={e => setWaForm(f => ({ ...f, wabaId: e.target.value }))}
                        placeholder="174423462430305"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number ID</label>
                      <input
                        value={waForm.waPhoneNumberId}
                        onChange={e => setWaForm(f => ({ ...f, waPhoneNumberId: e.target.value }))}
                        placeholder="1114306941775163"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Access Token</label>
                      <input
                        type="password"
                        value={waForm.waAccessToken}
                        onChange={e => setWaForm(f => ({ ...f, waAccessToken: e.target.value }))}
                        placeholder="Your WhatsApp API access token"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                      />
                    </div>
                  </div>
                  {waMsg && (
                    <p className={`text-xs font-medium ${waMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{waMsg}</p>
                  )}
                  <button
                    onClick={connectWhatsApp}
                    disabled={waConnecting}
                    className="w-full py-3 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={16} />
                    {waConnecting ? 'Connecting...' : 'Connect WhatsApp'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Security ── */}
          {activeSection === 'security' && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <SectionHeader icon={<Shield size={20} />} title="Change Password" description="Use a strong password with letters, numbers and symbols" />
                <div className="space-y-4">
                  <Field label="Current Password">
                    <div className="relative">
                      <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showCurrentPw ? 'text' : 'password'}
                        value={pwForm.current}
                        onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                        className={`${inputClass} pl-9 pr-10`}
                        placeholder="Enter current password"
                      />
                      <button onClick={() => setShowCurrentPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="New Password">
                      <div className="relative">
                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          value={pwForm.newPw}
                          onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))}
                          className={`${inputClass} pl-9 pr-10`}
                          placeholder="Min 8 characters"
                        />
                        <button onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </Field>
                    <Field label="Confirm Password">
                      <div className="relative">
                        <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="password"
                          value={pwForm.confirm}
                          onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                          className={`${inputClass} pl-9`}
                          placeholder="Repeat new password"
                        />
                      </div>
                    </Field>
                  </div>

                  {/* Password strength */}
                  {pwForm.newPw && (
                    <div>
                      <div className="flex gap-1 mb-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${
                            pwForm.newPw.length >= i * 3
                              ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-amber-400' : i <= 3 ? 'bg-blue-400' : 'bg-emerald-500'
                              : 'bg-gray-200'
                          }`} />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400">
                        {pwForm.newPw.length < 4 ? 'Too weak' : pwForm.newPw.length < 7 ? 'Weak' : pwForm.newPw.length < 10 ? 'Good' : 'Strong'}
                      </p>
                    </div>
                  )}

                  {pwError && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs"><AlertCircle size={14} /> {pwError}</div>}
                  {pwSuccess && <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs"><CheckCircle2 size={14} /> {pwSuccess}</div>}

                  <button
                    onClick={handlePwChange}
                    disabled={changePwMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-semibold hover:bg-[#162356] transition disabled:opacity-50"
                  >
                    {changePwMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                    {changePwMutation.isPending ? 'Changing…' : 'Change Password'}
                  </button>
                </div>
              </div>

              {/* Session */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Active Session</h3>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">Current Session</p>
                      <p className="text-xs text-gray-400">Logged in as {adminForm.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem('smartvan_token');
                      localStorage.removeItem('smartvan_user');
                      window.location.href = '/auth/login';
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
                  >
                    <LogOut size={13} /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Appearance ── */}
          {activeSection === 'appearance' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <SectionHeader icon={<Palette size={20} />} title="Appearance" description="Customize how SmartVan looks for you" />
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Theme</p>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'light', label: 'Light', icon: <Sun size={20} />, desc: 'Always light' },
                      { value: 'dark', label: 'Dark', icon: <Moon size={20} />, desc: 'Always dark' },
                      { value: 'system', label: 'System', icon: <Monitor size={20} />, desc: 'Match device' },
                    ] as const).map(t => (
                      <button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition ${
                          theme === t.value ? 'border-[#1B2B6B] bg-[#1B2B6B]/5' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className={theme === t.value ? 'text-[#1B2B6B]' : 'text-gray-400'}>{t.icon}</span>
                        <span className={`text-sm font-semibold ${theme === t.value ? 'text-[#1B2B6B]' : 'text-gray-600'}`}>{t.label}</span>
                        <span className="text-xs text-gray-400">{t.desc}</span>
                        {theme === t.value && <CheckCircle2 size={14} className="text-[#1B2B6B]" />}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">Applies instantly across the sidebar, top bar, and page background. Full page-level dark styling is still being rolled out.</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Brand Colors</p>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#1B2B6B] shadow" />
                      <div>
                        <p className="text-xs font-medium text-gray-700">Primary</p>
                        <p className="text-xs text-gray-400">#1B2B6B</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#FFB800] shadow" />
                      <div>
                        <p className="text-xs font-medium text-gray-700">Accent</p>
                        <p className="text-xs text-gray-400">#FFB800</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Language */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Language & Region</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Language">
                      <select className={inputClass}>
                        <option>English</option>
                        <option>اردو (Urdu)</option>
                        <option>العربية (Arabic)</option>
                      </select>
                    </Field>
                    <Field label="Timezone">
                      <select className={inputClass}>
                        <option>Asia/Karachi (PKT)</option>
                        <option>Asia/Riyadh (AST)</option>
                        <option>Asia/Dubai (GST)</option>
                        <option>Asia/Qatar (AST)</option>
                      </select>
                    </Field>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Arabic RTL support and Urdu interface coming in the next release.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating save banner */}
      <SaveBanner
        show={isDirty && (activeSection === 'school' || activeSection === 'admin' || activeSection === 'trip')}
        loading={saveMutation.isPending}
        onSave={() => saveMutation.mutate()}
        onDiscard={() => {
          setIsDirty(false);
          if (school) {
            setSchoolForm({
              schoolName: school.schoolName ?? '',
              schoolEmail: school.schoolEmail ?? '',
              contactPerson: school.contactPerson ?? '',
              contactNumber: school.contactNumber ?? '',
              address: school.address ?? '',
              branchName: school.branchName ?? '',
            });
            setTripForm({
              startTime: school.startTime ?? '',
              endTime: school.endTime ?? '',
              maxTripDuration: String(school.maxTripDuration ?? ''),
              bufferTime: String(school.bufferTime ?? ''),
            });
          }
        }}
      />
    </div>
  );
}
