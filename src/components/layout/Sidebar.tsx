"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  LayoutDashboard, MapPin, School, Bus, Users, Route,
  Bell, BarChart3, Receipt, Wrench, Settings, LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";

const navItems: { labelKey: string; href: string; icon: any; badge?: number; superadminOnly?: boolean }[] = [
  { labelKey: "nav.overview", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.liveTracking", href: "/tracking", icon: MapPin },
  { labelKey: "nav.studentManagement", href: "/students", icon: School },
  { labelKey: "nav.vanDriverMgmt", href: "/vans", icon: Bus },
  { labelKey: "nav.parentManagement", href: "/parents", icon: Users },
  { labelKey: "nav.routePlanner", href: "/routes", icon: Route },
  { labelKey: "nav.alertsOverview", href: "/alerts", icon: Bell, badge: 3 },
  { labelKey: "nav.analytics", href: "/analytics", icon: BarChart3 },
  { labelKey: "nav.billing", href: "/billing", icon: Receipt, superadminOnly: true },
  { labelKey: "nav.fleetManagement", href: "/fleet", icon: Wrench },
  { labelKey: "nav.attendance", href: "/attendance", icon: Users },
  { labelKey: "nav.feeManagement", href: "/fees", icon: Users },
  { labelKey: "nav.schoolLeads", href: "/leads", icon: Users, superadminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user: admin, logout } = useAuth();
  const { t, isRTL } = useLanguage();

  return (
    <aside className="w-[190px] bg-white border-r border-sv-border flex flex-col flex-shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-[14px] border-b border-sv-border flex items-center justify-center">
        <Image src="/smartvan-logo.png" alt="SmartVan" width={140} height={56} className="object-contain" />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2.5 overflow-y-auto scrollbar-hide">
        {navItems.filter(item => !item.superadminOnly || admin?.role === "superadmin").map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-4 py-[9px] text-[12.5px] transition-all",
                active
                  ? "bg-sv-navy text-white rounded-lg mx-2 px-3"
                  : "text-sv-muted hover:text-sv-text hover:bg-sv-bg"
              )}
            >
              <item.icon size={16} className="flex-shrink-0" />
              <span className="flex-1 truncate">{t(item.labelKey)}</span>
              {item.badge && !active && (
                <span className="bg-sv-red text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user + settings + logout */}
      <div className="border-t border-sv-border p-3 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-2 text-[12px] text-sv-muted hover:text-sv-text hover:bg-sv-bg rounded-lg transition-all"
        >
          <Settings size={15} />
          Settings
        </Link>
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-[30px] h-[30px] rounded-full bg-sv-navy flex items-center justify-center text-[11px] font-medium text-white flex-shrink-0">
            {admin?.name ? admin.name[0].toUpperCase() : "A"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-sv-text truncate">
              {admin?.name || "Admin"}
            </div>
            <div className="text-[10px] text-sv-muted truncate">
              {admin?.role === "superadmin" ? "Super Admin" : "Administrator"}
            </div>
          </div>
          <button
            onClick={logout}
            className="text-sv-muted hover:text-sv-red transition-colors"
            title="Log out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
