'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Bug, Lightbulb, GraduationCap, CreditCard, HelpCircle, AlertCircle, CheckCircle2, Clock, Eye, X, Image as ImageIcon } from 'lucide-react';
import { reportApi, uploadApi } from '@/lib/api';

interface MyTicket {
  _id: string;
  issueType?: string;
  description?: string;
  status: string;
  image?: string;
  adminRemarks?: string;
  createdAt: string;
}

const CATEGORIES = [
  { value: 'Bug Report', icon: Bug, color: '#EF4444' },
  { value: 'Feature Request', icon: Lightbulb, color: '#F59E0B' },
  { value: 'Training / How-To', icon: GraduationCap, color: '#3B82F6' },
  { value: 'Billing Question', icon: CreditCard, color: '#10B981' },
  { value: 'Other', icon: HelpCircle, color: '#6B7280' },
];

const STATUS_META: Record<string, { label: string; dot: string; text: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', icon: <Clock size={11} /> },
  in_progress: { label: 'In progress', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', icon: <Eye size={11} /> },
  resolved: { label: 'Resolved', dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', icon: <CheckCircle2 size={11} /> },
  rejected: { label: 'Rejected', dot: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-100', icon: <X size={11} /> },
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

export default function SupportPage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const { data: myTickets = [], isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const res = await reportApi.getMyTickets();
      return (res.data?.data ?? []) as MyTicket[];
    },
    staleTime: 30_000,
  });

  const submitMutation = useMutation({
    mutationFn: () => reportApi.submitTicket(category, description, imageUrl || undefined),
    onSuccess: () => {
      setCategory('');
      setDescription('');
      setImageUrl('');
      setSuccess(true);
      qc.invalidateQueries({ queryKey: ['my-tickets'] });
      setTimeout(() => setSuccess(false), 4000);
    },
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to submit ticket. Please try again.'),
  });

  async function handleImageSelected(file: File) {
    if (file.size > 3 * 1024 * 1024) {
      setError('Image must be under 3MB.');
      return;
    }
    setIsUploading(true);
    try {
      const res = await uploadApi.image(file);
      setImageUrl(res.data?.url ?? res.data?.data?.url ?? '');
    } catch (e) {
      setError('Image upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleSubmit() {
    if (!category) { setError('Please select a category.'); return; }
    if (!description.trim()) { setError('Please describe your issue.'); return; }
    setError('');
    submitMutation.mutate();
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contact Support</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Submit a bug, feature request, or any other issue directly to the SmartVan team
        </p>
      </div>

      {/* Submission form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Category *</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = category === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition ${
                    active ? 'border-[#1B2B6B] bg-[#1B2B6B]/5' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} color={active ? '#1B2B6B' : c.color} />
                  <span className={`text-[11px] font-medium text-center leading-tight ${active ? 'text-[#1B2B6B]' : 'text-gray-600'}`}>
                    {c.value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Describe your issue in as much detail as possible…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Screenshot (optional)</label>
          <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition w-fit">
            {imageUrl ? (
              <>
                <img src={imageUrl} alt="Attachment" className="w-8 h-8 rounded object-cover" />
                <span className="text-xs text-gray-600">Attached — click to replace</span>
              </>
            ) : (
              <>
                <ImageIcon size={16} className="text-gray-400" />
                <span className="text-xs text-gray-500">{isUploading ? 'Uploading…' : 'Attach a screenshot'}</span>
              </>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageSelected(file);
                e.target.value = '';
              }}
            />
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-lg p-3">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-emerald-700 text-xs bg-emerald-50 rounded-lg p-3">
            <CheckCircle2 size={14} className="shrink-0" /> Ticket submitted — the SmartVan team has been notified.
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitMutation.isPending || isUploading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#1B2B6B] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition disabled:opacity-50"
        >
          <Send size={15} />
          {submitMutation.isPending ? 'Submitting…' : 'Submit Ticket'}
        </button>
      </div>

      {/* My previous tickets */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Your Tickets</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-16 bg-white rounded-xl border border-gray-100 animate-pulse" />)}
          </div>
        ) : myTickets.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-sm text-gray-400">You haven&apos;t submitted any tickets yet.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {myTickets.map((t) => {
              const meta = STATUS_META[t.status] ?? STATUS_META.pending;
              return (
                <div key={t._id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800">{t.issueType || 'General'}</p>
                    <span className={`flex items-center gap-1 px-2.5 py-1 ${meta.bg} ${meta.text} text-xs font-medium rounded-full`}>
                      {meta.icon} {meta.label}
                    </span>
                  </div>
                  {t.description && <p className="text-xs text-gray-500 mt-1.5">{t.description}</p>}
                  {t.adminRemarks && (
                    <div className="mt-2 p-2.5 bg-gray-50 rounded-lg">
                      <p className="text-[11px] font-medium text-gray-500 mb-0.5">SmartVan Team Response</p>
                      <p className="text-xs text-gray-700">{t.adminRemarks}</p>
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-2">{timeAgo(t.createdAt)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
