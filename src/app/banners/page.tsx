'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Image as ImageIcon, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { bannerApi, uploadApi } from '@/lib/api';

interface Banner {
  _id: string;
  title: string;
  imageUrl: string;
  redirectUrl?: string;
  isActive: boolean;
  priority: number;
  startDate?: string;
  endDate?: string;
}

function BannerModal({ banner, onClose, onSuccess }: { banner: Banner | null; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState(banner?.title ?? '');
  const [imageUrl, setImageUrl] = useState(banner?.imageUrl ?? '');
  const [redirectUrl, setRedirectUrl] = useState(banner?.redirectUrl ?? '');
  const [priority, setPriority] = useState(String(banner?.priority ?? 0));
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { title, imageUrl, redirectUrl: redirectUrl || undefined, priority: Number(priority) || 0 };
      return banner ? bannerApi.update(banner._id, payload) : bannerApi.create(payload);
    },
    onSuccess: () => onSuccess(),
    onError: (err: any) => setError(err?.response?.data?.message ?? 'Failed to save banner'),
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
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!imageUrl) { setError('Please upload an image.'); return; }
    setError('');
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">{banner ? 'Edit Banner' : 'Add Banner'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Banner Image *</label>
            <label className="flex flex-col items-center justify-center gap-2 h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#1B2B6B]/40 hover:bg-gray-50 transition overflow-hidden relative">
              {imageUrl ? (
                <img src={imageUrl} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImageIcon size={28} className="text-gray-400" />
                  <p className="text-xs text-gray-400">{isUploading ? 'Uploading…' : 'Click to upload image'}</p>
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

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
              placeholder="e.g. Refer a Friend, Get 1 Month Free"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Link (optional)</label>
            <input
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
              placeholder="https://…"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Priority (higher shows first)</label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B2B6B]/30"
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
            disabled={mutation.isPending || isUploading}
            className="flex-1 py-2.5 bg-[#1B2B6B] text-white rounded-xl text-sm font-medium hover:bg-[#162356] transition disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save Banner'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BannersPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editTarget, setEditTarget] = useState<Banner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const res = await bannerApi.getAll();
      return (res.data?.data ?? []) as Banner[];
    },
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: (b: Banner) => bannerApi.update(b._id, { isActive: !b.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['banners'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bannerApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['banners'] }); setDeleteTarget(null); },
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">App Banners</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Images shown on the parent app&apos;s home screen — upload and manage them here
          </p>
        </div>
        <button
          onClick={() => setModal('add')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1B2B6B] text-white text-sm font-medium rounded-xl hover:bg-[#162356] transition"
        >
          <Plus size={16} />
          Add Banner
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
          <ImageIcon size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm">No banners yet. Add one to show it in the parent app.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners
            .slice()
            .sort((a, b) => b.priority - a.priority)
            .map((b) => (
              <div key={b._id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="h-32 bg-gray-100">
                  <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 flex-1">{b.title}</p>
                    <button onClick={() => toggleMutation.mutate(b)} title={b.isActive ? 'Active — tap to hide' : 'Hidden — tap to show'}>
                      {b.isActive ? (
                        <ToggleRight size={22} className="text-emerald-500" />
                      ) : (
                        <ToggleLeft size={22} className="text-gray-300" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Priority {b.priority}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => { setEditTarget(b); setModal('edit'); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(b)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-200 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {modal === 'add' && (
        <BannerModal
          banner={null}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); qc.invalidateQueries({ queryKey: ['banners'] }); }}
        />
      )}
      {modal === 'edit' && editTarget && (
        <BannerModal
          banner={editTarget}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); qc.invalidateQueries({ queryKey: ['banners'] }); }}
        />
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 mx-4 text-center">
            <AlertCircle size={36} className="mx-auto text-red-500 mb-3" />
            <h3 className="text-base font-bold text-gray-900 mb-1">Delete this banner?</h3>
            <p className="text-sm text-gray-500 mb-5">It will no longer show in the parent app.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget._id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
