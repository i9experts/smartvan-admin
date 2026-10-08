'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AlertOctagon, Gauge, ClipboardX, Baby, MapPin, X } from 'lucide-react';
import { SafetyAlert, useSchoolAlerts } from '@/hooks/useSchoolAlerts';

const STYLES: Record<SafetyAlert['kind'], { title: string; color: string; Icon: any }> = {
  sos: { title: 'Driver SOS', color: '#DC2626', Icon: AlertOctagon },
  childLeftBehind: { title: 'Students not dropped', color: '#DC2626', Icon: Baby },
  overspeed: { title: 'Overspeeding', color: '#EA580C', Icon: Gauge },
  checklist: { title: 'Van check issues', color: '#D97706', Icon: ClipboardX },
};

/** Repeating beep while an SOS is unacknowledged (Web Audio, no asset). */
function useAlarm() {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const ctx = useRef<AudioContext | null>(null);

  const beep = useCallback(() => {
    try {
      ctx.current ??= new (window.AudioContext || (window as any).webkitAudioContext)();
      const c = ctx.current;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.35);
    } catch {
      // audio blocked until the user interacts with the page — banner still shows
    }
  }, []);

  const start = useCallback(() => {
    if (timer.current) return;
    beep();
    timer.current = setInterval(beep, 1500);
  }, [beep]);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => stop, [stop]);
  return { start, stop };
}

/**
 * Mounted once for the whole portal. Shows live safety alerts from
 * drivers: SOS as a blocking red panel with an alarm until acknowledged,
 * the rest as toasts. Also refreshes the Alerts page lists.
 */
export function SafetyAlertCenter() {
  // Read the session straight from storage on every navigation: this
  // component lives in the root layout, so it must notice a login/logout
  // that happened after it mounted.
  const pathname = usePathname();
  const [session, setSession] = useState<{ token: string | null; role?: string }>({ token: null });
  useEffect(() => {
    try {
      const token = localStorage.getItem('smartvan_token');
      const user = JSON.parse(localStorage.getItem('smartvan_user') || 'null');
      setSession((prev) =>
        prev.token === token && prev.role === user?.role ? prev : { token, role: user?.role },
      );
    } catch {
      setSession({ token: null });
    }
  }, [pathname]);
  const queryClient = useQueryClient();
  const alarm = useAlarm();

  const onAlert = useCallback(
    (a: SafetyAlert) => {
      queryClient.invalidateQueries({ queryKey: ['driver-alerts'] });
      if (a.kind === 'sos') alarm.start();
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(`SmartVan — ${STYLES[a.kind].title}`, { body: `${a.driverName}: ${a.message}` });
      }
    },
    [queryClient, alarm],
  );

  const { alerts, dismiss } = useSchoolAlerts(session.token, session.role, onAlert);

  // Auto-dismiss the less critical toasts.
  useEffect(() => {
    const timers = alerts
      .filter((a) => a.kind === 'overspeed' || a.kind === 'checklist')
      .map((a) => setTimeout(() => dismiss(a.id), 20_000 - (Date.now() - a.receivedAt)));
    return () => timers.forEach(clearTimeout);
  }, [alerts, dismiss]);

  const sos = alerts.filter((a) => a.kind === 'sos');
  const toasts = alerts.filter((a) => a.kind !== 'sos');

  useEffect(() => {
    if (sos.length === 0) alarm.stop();
  }, [sos.length, alarm]);

  if (!alerts.length) return null;

  return (
    <>
      {sos.length > 0 && (
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4 print:hidden">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#DC2626] text-white px-5 py-4 flex items-center gap-3">
              <AlertOctagon size={28} className="animate-pulse" />
              <div>
                <p className="text-lg font-bold">Driver SOS</p>
                <p className="text-xs opacity-90">{sos.length > 1 ? `${sos.length} active emergencies` : 'Emergency alert from a driver'}</p>
              </div>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {sos.map((a) => (
                <div key={a.id} className="space-y-2 border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {a.driverName}
                    {a.vanNumber ? <span className="text-gray-500 font-normal"> · Van {a.vanNumber}</span> : null}
                  </p>
                  <p className="text-sm text-gray-700">{a.message}</p>
                  <p className="text-xs text-gray-400">{new Date(a.receivedAt).toLocaleTimeString()}</p>
                  <div className="flex gap-2 pt-1">
                    {a.location && (
                      <a
                        href={`https://maps.google.com/?q=${a.location.lat},${a.location.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium bg-[#1B3B69] text-white rounded-lg py-2"
                      >
                        <MapPin size={15} /> Open location
                      </a>
                    )}
                    {a.tripId && (
                      <a
                        href="/tracking"
                        className="flex-1 inline-flex items-center justify-center text-sm font-medium border border-gray-200 rounded-lg py-2"
                      >
                        Live tracking
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => dismiss(a.id)}
                    className="w-full text-sm font-semibold text-[#DC2626] border border-[#DC2626] rounded-lg py-2 hover:bg-red-50"
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[900] w-[360px] max-w-[calc(100vw-2rem)] space-y-2 print:hidden">
          {toasts.slice(0, 4).map((a) => {
            const s = STYLES[a.kind];
            return (
              <div key={a.id} className="bg-white rounded-xl shadow-lg border-l-4 p-3 flex gap-3" style={{ borderColor: s.color }}>
                <s.Icon size={20} style={{ color: s.color }} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500">{a.driverName}</p>
                  <p className="text-sm text-gray-700 mt-1">{a.message}</p>
                  {a.location && (
                    <a
                      href={`https://maps.google.com/?q=${a.location.lat},${a.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#1B3B69] font-medium inline-flex items-center gap-1 mt-1"
                    >
                      <MapPin size={12} /> Location
                    </a>
                  )}
                </div>
                <button onClick={() => dismiss(a.id)} className="text-gray-400 hover:text-gray-600 self-start" aria-label="Dismiss">
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
