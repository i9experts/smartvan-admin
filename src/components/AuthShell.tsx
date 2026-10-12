'use client';

import { ReactNode } from 'react';
import { MapPin, ShieldCheck, Bell, ShieldHalf, User } from 'lucide-react';

const FEATURES = [
  { icon: MapPin, title: 'Live Tracking', text: 'Know where your fleet is, always.' },
  { icon: ShieldCheck, title: 'Safe Routes', text: 'Safer journeys for every student.' },
  { icon: Bell, title: 'Stay Informed', text: 'Real-time updates & alerts.' },
];

interface Props {
  badge: string;
  title: string;
  subtitle: string;
  footer?: ReactNode;
  alt?: { prefix: string; label: string; href: string };
  children: ReactNode;
}

/** Shared full-screen photo layout for the admin, staff and team login pages. */
export default function AuthShell({ badge, title, subtitle, footer, alt, children }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1B3F]">
      {/* Full-screen photo */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat bg-[position:30%_top] lg:bg-center"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      {/* Navy washes: top for the brand, bottom for the hero text, right for the card */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B1B3F]/70 via-transparent to-[#0B1B3F]" />
      <div className="absolute inset-0 hidden lg:block bg-gradient-to-r from-[#0B1B3F]/50 via-transparent to-[#0B1B3F]/85" />
      <div className="absolute inset-0 lg:hidden bg-[#0B1B3F]/55" />

      <div className="relative z-10 min-h-screen mx-auto max-w-[1500px] flex flex-col lg:flex-row">
        {/* Brand + hero */}
        <div className="flex flex-col justify-between lg:w-[58%] px-6 pt-8 pb-6 lg:px-14 lg:py-12">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shadow-black/30">
              <img src="/smartvan-mark.png" alt="SmartVan" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <p className="text-white text-2xl font-bold leading-none tracking-tight">SmartVan</p>
              <p className="text-[#FEC610] text-xs mt-1 tracking-wide">Track the Van. Stay Informed.</p>
            </div>
          </div>

          <div className="hidden lg:block max-w-xl">
            <p className="inline-flex items-center gap-2 text-[#FEC610] text-[11px] font-semibold tracking-[0.3em] uppercase mb-5">
              <span className="h-px w-8 bg-[#FEC610]" />
              School Transportation Management
            </p>
            <h1 className="text-white text-5xl xl:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Smarter School
              <span className="block bg-gradient-to-r from-[#FEC610] to-[#ffe27a] bg-clip-text text-transparent">
                Transportation
              </span>
            </h1>
            <p className="text-white/80 mt-5 max-w-md text-lg leading-relaxed font-light">
              Safe, connected and informed transportation management for modern schools.
            </p>

            <div className="grid grid-cols-3 gap-5 mt-9 max-w-xl">
              {FEATURES.map(({ icon: Icon, title: t, text }) => (
                <div key={t} className="flex flex-col gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
                    <Icon size={18} className="text-[#FEC610]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{t}</p>
                    <p className="text-white/60 text-xs mt-0.5 leading-snug">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="flex-1 flex items-center justify-center px-4 pb-10 lg:p-12">
          <div className="relative w-full max-w-md rounded-3xl overflow-hidden p-7 sm:p-9 bg-[#0B1B3F]/60 backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/40">
            <div
              className="absolute top-0 right-0 w-16 h-16 bg-[#FEC610]"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/90 text-xs font-medium">
              <ShieldHalf size={13} className="text-[#FEC610]" /> {badge}
            </span>
            <h2 className="text-3xl font-bold text-white mt-4 tracking-tight">{title}</h2>
            <p className="text-white/60 mt-1 mb-6 text-sm">{subtitle}</p>
            {children}
            {alt && (
              <>
                <div className="flex items-center gap-3 my-5 text-[11px] text-white/40">
                  <span className="flex-1 h-px bg-white/15" />OR<span className="flex-1 h-px bg-white/15" />
                </div>
                <a
                  href={alt.href}
                  className="flex items-center justify-center gap-2 w-full py-3 border border-white/20 rounded-xl text-sm text-white/70 hover:bg-white/5 transition"
                >
                  <User size={16} className="text-[#FEC610]" />
                  {alt.prefix} <span className="text-[#FEC610] font-semibold">{alt.label}</span>
                </a>
              </>
            )}
            {footer && <div className="mt-6 text-center text-xs text-white/40 space-y-2">{footer}</div>}
          </div>
        </div>
      </div>

      {/* Keep browser autofill from painting inputs white */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #fff;
          caret-color: #fff;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
}
