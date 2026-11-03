'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Handshake, Plus, Copy, Check, X, Trash2, Pencil, Code2, ChevronDown, Receipt, DollarSign } from 'lucide-react';
import { partnersApi, Partner, PartnerType, Commission } from '@/lib/api';

const TRACKING_DOMAIN = 'https://smartvan.pk';
const TYPE_LABELS: Record<PartnerType, string> = {
  individual_agent: 'Individual Agent',
  channel_partner: 'Channel Partner',
  reseller: 'Reseller',
};

function trackingLink(referralCode: string) {
  return `${TRACKING_DOMAIN}/?ref=${referralCode}`;
}

function formatMoneyByCurrency(byCurrency: Record<string, number>) {
  const entries = Object.entries(byCurrency).filter(([, v]) => v > 0);
  if (entries.length === 0) return '—';
  return entries.map(([currency, amount]) => `${currency} ${amount.toLocaleString()}`).join(' + ');
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
  // Forwards ?ref=CODE from the page URL into the existing registration &
  // contact form submissions, so leads land in Sales Ops already
  // attributed to the partner whose link sent them.
  (function () {
    var params = new URLSearchParams(window.location.search);
    var ref = params.get('ref') || '';
    if (!ref) return;
    try { sessionStorage.setItem('smartvan_ref', ref); } catch (e) {}
  })();
</script>`;

function TrackingSetupNote() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center justify-between w-full text-left">
        <span className="text-sm font-semibold text-amber-800 flex items-center gap-2">
          <Code2 size={15} /> One-time setup needed on smartvan.pk to make referral attribution work
        </span>
        <ChevronDown size={16} className={`text-amber-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-3 text-sm text-amber-900 space-y-2">
          <p>
            Same setup as Campaigns, with a <code className="bg-amber-100 px-1 rounded">ref</code> param instead of
            <code className="bg-amber-100 px-1 rounded"> utm_*</code>:
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Add this snippet to smartvan.pk&apos;s <code className="bg-amber-100 px-1 rounded">&lt;head&gt;</code>:</li>
          </ol>
          <pre className="bg-white border border-amber-200 rounded-xl p-3 text-xs overflow-x-auto">{SNIPPET}</pre>
          <p>
            2. When the registration form and the Contact Us form submit, read it back
            (<code className="bg-amber-100 px-1 rounded">sessionStorage.getItem(&apos;smartvan_ref&apos;)</code>) and include it as
            <code className="bg-amber-100 px-1 rounded"> referralCode</code> (or <code className="bg-amber-100 px-1 rounded">ref</code>) in
            the POST body — the backend already reads it on both forms.
          </p>
        </div>
      )}
    </div>
  );
}

function PartnerModal({ partner, onClose }: { partner?: Partner; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!partner;
  const [form, setForm] = useState({
    name: partner?.name || '',
    contactName: partner?.contactName || '',
    email: partner?.email || '',
    phone: partner?.phone || '',
    type: partner?.type || 'individual_agent',
    referralCode: partner?.referralCode || '',
    commissionRate: partner?.commissionRate?.toString() || '10',
    status: partner?.status || 'active',
    paymentDetails: partner?.paymentDetails || '',
    notes: partner?.notes || '',
  });

  const save = useMutation({
    mutationFn: () => {
      const body = { ...form, commissionRate: Number(form.commissionRate) || 0 };
      return isEdit ? partnersApi.update(partner!._id, body) : partnersApi.create(body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['partners'] }); qc.invalidateQueries({ queryKey: ['partners-overview'] }); onClose(); },
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Partner' : 'New Partner'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <input placeholder="Partner / company name *" value={form.name} onChange={set('name')}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
          <input placeholder="Contact person" value={form.contactName} onChange={set('contactName')}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
          <div className="flex gap-2">
            <input placeholder="Email *" type="email" value={form.email} onChange={set('email')}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
            <input placeholder="Phone" value={form.phone} onChange={set('phone')}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
          </div>
          <select value={form.type} onChange={set('type')}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none text-gray-600">
            <option value="individual_agent">Individual Agent</option>
            <option value="channel_partner">Channel Partner</option>
            <option value="reseller">Reseller</option>
          </select>
          <input
            placeholder="Referral code (auto-generated from name if left blank)"
            value={form.referralCode}
            onChange={set('referralCode')}
            disabled={isEdit}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69] disabled:bg-gray-50 disabled:text-gray-400"
          />
          {isEdit && <p className="text-xs text-gray-400 -mt-1">Referral code can&apos;t be changed after creation — leads already attributed to it would be orphaned.</p>}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400">Commission rate (%)</label>
              <input placeholder="10" type="number" min="0" max="100" value={form.commissionRate} onChange={set('commissionRate')}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69] mt-0.5" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400">Status</label>
              <select value={form.status} onChange={set('status')}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none text-gray-600 mt-0.5">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <input placeholder="Payment details (bank / JazzCash / Easypaisa) — for your own reference" value={form.paymentDetails} onChange={set('paymentDetails')}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69]" />
          <textarea placeholder="Notes" value={form.notes} onChange={set('notes')} rows={2}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#1B3B69] resize-none" />
        </div>
        {save.isError && <p className="text-xs text-red-500 mt-2">Couldn&apos;t save — check the required fields (referral code, if set, must be unique).</p>}
        <button
          onClick={() => save.mutate()}
          disabled={!form.name.trim() || !form.email.trim() || save.isPending}
          className="mt-4 w-full text-sm font-semibold px-4 py-2.5 rounded-xl bg-[#1B3B69] text-white disabled:opacity-40"
        >
          {save.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Partner'}
        </button>
      </div>
    </div>
  );
}

function CommissionRow({ commission }: { commission: Commission }) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  const markPaid = useMutation({
    mutationFn: () => partnersApi.markCommissionPaid(commission._id, note || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['partner-commissions'] });
      qc.invalidateQueries({ queryKey: ['partners'] });
      qc.invalidateQueries({ queryKey: ['partners-overview'] });
    },
  });

  const schoolName = typeof commission.schoolId === 'object' ? commission.schoolId.schoolName : '—';

  return (
    <tr className="border-b border-gray-100">
      <td className="px-3 py-2.5 text-gray-700">{schoolName}</td>
      <td className="px-3 py-2.5 text-gray-500 text-xs">{new Date(commission.createdAt).toLocaleDateString()}</td>
      <td className="px-3 py-2.5 text-gray-500 text-xs">{commission.source === 'stripe_invoice' ? 'Stripe' : 'Manual'}</td>
      <td className="px-3 py-2.5 text-gray-600">{commission.currency} {commission.grossAmount.toLocaleString()}</td>
      <td className="px-3 py-2.5 text-gray-600">{commission.rate}%</td>
      <td className="px-3 py-2.5 font-semibold text-gray-800">{commission.currency} {commission.amount.toLocaleString()}</td>
      <td className="px-3 py-2.5">
        {commission.status === 'paid' ? (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
            Paid {commission.paidAt ? new Date(commission.paidAt).toLocaleDateString() : ''}
          </span>
        ) : showNote ? (
          <div className="flex items-center gap-1.5">
            <input
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-28 outline-none"
            />
            <button
              onClick={() => markPaid.mutate()}
              disabled={markPaid.isPending}
              className="text-xs font-semibold px-2 py-1 rounded-lg bg-[#1B3B69] text-white disabled:opacity-40"
            >
              {markPaid.isPending ? '…' : 'Confirm'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNote(true)}
            className="text-xs font-semibold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100"
          >
            Mark Paid
          </button>
        )}
      </td>
    </tr>
  );
}

function PartnerLedgerModal({ partner, onClose }: { partner: Partner; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['partner-commissions', partner._id],
    queryFn: () => partnersApi.getCommissions(partner._id),
    select: (res) => res.data.data,
    staleTime: 10_000,
  });

  const commissions = data?.commissions ?? [];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Receipt size={18} /> {partner.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <p className="text-xs text-gray-400 mb-4">{partner.commissionRate}% commission · {trackingLink(partner.referralCode)}</p>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : commissions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <DollarSign size={28} className="mx-auto mb-2 opacity-40" />
            <p className="font-medium">No commissions yet</p>
            <p className="text-sm mt-1">These accrue automatically once a referred school makes a real payment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">School</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Date</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Source</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Payment</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Rate</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Commission</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => <CommissionRow key={c._id} commission={c} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PartnersPage() {
  const qc = useQueryClient();
  const [modalPartner, setModalPartner] = useState<Partner | 'new' | null>(null);
  const [ledgerPartner, setLedgerPartner] = useState<Partner | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: () => partnersApi.getAll(),
    select: (res) => res.data.data,
    staleTime: 30_000,
  });

  const { data: overview } = useQuery({
    queryKey: ['partners-overview'],
    queryFn: () => partnersApi.getOverview(),
    select: (res) => res.data.data,
    staleTime: 30_000,
  });

  const remove = useMutation({
    mutationFn: (id: string) => partnersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['partners'] }),
    onError: (err: any) => alert(err?.response?.data?.message || 'Could not delete this partner.'),
  });

  const partners = data ?? [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {modalPartner && (
        <PartnerModal
          partner={modalPartner === 'new' ? undefined : modalPartner}
          onClose={() => setModalPartner(null)}
        />
      )}
      {ledgerPartner && <PartnerLedgerModal partner={ledgerPartner} onClose={() => setLedgerPartner(null)} />}

      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
            <Handshake size={24} /> Partners &amp; Commissions
          </h1>
          <p className="text-gray-500 text-sm mt-1">Referral agents and resellers, their tracking links, and what they&apos;re owed.</p>
        </div>
        <button
          onClick={() => setModalPartner('new')}
          className="flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-xl bg-[#1B3B69] text-white"
        >
          <Plus size={14} /> New Partner
        </button>
      </div>

      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs text-gray-400">Active Partners</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{overview.activePartners} <span className="text-sm font-normal text-gray-400">/ {overview.totalPartners}</span></p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-400">Pending Payout</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{formatMoneyByCurrency(overview.pendingByCurrency)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-400">Paid Out</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatMoneyByCurrency(overview.paidByCurrency)}</p>
          </div>
        </div>
      )}

      <TrackingSetupNote />

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : partners.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Handshake size={32} className="mx-auto mb-3 opacity-40" />
            <p className="font-medium">No partners yet</p>
            <p className="text-sm mt-1">Add one to get a trackable referral link and start earning them commission.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Partner</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Rate</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Signups</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Won</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Pending</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Paid</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Tracking Link</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{p.name}</div>
                      <div className="text-xs text-gray-400">{TYPE_LABELS[p.type]}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        p.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {p.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.commissionRate}%</td>
                    <td className="px-4 py-3 text-gray-600">{p.metrics.signups}</td>
                    <td className="px-4 py-3 text-gray-600">{p.metrics.won}</td>
                    <td className="px-4 py-3 text-amber-600 font-medium">{formatMoneyByCurrency(p.metrics.pendingByCurrency)}</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">{formatMoneyByCurrency(p.metrics.paidByCurrency)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 max-w-[160px]">
                        <span className="text-xs text-gray-400 truncate" title={trackingLink(p.referralCode)}>{trackingLink(p.referralCode)}</span>
                        <CopyButton text={trackingLink(p.referralCode)} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setLedgerPartner(p)} title="Commission ledger" className="p-1.5 rounded-lg text-gray-400 hover:text-[#1B3B69] hover:bg-gray-100">
                          <Receipt size={15} />
                        </button>
                        <button onClick={() => setModalPartner(p)} title="Edit" className="p-1.5 rounded-lg text-gray-400 hover:text-[#1B3B69] hover:bg-gray-100">
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete "${p.name}"?`)) remove.mutate(p._id); }}
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
