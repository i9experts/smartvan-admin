"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutList, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmployeeSidebar() {
  const pathname = usePathname();

  function logout() {
    localStorage.removeItem('smartvan_token');
    localStorage.removeItem('smartvan_user');
    window.location.href = '/employee-login';
  }

  let user: { name?: string; email?: string } = {};
  if (typeof window !== 'undefined') {
    try { user = JSON.parse(localStorage.getItem('smartvan_user') ?? '{}'); } catch {}
  }

  const active = pathname.startsWith('/employee/tickets');

  return (
    <aside className="w-[190px] bg-white border-r border-sv-border flex flex-col flex-shrink-0 h-screen sticky top-0">
      <div className="px-4 py-[14px] border-b border-sv-border flex items-center justify-center">
        <Image src="/smartvan-logo.png" alt="SmartVan" width={140} height={56} className="object-contain" />
      </div>

      <nav className="flex-1 py-2.5">
        <Link
          href="/employee/tickets"
          className={cn(
            "flex items-center gap-2.5 px-4 py-[9px] text-[12.5px] transition-all",
            active
              ? "bg-sv-navy text-white rounded-lg mx-2 px-3"
              : "text-sv-muted hover:text-sv-text hover:bg-sv-bg"
          )}
        >
          <LayoutList size={16} className="flex-shrink-0" />
          <span className="flex-1 truncate">My Tickets</span>
        </Link>
      </nav>

      <div className="border-t border-sv-border p-3">
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="w-[30px] h-[30px] rounded-full bg-sv-navy flex items-center justify-center text-[11px] font-medium text-white flex-shrink-0">
            {user?.name ? user.name[0].toUpperCase() : "T"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-sv-text truncate">{user?.name || "Team Member"}</div>
            <div className="text-[10px] text-sv-muted truncate">{user?.email || ""}</div>
          </div>
          <button onClick={logout} className="text-sv-muted hover:text-sv-red transition-colors" title="Log out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
