"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  LayoutDashboard, MapPin, School, Bus, Users, Route,
  Bell, BarChart3, Receipt, Wrench, Settings, LogOut, MessageSquare, History,
  Image as ImageIcon, AlertTriangle, HelpCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { usePendingAlertsCount } from "@/hooks/usePendingAlertsCount";

const navItems: { labelKey: string; href: string; icon: any; roles: ("admin" | "superadmin")[]; permission?: string }[] = [
  { labelKey: "nav.overview", href: "/super-admin", icon: LayoutDashboard, roles: ["superadmin"] },
  { labelKey: "nav.overview", href: "/dashboard", icon: LayoutDashboard, roles: ["admin"], permission: "view_dashboard" },
  { labelKey: "nav.liveTracking", href: "/tracking", icon: MapPin, roles: ["admin"] },
  { labelKey: "nav.studentManagement", href: "/students", icon: School, roles: ["admin"], permission: "manage_students" },
  { labelKey: "nav.vanDriverMgmt", href: "/vans", icon: Bus, roles: ["admin"], permission: "manage_fleet" },
  { labelKey: "nav.driverAccounts", href: "/drivers", icon: Users, roles: ["admin"], permission: "manage_fleet" },
  { labelKey: "nav.parentManagement", href: "/parents", icon: Users, roles: ["admin"], permission: "manage_parents" },
  { labelKey: "nav.routePlanner", href: "/routes", icon: Route, roles: ["admin"], permission: "manage_routes" },
  { labelKey: "nav.alertsOverview", href: "/alerts", icon: Bell, roles: ["admin"], permission: "view_alerts" },
  { labelKey: "nav.complaints", href: "/complaints", icon: AlertTriangle, roles: ["admin"], permission: "manage_complaints" },
  { labelKey: "nav.analytics", href: "/analytics", icon: BarChart3, roles: ["admin"], permission: "view_analytics" },
  { labelKey: "nav.billing", href: "/billing", icon: Receipt, roles: ["admin"] },
  { labelKey: "nav.fleetManagement", href: "/fleet", icon: Wrench, roles: ["admin"], permission: "view_fleet_health" },
  { labelKey: "nav.attendance", href: "/attendance", icon: Users, roles: ["admin"], permission: "view_attendance" },
  { labelKey: "nav.feeManagement", href: "/fees", icon: Users, roles: ["admin"], permission: "manage_fees" },
  { labelKey: "nav.team", href: "/team", icon: Users, roles: ["admin"] },
  { labelKey: "nav.support", href: "/support", icon: HelpCircle, roles: ["admin"] },
  { labelKey: "nav.schoolLeads", href: "/leads", icon: Users, roles: ["superadmin"] },
  { labelKey: "nav.banners", href: "/banners", icon: ImageIcon, roles: ["superadmin"] },
  { labelKey: "nav.employees", href: "/employees", icon: Users, roles: ["superadmin"] },
  { labelKey: "nav.tickets", href: "/tickets", icon: MessageSquare, roles: ["superadmin"] },
  { labelKey: "nav.auditLog", href: "/audit-log", icon: History, roles: ["superadmin"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user: admin, logout } = useAuth();
  const { t, isRTL } = useLanguage();
  const pendingAlertsCount = usePendingAlertsCount();

  return (
    <aside className="w-[190px] bg-white dark:bg-[var(--sv-card-bg)] border-r border-sv-border dark:border-[var(--sv-border)] flex flex-col flex-shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-[14px] border-b border-sv-border dark:border-[var(--sv-border)] flex items-center justify-center">
        <Image src="/smartvan-logo.png" alt="SmartVan" width={140} height={56} className="object-contain" />
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2.5 overflow-y-auto scrollbar-hide">
        {navItems.filter(item => {
          if (admin?.role === "school_staff") {
            // Staff only ever see items explicitly delegable via a
            // permission (Team, Billing, Settings, Support, Live
            // Tracking, and every superadmin-only item are never shown
            // regardless of what's granted).
            return item.roles.includes("admin") && !!item.permission && (admin?.permissions ?? []).includes(item.permission);
          }
          return item.roles.includes((admin?.role as "admin" | "superadmin") ?? "admin");
        }).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-4 py-[9px] text-[12.5px] transition-all",
                active
                  ? "bg-sv-navy text-white rounded-lg mx-2 px-3"
                  : "text-sv-muted hover:text-sv-text hover:bg-sv-bg dark:hover:bg-white/5"
              )}
            >
              <item.icon size={16} className="flex-shrink-0" />
              <span className="flex-1 truncate">{t(item.labelKey)}</span>
              {item.href === '/alerts' && pendingAlertsCount > 0 && !active && (
                <span className="bg-sv-red text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                  {pendingAlertsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user + settings + logout */}
      <div className="border-t border-sv-border dark:border-[var(--sv-border)] p-3 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-2 text-[12px] text-sv-muted hover:text-sv-text hover:bg-sv-bg dark:hover:bg-white/5 rounded-lg transition-all"
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
