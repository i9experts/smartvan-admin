'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Printer, RefreshCw, QrCode, Search } from 'lucide-react';
import { api, vanApi } from '@/lib/api';

interface QrCard {
  kidId: string;
  fullname: string;
  grade?: string;
  image?: string;
  vanId?: string;
  status?: string;
  qrPayload: string;
}

function QrImage({ payload }: { payload: string }) {
  const [src, setSrc] = useState<string>('');
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: 360 })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(''));
    return () => {
      alive = false;
    };
  }, [payload]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Student QR code" className="w-[30mm] h-[30mm]" />
  ) : (
    <div className="w-[30mm] h-[30mm] bg-gray-100 animate-pulse rounded" />
  );
}

/**
 * Student QR cards for the driver app's "Scan student card".
 * GET /kid/qr/cards issues tokens for any student that doesn't have one.
 */
export default function QrCardsPage() {
  const queryClient = useQueryClient();
  const [vanId, setVanId] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data: vans = [] } = useQuery({
    queryKey: ['qr-vans'],
    queryFn: () => vanApi.getByAdmin({ page: 1, limit: 200 }),
    select: (r: any) =>
      (r.data?.data ?? []).map((item: any) => ({
        id: String(item.van?.id || item.van?._id || item._id || ''),
        carNumber: item.van?.carNumber || item.carNumber || '',
      })),
  });

  const { data: cards = [], isLoading, isError } = useQuery({
    queryKey: ['qr-cards', vanId],
    queryFn: () => api.get('/kid/qr/cards', { params: vanId ? { vanId } : {} }),
    select: (r: any) => (r.data?.data ?? []) as QrCard[],
  });

  const vanNumber = useMemo(() => {
    const m = new Map<string, string>(vans.map((v: any) => [v.id, v.carNumber]));
    return (id?: string) => (id ? m.get(id) || '' : '');
  }, [vans]);

  const shown = cards.filter((c) => c.fullname?.toLowerCase().includes(search.trim().toLowerCase()));

  async function regenerate(card: QrCard) {
    if (!confirm(`Issue a new card for ${card.fullname}? The old card will stop working immediately.`)) return;
    setBusyId(card.kidId);
    setError('');
    try {
      await api.post(`/kid/${card.kidId}/qr/regenerate`);
      await queryClient.invalidateQueries({ queryKey: ['qr-cards'] });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not issue a new card.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6 space-y-5 print:p-0">
      <style>{`@media print { @page { size: A4; margin: 10mm; } }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <QrCode size={22} /> Student QR Cards
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Drivers scan these cards to mark pickup and drop-off. Print, cut and laminate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student"
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg"
            />
          </div>
          <select
            value={vanId}
            onChange={(e) => setVanId(e.target.value)}
            className="py-2 px-3 text-sm border border-gray-200 rounded-lg bg-white"
          >
            <option value="">All vans</option>
            {vans.map((v: any) => (
              <option key={v.id} value={v.id}>
                {v.carNumber || v.id}
              </option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            disabled={!shown.length}
            className="inline-flex items-center gap-2 bg-[#1B2B6B] text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-40"
          >
            <Printer size={16} /> Print {shown.length ? `(${shown.length})` : ''}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 print:hidden">{error}</p>}

      {isLoading ? (
        <p className="text-sm text-gray-400">Loading students…</p>
      ) : isError ? (
        <p className="text-sm text-red-600">Could not load QR cards. Make sure the backend is on the Phase 2 version or later.</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-gray-400">No students found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 print:grid-cols-2 print:gap-[4mm]">
          {shown.map((c) => (
            <div key={c.kidId} className="break-inside-avoid">
              {/* Card face — ID-1 size (85.6 × 54 mm) when printed */}
              <div className="bg-white border border-gray-300 rounded-xl p-3 flex gap-3 items-center print:w-[85.6mm] print:h-[54mm] print:rounded-[3mm] print:p-[3mm]">
                <QrImage payload={c.qrPayload} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold tracking-wide text-[#1B2B6B] uppercase">SmartVan student card</p>
                  <p className="text-base font-bold text-gray-900 leading-tight mt-1 break-words">{c.fullname}</p>
                  {c.grade && <p className="text-xs text-gray-600 mt-0.5">Grade {c.grade}</p>}
                  {vanNumber(c.vanId) && <p className="text-xs text-gray-600">Van {vanNumber(c.vanId)}</p>}
                  <p className="text-[9px] text-gray-400 mt-2">If found, please return to the school.</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-1 px-1 print:hidden">
                <span className="text-[11px] text-gray-400">{c.status === 'active' ? 'Active' : c.status || ''}</span>
                <button
                  onClick={() => regenerate(c)}
                  disabled={busyId === c.kidId}
                  className="text-[11px] text-gray-500 hover:text-red-600 inline-flex items-center gap-1 disabled:opacity-40"
                  title="Lost card? Issue a new one"
                >
                  <RefreshCw size={11} className={busyId === c.kidId ? 'animate-spin' : ''} /> New card
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
