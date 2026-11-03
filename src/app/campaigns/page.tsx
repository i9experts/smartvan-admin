'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Copy, Check, X, Trash2, Pencil, Code2, ChevronDown } from 'lucide-react';
import { campaignsApi, Campaign } from '@/lib/api';

const TRACKING_DOMAIN = 'https://smartvan.pk';

function trackingLink(c: Pick<Campaign, 'utmSource' | 'utmMedium' | 'utmCampaign'>) {
  const params = new URLSearchParams();
  if (c.utmSource) params.set('utm_source', c.utmSource);
  if (c.utmMedium) params.set('utm_medium', c.utmMedium);
  params.set('utm_campaign', c.utmCampaign);
  return `${TRACKING_DOMAIN}/?${params.toString()}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-gray-400 hover:text-[#1B3B69]"
      title="Copy"
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

const SNIPPET = `<script>
  // Forwards ?utm_source / utm_medium / utm_campaign from the page URL
  // into the existing registration & contact form submissions, so leads
  // land in Sales Ops already attributed to the campaign that sent them.
  (function () {
    var params = new URLSearchParams(window.location.search);
    var utm = {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
    };
    if (!utm.utm_source && !utm.utm_medium && !utm.utm_campaign) return;
    try { sessionStorage.setItem('smartvan_utm', JSON.stringify(utm)); } catch (e) {}
  })();
</script>`;

function TrackingSetupNote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center justify-between w-full text-left">
        <span className="text-sm font-semibold text-amber-800 flex items-center gap-2">
          <Code2 size={15} /> One-time setup needed on smartvan.pk to make attribution work
        </span>
        <ChevronDown size={16} className={`text-amber-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-3 text-sm text-amber-900 space-y-2">
          <p>
            This admin panel can store and report on campaigns, but it can&apos;t read the tracking link&apos;s
            query string — that only exists on smartvan.pk itself. Two small additions make attribution actually work:
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Add this snippet to smartvan.pk&apos;s <code className="bg-amber-100 px-1 rounded">&lt;head&gt;</code> (it just remembers the campaign for this visit):</li>
          </ol>
          <pre className="bg-white border border-amber-200 rounded-xl p-3 text-xs overflow-x-auto">{SNIPPET}</pre>
          <p>
            2. When the registration form and the Contact Us form submit, read it back
            (<code className="bg-amber-100 px-1 rounded">JSON.parse(sessionStorage.getItem(&apos;smartvan_utm&apos;))</code>) and include
            <code className="bg-amber-100 px-1 rounded"> utm_source</code>, <code className="bg-amber-100 px-1 rounded">utm_medium</code> and
            <code className="bg-amber-100 px-1 rounded"> utm_campaign</code> in the POST body — the backend already reads them on both forms.
          </p>
        </div>
      )}
    </div>
  );
}

function CampaignModal({ campaign, onClose }: { campaign?: Campaign; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!campaign;
  const [form, setForm] = useState({
    name: campaign?.name || '',
    channel: campaign?.channel || '',
    utmSource: campaign?.utmSource || '',
    utmMedium: campaign?.utmMedium || '',
    utmCampaign: campaign?.utmCampaign || '',
    spend: campaign?.spend?.toString() || '0',
    currency: campaign?.currency || 'PKR',
    status: campaign?.status || 'active',
  });

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, spend: Number(form.spend) || 0 };
      return isEdit ? campaignsApi.update(campaign!._id, body) : campaignsApi.create(body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); onClose(); },
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Campaign' : 'New Campaign'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input placeholder="Campaign name *" value={form.name} onChange={set('name')}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
          <input placeholder="Channel (e.g. Facebook, Google, WhatsApp)" value={form.channel} onChange={set('channel')}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
          <div className="flex gap-2">
            <input placeholder="utm_source" value={form.utmSource} onChange={set('utmSource')}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
            <input placeholder="utm_medium" value={form.utmMedium} onChange={set('utmMedium')}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
          </div>
          <input
            placeholder="utm_campaign * (unique key — e.g. spring-2026-facebook)"
            value={form.utmCampaign}
            onChange={set('utmCampaign')}
            disabled={isEdit}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69] disabled:bg-gray-50 disabled:text-gray-400"
          />
          {isEdit && <p className="text-xs text-gray-400 -mt-1">utm_campaign can&apos;t be changed after creation — leads already attributed to it would be orphaned.</p>}
          <div className="flex gap-2">
            <input placeholder="Spend" type="number" value={form.spend} onChange={set('spend')}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
            <select value={form.currency} onChange={set('currency')}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none text-gray-600">
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
            </select>
            <select value={form.status} onChange={set('status')}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none text-gray-600">
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>
        {save.isError && <p className="text-xs text-red-500 mt-2">Couldn&apos;t save — check the required fields (utm_campaign must be unique).</p>}
        <button
          onClick={() => save.mutate()}
          disabled={!form.name.trim() || !form.utmCampaign.trim() || save.isPending}
          className="mt-4 w-full text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#1B3B69] text-white disabled:opacity-40"
        >
          {save.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Campaign'}
        </button>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [modalCampaign, setModalCampaign] = useState<Campaign | 'new' | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsApi.getAll(),
    select: (res) => res.data.data,
    staleTime: 30_000,
  });

  const remove = useMutation({
    mutationFn: (id: string) => campaignsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const campaigns = data ?? [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {modalCampaign && (
        <CampaignModal
          campaign={modalCampaign === 'new' ? undefined : modalCampaign}
          onClose={() => setModalCampaign(null)}
        />
      )}

      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
            <Megaphone size={24} /> Campaigns
          </h1>
          <p className="text-gray-500 text-sm mt-1">Link tracking and spend, measured against real sign-ups, trials and paid schools.</p>
        </div>
        <button
          onClick={() => setModalCampaign('new')}
          className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl bg-[#1B3B69] text-white"
        >
          <Plus size={14} /> New Campaign
        </button>
      </div>

      <TrackingSetupNote />

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Megaphone size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No campaigns yet</p>
            <p className="text-sm mt-1">Create one to get a trackable link and see its funnel here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Campaign</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Spend</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Signups</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Trials</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Won</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Cost / Won</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Tracking Link</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{c.name}</div>
                      <div className="text-xs text-gray-400">{c.channel || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        c.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                        c.status === 'paused' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {c.status[0].toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.currency} {c.spend.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{c.metrics.signups}</td>
                    <td className="px-4 py-3 text-gray-600">{c.metrics.trials}</td>
                    <td className="px-4 py-3 text-gray-600">{c.metrics.won}</td>
                    <td className="px-4 py-3 text-gray-600">{c.metrics.costPerWon != null ? `${c.currency} ${c.metrics.costPerWon.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 max-w-[160px]">
                        <span className="text-xs text-gray-400 truncate" title={trackingLink(c)}>{trackingLink(c)}</span>
                        <CopyButton text={trackingLink(c)} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setModalCampaign(c)} title="Edit" className="p-1.5 rounded-lg text-gray-400 hover:text-[#1B3B69] hover:bg-gray-100">
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete "${c.name}"? Leads already attributed to it keep their data.`)) remove.mutate(c._id); }}
                          title="Delete"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
