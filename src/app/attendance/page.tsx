'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Users, CheckCircle2, XCircle, Clock, Bus,
  Search, ChevronDown, Calendar, Download,
  TrendingUp, AlertCircle, MapPin,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL;

interface AttendanceRecord {
  kidId: string;
  fullname: string;
  image: string | null;
  schoolId: string;
  vanNumber: string;
  attendanceStatus: 'present' | 'late' | 'absent';
  remarks: string;
  pickupTime: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  dropTime: string | null;
  dropLat: number | null;
  dropLng: number | null;
  tripId: string;
}

interface DailyReport {
  message: string;
  date: string;
  totalStudents: number;
  present: number;
  late: number;
  absent: number;
  presentRate: number;
  records: AttendanceRecord[];
}

interface StudentHistory {
  kid: { id: string; fullname: string; image: string };
  period: { from: string; to: string };
  summary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    attendanceRate: number;
  };
  history: {
    date: string;
    attendanceStatus: string;
    trips: any[];
  }[];
}

const STATUS_CONFIG = {
  present: { label: 'Present', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle2 },
  late:    { label: 'Late',    color: 'bg-yellow-100 text-yellow-700',   dot: 'bg-yellow-500',  icon: Clock },
  absent:  { label: 'Absent',  color: 'bg-red-100 text-red-700',         dot: 'bg-red-500',     icon: XCircle },
};

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

function Avatar({ name, image, size = 36 }: { name: string; image?: string | null; size?: number }) {
  if (image) return (
    <img src={image} alt={name}
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size }}
      onError={(e: any) => { e.target.style.display = 'none'; }}
    />
  );
  return (
    <div className="rounded-full bg-[#1B2B6B] flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function AttendancePage() {
  const router = useRouter();
  const [tab, setTab] = useState<'daily' | 'student'>('daily');
  const [date, setDate] = useState(getToday());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [error, setError] = useState('');

  // Student history state
  const [kidId, setKidId] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(getToday());
  const [studentHistory, setStudentHistory] = useState<StudentHistory | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');

  useEffect(() => { fetchDaily(); }, [date]);

  const getToken = () => {
    const token = localStorage.getItem('smartvan_token');
    if (!token) { router.push('/auth/login'); return null; }
    return token;
  };

  const fetchDaily = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/trips/attendance/daily`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { date },
      });
      setReport(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) router.push('/auth/login');
      else setError('Failed to load attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentHistory = async () => {
    if (!kidId.trim()) { setStudentError('Please enter a Student ID.'); return; }
    const token = getToken();
    if (!token) return;
    setStudentLoading(true);
    setStudentError('');
    setStudentHistory(null);
    try {
      const res = await axios.get(`${API}/trips/attendance/student/${kidId.trim()}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate },
      });
      setStudentHistory(res.data);
    } catch (err: any) {
      if (err.response?.status === 401) router.push('/auth/login');
      else setStudentError('Student not found or no attendance records.');
    } finally {
      setStudentLoading(false);
    }
  };

  const filteredRecords = (report?.records || []).filter(r => {
    const matchSearch = !search ||
      r.fullname.toLowerCase().includes(search.toLowerCase()) ||
      r.vanNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.attendanceStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportCSV = () => {
    if (!report) return;
    const rows = [
      ['Name', 'Status', 'Van', 'Pickup Time', 'Drop Time', 'Remarks'],
      ...report.records.map(r => [
        r.fullname, r.attendanceStatus, r.vanNumber,
        formatTime(r.pickupTime), formatTime(r.dropTime), r.remarks,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${date}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2B6B]">Attendance</h1>
          <p className="text-gray-500 text-sm mt-1">Auto-generated from van pickup & drop logs</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={!report || loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B2B6B] text-white rounded-xl text-sm font-semibold hover:bg-[#111d4a] transition-colors disabled:opacity-40"
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit mb-6">
        {[
          { key: 'daily', label: '📅 Daily Report' },
          { key: 'student', label: '👤 Student History' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-[#1B2B6B] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── DAILY REPORT TAB ── */}
      {tab === 'daily' && (
        <>
          {/* Date picker + filters */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Calendar size={15} className="text-gray-400" />
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="text-sm text-gray-700 bg-transparent outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-48">
              <Search size={15} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search student or van…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="text-sm text-gray-700 bg-transparent outline-none w-full"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-600 bg-gray-50 outline-none"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          {/* Stats cards */}
          {report && (
            <div className="grid grid-cols-4 gap-4 mb-5">
              {[
                { label: 'Total Students', value: report.totalStudents, color: '#1B2B6B', icon: <Users size={18} /> },
                { label: 'Present', value: report.present, color: '#10b981', icon: <CheckCircle2 size={18} /> },
                { label: 'Late', value: report.late, color: '#f59e0b', icon: <Clock size={18} /> },
                { label: 'Absent', value: report.absent, color: '#ef4444', icon: <XCircle size={18} /> },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500">{s.label}</span>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.color + '15' }}>
                      <div style={{ color: s.color }}>{s.icon}</div>
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                  {s.label === 'Total Students' && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                      <TrendingUp size={11} />
                      <span>{report.presentRate}% present rate</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Progress bar */}
          {report && report.totalStudents > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5">
              <div className="flex justify-between text-xs font-medium text-gray-500 mb-2">
                <span>Attendance Rate</span>
                <span>{report.presentRate}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${report.presentRate}%`,
                    background: report.presentRate >= 80 ? '#10b981' : report.presentRate >= 60 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <div className="flex gap-4 mt-3">
                {[
                  { label: 'Present', count: report.present, color: 'bg-emerald-500' },
                  { label: 'Late', count: report.late, color: 'bg-yellow-500' },
                  { label: 'Absent', count: report.absent, color: 'bg-red-500' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <div className={`w-2 h-2 rounded-full ${s.color}`} />
                    {s.label}: <span className="font-semibold text-gray-700">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm flex items-center gap-2">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">⏳</div>
                <p>Loading attendance…</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p className="font-medium">No records found</p>
                <p className="text-sm mt-1">
                  {search || statusFilter !== 'all'
                    ? 'Try different filters'
                    : 'No trips completed on this date'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">#</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Student</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Van</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Pickup Time</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Drop Time</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Location</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r, i) => {
                      const cfg = STATUS_CONFIG[r.attendanceStatus];
                      return (
                        <tr key={r.kidId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">{i + 1}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={r.fullname} image={r.image} size={34} />
                              <span className="font-semibold text-gray-800">{r.fullname}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Bus size={13} className="text-gray-400" />
                              {r.vanNumber}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 font-mono text-xs">
                            {formatTime(r.pickupTime)}
                          </td>
                          <td className="px-5 py-3.5 text-gray-600 font-mono text-xs">
                            {formatTime(r.dropTime)}
                          </td>
                          <td className="px-5 py-3.5">
                            {r.pickupLat && r.pickupLng ? (
                              <a
                                href={`https://maps.google.com/?q=${r.pickupLat},${r.pickupLng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-[#1B2B6B] hover:underline"
                              >
                                <MapPin size={12} /> View Map
                              </a>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-gray-400">
                            {r.remarks || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── STUDENT HISTORY TAB ── */}
      {tab === 'student' && (
        <>
          {/* Search form */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Search Student Attendance</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="text-xs text-gray-500 font-medium mb-1 block">Student ID</label>
                <input
                  type="text"
                  placeholder="Paste student _id from MongoDB…"
                  value={kidId}
                  onChange={e => setKidId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1B2B6B]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1B2B6B]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#1B2B6B]"
                />
              </div>
              <button
                onClick={fetchStudentHistory}
                disabled={studentLoading}
                className="px-5 py-2 bg-[#1B2B6B] text-white rounded-xl text-sm font-semibold hover:bg-[#111d4a] transition-colors disabled:opacity-50"
              >
                {studentLoading ? 'Loading…' : 'Search'}
              </button>
            </div>
            {studentError && (
              <div className="mt-3 text-sm text-red-600 flex items-center gap-1.5">
                <AlertCircle size={13} /> {studentError}
              </div>
            )}
          </div>

          {/* Student history results */}
          {studentHistory && (
            <>
              {/* Student card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5">
                <div className="flex items-center gap-4">
                  <Avatar name={studentHistory.kid.fullname} image={studentHistory.kid.image} size={52} />
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-[#1B2B6B]">{studentHistory.kid.fullname}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {studentHistory.period.from} → {studentHistory.period.to}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[#1B2B6B]">
                      {studentHistory.summary.attendanceRate}%
                    </div>
                    <div className="text-xs text-gray-400">Attendance Rate</div>
                  </div>
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    { label: 'Total Days', value: studentHistory.summary.totalDays, color: '#1B2B6B' },
                    { label: 'Present', value: studentHistory.summary.presentDays, color: '#10b981' },
                    { label: 'Absent', value: studentHistory.summary.absentDays, color: '#ef4444' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Attendance progress bar */}
                <div className="mt-4">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${studentHistory.summary.attendanceRate}%`,
                        background: studentHistory.summary.attendanceRate >= 80
                          ? '#10b981' : studentHistory.summary.attendanceRate >= 60
                          ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Calendar-style history */}
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-700">Daily History</h3>
                </div>
                {studentHistory.history.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p>No records in this period</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {studentHistory.history.map(day => {
                      const cfg = STATUS_CONFIG[day.attendanceStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.absent;
                      return (
                        <div key={day.date} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50">
                          <div className="w-24 flex-shrink-0">
                            <div className="text-sm font-semibold text-gray-700">
                              {new Date(day.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(day.date).toLocaleDateString('en-PK', { weekday: 'short' })}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                          <div className="flex gap-2 flex-wrap ml-2">
                            {day.trips.map((t: any, i: number) => (
                              <span key={i} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">
                                {t.tripType === 'pick' ? '🚌 Picked' : '🏠 Dropped'} • {formatTime(t.time)}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
