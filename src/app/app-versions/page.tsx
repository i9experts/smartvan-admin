'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, X, AlertCircle, AlertTriangle, CheckCircle2, Smartphone } from 'lucide-react';
import { appVersionApi } from '@/lib/api';

interface AppVersion {
  _id: string;
  app: 'parent' | 'driver';
  platform: 'android' | 'ios';
  latestVersion: string;
  minVersion: string;
  storeUrl: string;
  updateMessage: string | null;
  updatedAt?: string;
}

const SEMVER = /^\d+\.\d+\.\d+$/;

// Numeric (not string) comparison: 1.0.10 > 1.0.9.
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

const inputCls =
  'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3B69]/30';

function EditModal({ row, onClose, onSuccess, onError }: {
  row: AppVersion;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [latestVersion, setLatestVersion] = useState(row.latestVersion);
  const [minVersion, setMinVersion] = useState(row.minVersion);
  const [storeUrl, setStoreUrl] = useState(row.storeUrl);
  const [updateMessage, setUpdateMessage] = useState(row.updateMessage ?? '');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      appVersionApi.update(row._id, {
        latestVersion: latestVersion.trim(),
        minVersion: minVersion.trim(),
        storeUrl: storeUrl.trim(),
        updateMessage: updateMessage.trim() ? updateMessage.trim() : null,
      }),
    onSuccess: () => onSuccess(),
    onError: (err: any) => {
      const m = err?.response?.data?.message;
      const msg = Array.isArray(m) ? m.join(', ') : m ?? 'Failed to save app version';
      setError(msg);
      onError(msg);
    },
  });

  function handleSubmit() {
    if (!SEMVER.test(latestVersion.trim())) { setError('Latest version must look like 1.0.8'); return; }
    if (!SEMVER.test(minVersion.trim())) { setError('Min version must look like 1.0.8'); return; }
    if (compareSemver(minVersion.trim(), latestVersion.trim()) > 0) {
      setError('Min version must be less than or equal to latest version.');
      return;
    }
    if (!/^https?:\/\/\S+$/.test(storeUrl.trim())) { setError('Store URL must start with http:// or https://'); return; }
    setError('');
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 capitalize">
            Edit {row.app} app · {row.platform}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Latest version *</label>
            <input value={latestVersion} onChange={(e) => setLatestVersion(e.target.value)} className={inputCls} placeholder="1.0.8" />
            <p className="text-[11px] text-gray-400 mt-1">Users below this see an optional &quot;update available&quot; popup.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Min version *</label>
            <input value={minVersion} onChange={(e) => setMinVersion(e.target.value)} className={inputCls} placeholder="0.0.0" />
            <div className="flex items-start gap-2 mt-2 text-amber-800 text-xs bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                Users below this version will be FORCED to update. Only raise it after the new version is live on the store.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Store URL *</label>
            <input value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} className={inputCls} placeholder="https://…" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Update message (optional)</label>
            <textarea
              value={updateMessage}
              onChange={(e) => setUpdateMessage(e.target.value)}
              rows={3}
              maxLength={500}
              className={inputCls}
              placeholder="Shown in the update popup"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-lg p-3">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex-1 py-2.5 bg-[#1B3B69] text-white rounded-xl text-sm font-medium hover:bg-[#162356] transition disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppVersionsPage() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<AppVersion | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['app-versions'],
    queryFn: async () => (await appVersionApi.getAll()).data as AppVersion[],
    staleTime: 30_000,
  });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">App Versions</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Controls the &quot;update available&quot; and &quot;force update&quot; popups in the parent and driver apps
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : isError ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl text-sm text-red-500">
          Failed to load app versions.
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
          <Smartphone size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No app version rows found.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                {['App', 'Platform', 'Latest version', 'Min version', 'Store URL', 'Message', 'Updated at', ''].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 capitalize font-medium text-gray-800">{r.app}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{r.platform}</td>
                  <td className="px-4 py-3 font-mono text-gray-800">{r.latestVersion}</td>
                  <td className="px-4 py-3 font-mono text-gray-800">{r.minVersion}</td>
                  <td className="px-4 py-3 max-w-[220px] truncate">
                    <a href={r.storeUrl} target="_blank" rel="noreferrer" title={r.storeUrl} className="text-[#1B3B69] hover:underline">
                      {r.storeUrl}
                    </a>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-gray-500" title={r.updateMessage ?? ''}>
                    {r.updateMessage || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditTarget(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editTarget && (
        <EditModal
          row={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            qc.invalidateQueries({ queryKey: ['app-versions'] });
            setToast({ kind: 'success', text: 'App version updated' });
          }}
          onError={(text) => setToast({ kind: 'error', text })}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm text-white ${
            toast.kind === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          {toast.kind === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}
