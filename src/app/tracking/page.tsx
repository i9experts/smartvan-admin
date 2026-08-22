'use client';

import dynamic from 'next/dynamic';

// This page is a real-time dashboard (live sockets, Google Maps, constantly
// changing data) — it has no meaningful server-rendered state at all, and
// SSR-ing it was causing hydration mismatches (React errors #418/#423/#425)
// between the server's empty-data render and the client's first real render
// once the trips query and socket connection resolve. Disabling SSR for
// this page entirely sidesteps that whole class of bug.
const LiveTrackingClient = dynamic(() => import('./LiveTrackingClient'), {
  ssr: false,
});

export default function LiveTrackingPage() {
  return <LiveTrackingClient />;
}
