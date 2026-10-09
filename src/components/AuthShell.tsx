'use client';

import { ReactNode } from 'react';
import { MapPin, ShieldCheck, Bell, ShieldHalf } from 'lucide-react';

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
  children: ReactNode;
}

/** Shared split-screen layout for the admin, staff and team login pages. */
export default function AuthShell({ badge, title, subtitle, footer, children }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1B3F]">
      <div
        className="absolute inset-y-0 inset-x-0 bg-cover bg-[center_85%] bg-no-repeat lg:bg-[position:center_bottom] lg:inset-x-[22%] lg:[mask-image:linear-gradient(to_right,transparent,#000_30%,#000_70%,transparent)] lg:[-webkit-mask-image:linear-gradient(to_right,transparent,#000_30%,#000_70%,transparent)]"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B1B3F] via-[#0B1B3F]/70 to-[#0B1B3F]/20" />

      <div className="relative z-10 min-h-screen mx-auto max-w-[1400px] flex flex-col lg:flex-row lg:items-center">
        {/* Brand / hero */}
        <div className="flex flex-col justify-between lg:min-h-screen lg:w-1/2 px-6 pt-8 pb-6 lg:px-14 lg:py-12">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg">
              <img src="/smartvan-mark.png" alt="SmartVan" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <p className="text-white text-2xl font-bold leading-none">SmartVan</p>
              <p className="text-white/70 text-xs mt-1">Track the Van. Stay Informed.</p>
            </div>
          </div>

          <div className="hidden lg:block">
            <p className="text-white/80 text-xs tracking-[0.3em] uppercase mb-4">School Transportation Management</p>
            <h1 className="text-white text-5xl font-bold leading-tight">
              Smarter School
              <span className="block text-[#FEC610]">Transportation</span>
            </h1>
            <p className="text-white/85 mt-5 max-w-sm text-lg leading-relaxed">
              Safe, connected and informed transportation management for modern schools.
            </p>
          </div>

          <div className="hidden lg:grid grid-cols-3 gap-4 max-w-xl">
            {FEATURES.map(({ icon: Icon, title: t, text }) => (
              <div key={t} className="flex gap-3 items-start">
                <div className="w-10 h-10 shrink-0 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                  <Icon size={18} className="text-[#FEC610]" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{t}</p>
                  <p className="text-white/60 text-xs mt-0.5">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="flex-1 flex items-center justify-center px-4 pb-10 lg:p-12">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-7 sm:p-9">
            <div
              className="absolute top-0 right-0 w-16 h-16 bg-[#FEC610]"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1B3B69] text-xs font-medium">
              <ShieldHalf size={13} /> {badge}
            </span>
            <h2 className="text-3xl font-bold text-[#0B1B3F] mt-4">{title}</h2>
            <p className="text-gray-500 mt-1 mb-6 text-sm">{subtitle}</p>
            {children}
            {footer && <div className="mt-6 text-center text-xs text-gray-400 space-y-2">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
