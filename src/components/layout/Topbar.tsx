"use client";
import { Bell, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { user: admin } = useAuth();

  return (
    <header className="h-[50px] bg-white border-b border-sv-border flex items-center px-5 gap-3 flex-shrink-0 sticky top-0 z-20">
      <div className="flex-1 max-w-[340px] flex items-center gap-2 bg-sv-bg rounded-lg px-3 py-[7px] text-[12px] text-sv-muted border border-sv-border">
        <Search size={14} />
        <span>Search…</span>
      </div>

      {title && (
        <span className="text-[13px] font-medium text-sv-text ml-2">{title}</span>
      )}

      <div className="ml-auto flex items-center gap-2.5">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 text-[11px] text-sv-muted">
          <span className="w-[7px] h-[7px] rounded-full bg-sv-green animate-pulse" />
          Live
        </div>

        {/* Alerts bell */}
        <Link href="/alerts" className="relative text-sv-muted hover:text-sv-text transition-colors">
          <Bell size={18} />
          <span className="absolute -top-0.5 -right-1 bg-sv-red text-white text-[9px] font-medium min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-1">
            3
          </span>
        </Link>



        {/* Avatar */}
        <div className="w-[30px] h-[30px] rounded-full bg-sv-navy flex items-center justify-center text-[11px] font-medium text-white">
          {admin?.name ? admin.name[0].toUpperCase() : "A"}
        </div>
      </div>
    </header>
  );
}
