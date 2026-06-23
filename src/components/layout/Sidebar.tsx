"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, MapPin, School, Bus, Users, Route,
  Bell, BarChart3, Receipt, Wrench, Settings, LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Live Tracking", href: "/tracking", icon: MapPin },
  { label: "Student Management", href: "/students", icon: School },
  { label: "Van & Driver Mgmt", href: "/vans", icon: Bus },
  { label: "Parent Management", href: "/parents", icon: Users },
  { label: "Route Planner", href: "/routes", icon: Route },
  { label: "Alerts Overview", href: "/alerts", icon: Bell, badge: 3 },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Billing", href: "/billing", icon: Receipt, superadminOnly: true },
  { label: "Fleet Management", href: "/fleet", icon: Wrench },
  { label: "Attendance", href: "/attendance", icon: Users },
  { label: "School Leads", href: "/leads", icon: Users, superadminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user: admin, logout } = useAuth();

  return (
    <aside className="w-[190px] bg-white border-r border-sv-border flex flex-col flex-shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-[18px] border-b border-sv-border flex items-center gap-2.5">
        <div className="w-[38px] h-[38px] rounded-[10px] bg-sv-yellow flex items-center justify-center flex-shrink-0">
          <Bus size={22} className="text-sv-text" />
        </div>
        <div>
          <div className="text-[13px] font-medium text-sv-text">SmartVan</div>
          <div className="text-[9px] text-sv-muted">Safe Kids, Every Ride</div>
        </div>
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
              <span className="flex-1 truncate">{item.label}</span>
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
