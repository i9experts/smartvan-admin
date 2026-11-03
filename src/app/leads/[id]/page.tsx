'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, User, Clock, Check,
  PhoneCall, MessageCircle, Video, StickyNote, Send, Plus, CheckCircle2,
} from 'lucide-react';
import { leadsApi, LeadStatus, LeadActivityEntry } from '@/lib/api';

const STAGES: { key: LeadStatus; label: string; color: string }[] = [
  { key: 'new', label: 'New', color: '#1B3B69' },
  { key: 'contacted', label: 'Contacted', color: '#F2994A' },
  { key: 'demo', label: 'Demo', color: '#9B59B6' },
  { key: 'trial', label: 'Trial', color: '#2D9CDB' },
  { key: 'won', label: 'Won', color: '#27AE60' },
  { key: 'lost', label: 'Lost', color: '#EB5757' },
];

const ACTIVITY_ICONS: Record<string, any> = {
  note: StickyNote,
  call: PhoneCall,
  whatsapp: MessageCircle,
  meeting: Video,
  email: Mail,
  status_change: Check,
};

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function mergeTemplate(text: string, schoolName: string, adminName: string) {
  return text.replace(/\{\{schoolName\}\}/g, schoolName).replace(/\{\{adminName\}\}/g, adminName);
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const id = params.id as string;

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsApi.getById(id),
    select: (res) => res.data.data,
  });

  const { data: templates } = useQuery({
    queryKey: ['lead-email-templates'],
    queryFn: () => leadsApi.getEmailTemplates(),
    select: (res) => res.data.data,
    staleTime: 5 * 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['lead', id] });

  const moveStage = useMutation({
    mutationFn: (status: LeadStatus) => leadsApi.updateStatus(id, status),
    onSuccess: invalidate,
  });

  // ── Log activity ──────────────────────────────────────────────
  const [activityType, setActivityType] = useState<'note' | 'call' | 'whatsapp' | 'meeting'>('note');
  const [activitySummary, setActivitySummary] = useState('');
  const logActivity = useMutation({
    mutationFn: () => leadsApi.addActivity(id, { type: activityType, summary: activitySummary.trim() }),
    onSuccess: () => { setActivitySummary(''); invalidate(); },
  });

  // ── Tasks ──────────────────────────────────────────────────────
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const addTask = useMutation({
    mutationFn: () => leadsApi.addTask(id, { title: taskTitle.trim(), dueAt: taskDue || undefined }),
    onSuccess: () => { setTaskTitle(''); setTaskDue(''); invalidate(); },
  });
  const toggleTask = useMutation({
    mutationFn: ({ taskId, done }: { taskId: string; done: boolean }) => leadsApi.updateTask(id, taskId, { done }),
    onSuccess: invalidate,
  });

  // ── Email ────────────────────────────────────────────────────
  const [templateId, setTemplateId] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const sendEmail = useMutation({
    mutationFn: () => leadsApi.sendEmail(id, { subject: emailSubject.trim(), body: emailBody }),
    onSuccess: invalidate,
  });

  useEffect(() => {
    if (!templateId || !templates || !lead) return;
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl) {
      setEmailSubject(mergeTemplate(tpl.subject, lead.schoolName, lead.adminName));
      setEmailBody(mergeTemplate(tpl.body, lead.schoolName, lead.adminName));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const sortedActivity = useMemo(
    () => (lead?.activity ?? []).slice().sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()),
    [lead],
  );
  const sortedTasks = useMemo(
    () => (lead?.tasks ?? []).slice().sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }),
    [lead],
  );

  if (isLoading) return <div className="min-h-screen bg-gray-50 p-6 text-center py-16 text-gray-400">Loading…</div>;
  if (!lead) return <div className="min-h-screen bg-gray-50 p-6 text-center py-16 text-gray-400">Lead not found</div>;

  const stage = STAGES.find((s) => s.key === lead.status);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <button onClick={() => router.push('/leads')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1B3B69] mb-4">
        <ArrowLeft size={15} /> Back to pipeline
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#1B3B69] flex items-center gap-2">
              <Building2 size={20} /> {lead.schoolName}
            </h1>
            <p className="text-sm text-gray-400 mt-1">{lead.schoolType} · {lead.city}, {lead.country}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full text-white" style={{ backgroundColor: stage?.color }}>
              {stage?.label}
            </span>
            <select
              value={lead.status}
              disabled={moveStage.isPending}
              onChange={(e) => moveStage.mutate(e.target.value as LeadStatus)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 text-gray-600 bg-gray-50 outline-none"
            >
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
          <InfoRow icon={<User size={14} />} label="Admin" value={`${lead.adminName} (${lead.designation})`} />
          <InfoRow icon={<Mail size={14} />} label="Email" value={lead.email} href={`mailto:${lead.email}`} />
          <InfoRow icon={<Phone size={14} />} label="Phone" value={lead.phone} href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} />
          <InfoRow icon={<MapPin size={14} />} label="Fleet" value={`${lead.vanCount || '—'} vans · ${lead.studentCount || '—'} students`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: timeline + quick log */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">Log an interaction</p>
            <div className="flex gap-1.5 mb-2.5">
              {[
                { key: 'note', label: 'Note', icon: StickyNote },
                { key: 'call', label: 'Call', icon: PhoneCall },
                { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
                { key: 'meeting', label: 'Meeting', icon: Video },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActivityType(t.key as any)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg ${activityType === t.key ? 'bg-[#1B3B69] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  <t.icon size={13} /> {t.label}
                </button>
              ))}
            </div>
            <textarea
              value={activitySummary}
              onChange={(e) => setActivitySummary(e.target.value)}
              placeholder={activityType === 'note' ? 'Write a note…' : `What happened on this ${activityType}?`}
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69] resize-none"
            />
            <button
              onClick={() => logActivity.mutate()}
              disabled={!activitySummary.trim() || logActivity.isPending}
              className="mt-2 text-sm font-semibold px-4 py-2 rounded-xl bg-[#1B3B69] text-white disabled:opacity-40"
            >
              {logActivity.isPending ? 'Logging…' : 'Log'}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5"><Clock size={15} /> Timeline</p>
            {sortedActivity.length === 0 ? (
              <p className="text-xs text-gray-300 text-center py-6">No activity logged yet</p>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {sortedActivity.map((a, i) => <ActivityRow key={i} activity={a} />)}
              </div>
            )}
          </div>
        </div>

        {/* Right: tasks + email */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3">Follow-up tasks</p>
            <div className="flex flex-col gap-1.5 mb-3">
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Call back about pricing"
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]"
              />
              <div className="flex gap-1.5">
                <input
                  type="date"
                  value={taskDue}
                  onChange={(e) => setTaskDue(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-1.5 outline-none text-gray-600"
                />
                <button
                  onClick={() => addTask.mutate()}
                  disabled={!taskTitle.trim() || addTask.isPending}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#1B3B69] text-white disabled:opacity-40"
                >
                  <Plus size={13} /> Add
                </button>
              </div>
            </div>
            {sortedTasks.length === 0 ? (
              <p className="text-xs text-gray-300 text-center py-4">No follow-ups yet</p>
            ) : (
              <div className="space-y-2">
                {sortedTasks.map((t) => {
                  const overdue = !t.done && t.dueAt && new Date(t.dueAt) < new Date();
                  return (
                    <div key={t._id} className="flex items-start gap-2 text-sm">
                      <button
                        onClick={() => toggleTask.mutate({ taskId: t._id, done: !t.done })}
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${t.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}
                      >
                        {t.done && <CheckCircle2 size={12} className="text-white" />}
                      </button>
                      <div className="min-w-0">
                        <p className={`truncate ${t.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.title}</p>
                        {t.dueAt && (
                          <p className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                            {overdue ? 'Overdue — ' : 'Due '}{new Date(t.dueAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5"><Send size={15} /> Send Email</p>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 mb-2 outline-none text-gray-600"
            >
              <option value="">Choose a template…</option>
              {(templates ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Subject"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 mb-2 outline-none focus:border-[#1B3B69]"
            />
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder="Message"
              rows={6}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69] resize-none"
            />
            <button
              onClick={() => sendEmail.mutate()}
              disabled={!emailSubject.trim() || !emailBody.trim() || sendEmail.isPending}
              className="mt-2 w-full text-sm font-semibold px-4 py-2 rounded-xl bg-[#1B3B69] text-white disabled:opacity-40"
            >
              {sendEmail.isPending ? 'Sending…' : `Send to ${lead.email}`}
            </button>
            {sendEmail.isSuccess && <p className="text-xs text-emerald-600 mt-1.5">Email sent and logged to timeline.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 flex items-center gap-1">{icon} {label}</p>
      {href ? (
        <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="text-sm font-medium text-[#1B3B69] hover:underline truncate block">
          {value}
        </a>
      ) : (
        <p className="text-sm font-medium text-gray-700 truncate">{value}</p>
      )}
    </div>
  );
}

function ActivityRow({ activity }: { activity: LeadActivityEntry }) {
  const Icon = ACTIVITY_ICONS[activity.type] || StickyNote;
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-500">
        <Icon size={13} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-700">{activity.summary}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDateTime(activity.occurredAt)}{activity.authorEmail ? ` · ${activity.authorEmail}` : ''}
        </p>
      </div>
    </div>
  );
}
