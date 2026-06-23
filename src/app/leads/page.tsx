'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL;

interface Lead {
  _id: string;
  schoolName: string;
  schoolType: string;
  country: string;
  city: string;
  address?: string;
  vanCount?: string;
  studentCount?: string;
  adminName: string;
  designation: string;
  email: string;
  phone: string;
  plan?: string;
  currency?: string;
  challenges?: string;
  status: 'new' | 'contacted' | 'activated' | 'rejected';
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  new:       'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  activated: 'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  new:       '🆕 New',
  contacted: '📞 Contacted',
  activated: '✅ Activated',
  rejected:  '❌ Rejected',
};

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('smartvan_token');
      if (!token) { router.push('/auth/login'); return; }
      const res = await axios.get(`${API}/school/leads`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(res.data.data || []);
    } catch (err: any) {
      if (err.response?.status === 401) router.push('/auth/login');
      else setError('Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const token = localStorage.getItem('smartvan_token');
      await axios.patch(
        `${API}/school/leads/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLeads(prev => prev.map(l => l._id === id ? { ...l, status: status as Lead['status'] } : l));
      if (selectedLead?._id === id) setSelectedLead(prev => prev ? { ...prev, status: status as Lead['status'] } : null);
    } catch {
      alert('Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = leads.filter(l => {
    const matchFilter = filter === 'all' || l.status === filter;
    const matchSearch = !search || 
      l.schoolName.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      l.city.toLowerCase().includes(search.toLowerCase()) ||
      l.adminName.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    all:       leads.length,
    new:       leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    activated: leads.filter(l => l.status === 'activated').length,
    rejected:  leads.filter(l => l.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B2B6B]">School Leads</h1>
        <p className="text-gray-500 text-sm mt-1">
          Schools that registered via smartvan.pk — manage and track their onboarding status.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { key: 'all',       label: 'Total',     color: 'bg-[#1B2B6B] text-white' },
          { key: 'new',       label: 'New',        color: 'bg-blue-500 text-white' },
          { key: 'contacted', label: 'Contacted',  color: 'bg-yellow-500 text-white' },
          { key: 'activated', label: 'Activated',  color: 'bg-green-500 text-white' },
          { key: 'rejected',  label: 'Rejected',   color: 'bg-red-500 text-white' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className={`rounded-xl p-4 text-left transition-all ${
              filter === s.key ? s.color : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            <div className="text-2xl font-bold">{counts[s.key as keyof typeof counts]}</div>
            <div className="text-sm font-medium opacity-80">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <input
          type="text"
          placeholder="Search by school name, email, city, or admin name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full outline-none text-sm text-gray-700 placeholder-gray-400"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">⏳</div>
            <p>Loading leads…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p className="font-medium">No leads found</p>
            <p className="text-sm mt-1">
              {search ? 'Try a different search term' : 'Leads from smartvan.pk will appear here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">School</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Contact</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Location</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Fleet</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Plan</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => (
                  <tr
                    key={lead._id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#1B2B6B]">{lead.schoolName}</div>
                      <div className="text-xs text-gray-400">{lead.schoolType}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-700">{lead.adminName}</div>
                      <div className="text-xs text-gray-400">{lead.designation}</div>
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-xs text-[#1B2B6B] hover:underline"
                      >
                        {lead.email}
                      </a>
                      <div className="text-xs text-gray-400">{lead.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">{lead.city}</div>
                      <div className="text-xs text-gray-400">{lead.country}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">{lead.vanCount || '—'}</div>
                      <div className="text-xs text-gray-400">{lead.studentCount || ''} students</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700 font-medium text-xs">{lead.plan?.split('–')[0] || '—'}</div>
                      <div className="text-xs text-gray-400">{lead.currency}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[lead.status]}`}>
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleDateString('en-PK', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="px-3 py-1 text-xs bg-[#1B2B6B] text-white rounded-lg hover:bg-[#111d4a] transition-colors"
                        >
                          View
                        </button>
                        <select
                          value={lead.status}
                          disabled={updatingId === lead._id}
                          onChange={e => updateStatus(lead._id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 cursor-pointer"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="activated">Activated</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLead && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setSelectedLead(null)}
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-[#1B2B6B] p-6 rounded-t-2xl flex justify-between items-start">
              <div>
                <h2 className="text-white font-bold text-xl">{selectedLead.schoolName}</h2>
                <p className="text-white/60 text-sm mt-1">{selectedLead.schoolType} • {selectedLead.city}, {selectedLead.country}</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-white/60 hover:text-white text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Status changer */}
              <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-semibold text-gray-600">Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[selectedLead.status]}`}>
                  {STATUS_LABELS[selectedLead.status]}
                </span>
                <select
                  value={selectedLead.status}
                  onChange={e => updateStatus(selectedLead._id, e.target.value)}
                  className="ml-auto text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="activated">Activated</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* School Info */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">School Info</h3>
                  <div className="space-y-2">
                    <Row label="Name" value={selectedLead.schoolName} />
                    <Row label="Type" value={selectedLead.schoolType} />
                    <Row label="Country" value={selectedLead.country} />
                    <Row label="City" value={selectedLead.city} />
                    {selectedLead.address && <Row label="Address" value={selectedLead.address} />}
                    <Row label="Vans" value={selectedLead.vanCount || '—'} />
                    <Row label="Students" value={selectedLead.studentCount || '—'} />
                  </div>
                </div>

                {/* Admin Info */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Admin Contact</h3>
                  <div className="space-y-2">
                    <Row label="Name" value={selectedLead.adminName} />
                    <Row label="Role" value={selectedLead.designation} />
                    <Row label="Email" value={selectedLead.email} isEmail />
                    <Row label="Phone" value={selectedLead.phone} isPhone />
                    <Row label="Plan" value={selectedLead.plan || '—'} />
                    <Row label="Currency" value={selectedLead.currency || '—'} />
                    <Row label="Submitted" value={new Date(selectedLead.createdAt).toLocaleString()} />
                  </div>
                </div>
              </div>

              {/* Challenges */}
              {selectedLead.challenges && (
                <div className="mt-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Challenges / Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-4 leading-relaxed">
                    {selectedLead.challenges}
                  </p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="mt-6 flex gap-3">
                <a
                  href={`mailto:${selectedLead.email}?subject=SmartVan Registration – ${selectedLead.schoolName}&body=Dear ${selectedLead.adminName},%0A%0AThank you for registering ${selectedLead.schoolName} on SmartVan.`}
                  className="flex-1 text-center py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-semibold hover:bg-[#111d4a] transition-colors"
                >
                  📧 Send Email
                </a>
                <a
                  href={`https://wa.me/${selectedLead.phone.replace(/[^0-9]/g, '')}?text=Hi ${selectedLead.adminName}, this is SmartVan team regarding your school registration.`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors"
                >
                  💬 WhatsApp
                </a>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label, value, isEmail, isPhone,
}: {
  label: string; value: string; isEmail?: boolean; isPhone?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      {isEmail ? (
        <a href={`mailto:${value}`} className="text-xs font-medium text-[#1B2B6B] hover:underline text-right">
          {value}
        </a>
      ) : isPhone ? (
        <a href={`tel:${value}`} className="text-xs font-medium text-gray-700 text-right">
          {value}
        </a>
      ) : (
        <span className="text-xs font-medium text-gray-700 text-right">{value}</span>
      )}
    </div>
  );
}
