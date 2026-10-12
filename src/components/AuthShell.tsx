'use client';

import { ReactNode } from 'react';
import { ShieldHalf, User } from 'lucide-react';

interface Props {
  badge: string;
  title: string;
  subtitle: string;
  footer?: ReactNode;
  alt?: { prefix: string; label: string; href: string };
  children: ReactNode;
}

/** Shared split-screen layout for the admin, staff and team login pages. */
export default function AuthShell({ badge, title, subtitle, footer, alt, children }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B1B3F]">
      {/* Banner photo: top strip on mobile, left panel on desktop */}
      <div
        className="absolute inset-x-0 top-0 h-64 sm:h-80 lg:inset-y-0 lg:right-auto lg:h-auto lg:w-[64%] bg-cover bg-no-repeat bg-[position:20%_center] lg:bg-[position:left_center]"
        style={{ backgroundImage: "url('/login-bg.jpg')" }}
      />
      <div className="absolute inset-x-0 top-0 h-64 sm:h-80 lg:hidden bg-gradient-to-b from-transparent via-transparent to-[#0B1B3F]" />
      <div className="hidden lg:block absolute inset-y-0 left-[44%] w-[22%] bg-gradient-to-r from-transparent to-[#0B1B3F]" />

      <div className="relative z-10 min-h-screen mx-auto max-w-[1600px] flex flex-col lg:flex-row lg:items-center lg:justify-end">
        {/* Spacer so the card sits below the photo on mobile */}
        <div className="h-44 sm:h-60 lg:hidden" />

        {/* Form card */}
        <div className="flex items-center justify-center px-4 pb-10 lg:w-[40%] lg:p-12">
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
            {alt && (
              <>
                <div className="flex items-center gap-3 my-5 text-[11px] text-gray-400">
                  <span className="flex-1 h-px bg-gray-200" />OR<span className="flex-1 h-px bg-gray-200" />
                </div>
                <a
                  href={alt.href}
                  className="flex items-center justify-center gap-2 w-full py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  <User size={16} className="text-[#1B3B69]" />
                  {alt.prefix} <span className="text-[#1B3B69] font-semibold">{alt.label}</span>
                </a>
              </>
            )}
            {footer && <div className="mt-6 text-center text-xs text-gray-400 space-y-2">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
