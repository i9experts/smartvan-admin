'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Bell, Route as RouteIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { adminTripApi } from '@/lib/api';
import { decodePolyline, formatDistance, formatDuration, pktDate, pktTime } from '@/lib/geo';

const TripTrailMap = dynamic(() => import('@/components/maps/TripTrailMap'), { ssr: false });

interface Details {
  id: string;
  routeName: string;
  tripType: 'pick' | 'drop';
  date: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  studentCount: number;
  pickedCount: number;
  droppedCount: number;
  absentCount: number;
  noShowCount: number;
  driverName: string;
  vanNumber: string;
  maxSpeedKmh?: number | null;
  students: { kidId: string; name: string; status: string; at: string | null; arrivedAtStopAt?: string | null }[];
  stops: { order: number; placeName: string; lat: number; lng: number; students: { kidId: string; name: string; status: string; at: string | null }[] }[];
  alerts: { type: string; title: string; message: string; at: string }[];
  school: { name: string; lat: number; lng: number } | null;
}

const STUDENT_STATUS: Record<string, string> = {
  picked: 'bg-emerald-50 text-emerald-700',
  dropped: 'bg-blue-50 text-blue-700',
  absent: 'bg-red-50 text-red-600',
  no_show: 'bg-orange-50 text-orange-700',
  pending: 'bg-gray-100 text-gray-600',
};
const ALERT_STYLE: Record<string, string> = {
  sos: 'bg-red-50 text-red-600',
  overspeed: 'bg-orange-50 text-orange-700',
  traffic_delay: 'bg-amber-50 text-amber-700',
  tracking_lost: 'bg-gray-100 text-gray-600',
};
const label = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function Stat({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3">
      <p className="text-[11px] text-gray-400">{title}</p>
      <p className="text-sm font-semibold text-gray-800 mt-0.5">{value}</p>
    </div>
  );
}

export default function TripDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const detailsQ = useQuery({
    queryKey: ['admin-trip-details', id],
    queryFn: async () => (await adminTripApi.getDetails(id)).data?.data as Details,
    enabled: !!id,
  });
  const trailQ = useQuery({
    queryKey: ['admin-trip-trail-final', id],
    queryFn: async () => (await adminTripApi.getTrail(id)).data?.data as { polyline: string } | undefined,
    enabled: !!id,
  });

  const d = detailsQ.data;
  const trail = useMemo(() => decodePolyline(trailQ.data?.polyline), [trailQ.data]);
  const stops = useMemo(() => (d?.stops ?? []).map((s) => ({
    order: s.order,
    label: s.students?.map((x) => x.name).join(', ') || s.placeName,
    lat: s.lat, lng: s.lng,
    title: `${s.order}. ${s.placeName}`,
  })), [d]);

  const back = (
    <Link href="/trip-history" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 mb-3">
      <ArrowLeft size={14} className="rtl:rotate-180" /> Back to Trip History
    </Link>
  );

  if (detailsQ.isLoading) {
    return (
      <div className="p-6">{back}
        <div className="h-8 w-64 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="h-[420px] bg-gray-100 rounded-2xl animate-pulse" />
      </div>
    );
  }
  if (detailsQ.isError || !d) {
    const status = (detailsQ.error as any)?.response?.status;
    return (
      <div className="p-6">{back}
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-red-500">
          <AlertTriangle className="mx-auto mb-2" size={24} />
          <p className="text-sm font-medium">{status === 404 ? 'Trip not found' : "Couldn't load this trip"}</p>
          <button onClick={() => detailsQ.refetch()} className="mt-2 text-xs underline">Try again</button>
        </div>
      </div>
    );
  }

  const trailMissing = !trailQ.isLoading && trail.length < 2;

  return (
    <div className="p-6 space-y-5">
      <div>
        {back}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{d.routeName}</h1>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${d.tripType === 'pick' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
            {d.tripType === 'pick' ? 'Pick' : 'Drop'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{pktDate(d.endedAt ?? d.date)} · {pktTime(d.startedAt)} – {pktTime(d.endedAt)} PKT</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Stat title="Driver" value={d.driverName || '—'} />
        <Stat title="Van" value={d.vanNumber || '—'} />
        <Stat title="Duration" value={formatDuration(d.durationSeconds)} />
        <Stat title="Distance" value={formatDistance(d.distanceMeters)} />
        <Stat title="Max speed" value={d.maxSpeedKmh != null ? `${Math.round(d.maxSpeedKmh)} km/h` : '—'} />
        <Stat title="Picked" value={d.pickedCount} />
        <Stat title="Dropped" value={d.droppedCount} />
        <Stat title="Absent" value={(d.absentCount ?? 0) + (d.noShowCount ?? 0)} />
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="h-[460px] relative">
          <TripTrailMap trail={trail} stops={stops} school={d.school} />
          {trailQ.isLoading && (
            <div className="absolute top-3 start-3 bg-white/95 rounded-lg shadow px-3 py-2 text-xs text-gray-600">Loading route…</div>
          )}
          {(trailMissing || trailQ.isError) && (
            <div className="absolute top-3 start-1/2 -translate-x-1/2 bg-white/95 border border-gray-200 rounded-xl shadow px-4 py-2.5 text-sm text-gray-700 flex items-center gap-2">
              <RouteIcon size={15} className="text-gray-400" /> Route not available for this trip
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800">Students ({d.students?.length ?? 0})</div>
          {(d.students?.length ?? 0) === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">No students on this trip</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 bg-gray-50">
                <tr>
                  <th className="px-4 py-2 font-medium text-start">Student</th>
                  <th className="px-4 py-2 font-medium text-start">Status</th>
                  <th className="px-4 py-2 font-medium text-start">Time (PKT)</th>
                  <th className="px-4 py-2 font-medium text-start">Reached stop</th>
                </tr>
              </thead>
              <tbody>
                {d.students.map((s) => (
                  <tr key={s.kidId} className="border-t border-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{s.name}</td>
                    <td className="px-4 py-2.5"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STUDENT_STATUS[s.status] ?? STUDENT_STATUS.pending}`}>{label(s.status)}</span></td>
                    <td className="px-4 py-2.5 text-gray-600">{s.at ? pktTime(s.at, true) : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{s.arrivedAtStopAt ? pktTime(s.arrivedAtStopAt, true) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm font-semibold text-gray-800 flex items-center gap-2"><Bell size={14} /> Alerts during trip ({d.alerts?.length ?? 0})</div>
          {(d.alerts?.length ?? 0) === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400">No alerts during this trip</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {d.alerts.map((a, i) => (
                <li key={i} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ALERT_STYLE[a.type] ?? 'bg-gray-100 text-gray-600'}`}>{label(a.type)}</span>
                    <span className="text-[11px] text-gray-400">{pktTime(a.at, true)}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-1">{a.title}</p>
                  {a.message && <p className="text-xs text-gray-500 mt-0.5">{a.message}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
