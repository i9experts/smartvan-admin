'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '@/lib/api';

export type SafetyAlertKind = 'sos' | 'childLeftBehind' | 'overspeed' | 'checklist';

export interface SafetyAlert {
  id: string;
  kind: SafetyAlertKind;
  receivedAt: number;
  driverName: string;
  tripId?: string | null;
  vanNumber?: string;
  message: string;
  location?: { lat: number; lng: number } | null;
  raw: any;
}

function toAlert(kind: SafetyAlertKind, p: any): SafetyAlert {
  const base = {
    id: String(p?.alertId ?? `${kind}-${Date.now()}`),
    kind,
    receivedAt: Date.now(),
    driverName: p?.driverName || 'Driver',
    tripId: p?.tripId ?? null,
    vanNumber: p?.vanNumber,
    raw: p,
  };
  switch (kind) {
    case 'sos':
      return { ...base, message: p?.message || 'Emergency SOS', location: p?.location ?? null };
    case 'childLeftBehind': {
      const names = (p?.kids ?? []).map((k: any) => k.fullname).join(', ');
      return {
        ...base,
        message: `Ended a drop trip with students not marked as dropped: ${names}.${p?.note ? ` Note: "${p.note}"` : ''}`,
      };
    }
    case 'overspeed':
      return {
        ...base,
        message: `Driving at ${p?.speedKmh} km/h (limit ${p?.limitKmh}).`,
        location: p?.location ?? null,
      };
    case 'checklist': {
      const items = (p?.failedItems ?? []).map((i: any) => i.key + (i.note ? ` (${i.note})` : '')).join(', ');
      return { ...base, message: `Van check issues: ${items || 'see details'}.` };
    }
  }
}

/**
 * Connects to the school's alert room (backend Phase 2/3) and collects
 * live safety alerts: driver SOS, students not dropped, overspeed and
 * failed pre-trip checks.
 */
export function useSchoolAlerts(
  token: string | null,
  role: string | undefined,
  onAlert?: (a: SafetyAlert) => void,
) {
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  useEffect(() => {
    // Superadmins have no single school; only school admins and staff.
    if (!token || (role !== 'admin' && role !== 'school_staff')) return;

    const socket: Socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    const push = (kind: SafetyAlertKind) => (payload: any) => {
      // The trip room also carries the parent-originated SOS; only the
      // driver SOS belongs here.
      if (kind === 'sos' && payload?.source !== 'driver') return;
      const a = toAlert(kind, payload);
      setAlerts((prev) => (prev.some((x) => x.id === a.id) ? prev : [a, ...prev].slice(0, 30)));
      onAlertRef.current?.(a);
    };

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('joinSchoolAlerts', {});
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('sosAlert', push('sos'));
    socket.on('childLeftBehindAlert', push('childLeftBehind'));
    socket.on('overspeedAlert', push('overspeed'));
    socket.on('pretripChecklistAlert', push('checklist'));

    return () => {
      socket.disconnect();
    };
  }, [token, role]);

  const dismiss = (id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id));
  return { alerts, connected, dismiss };
}
