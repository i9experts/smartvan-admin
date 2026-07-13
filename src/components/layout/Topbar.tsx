"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, Search, School as SchoolIcon, Users, UserCircle, Bus, MessageSquare, Building2, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { searchApi } from "@/lib/api";

interface TopbarProps {
  title?: string;
}

interface SearchResults {
  students: { id: string; label: string; sub?: string }[];
  parents: { id: string; label: string; sub?: string }[];
  drivers: { id: string; label: string; sub?: string }[];
  vans: { id: string; label: string; sub?: string }[];
  tickets: { id: string; label: string; sub?: string }[];
  schools: { id: string; label: string; sub?: string }[];
  employees: { id: string; label: string; sub?: string }[];
}

const CATEGORY_META: Record<string, { label: string; icon: any; path: string }> = {
  students: { label: "Students", icon: SchoolIcon, path: "/students" },
  parents: { label: "Parents", icon: Users, path: "/parents" },
  drivers: { label: "Drivers", icon: UserCircle, path: "/drivers" },
  vans: { label: "Vans", icon: Bus, path: "/vans" },
  tickets: { label: "Tickets", icon: MessageSquare, path: "/tickets" },
  schools: { label: "Schools", icon: Building2, path: "/super-admin" },
  employees: { label: "Employees", icon: Users, path: "/employees" },
};

export function Topbar({ title }: TopbarProps) {
  const { user: admin } = useAuth();
  const { language, setLanguage } = useLanguage();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchApi.universal(query.trim());
        setResults(res.data?.data ?? null);
      } catch {
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goTo(category: string) {
    setIsOpen(false);
    setQuery("");
    router.push(CATEGORY_META[category].path);
  }

  const hasResults = results && Object.values(results).some((arr) => arr.length > 0);

  return (
    <header className="h-[50px] bg-white dark:bg-[var(--sv-card-bg)] border-b border-sv-border dark:border-[var(--sv-border)] flex items-center px-5 gap-3 flex-shrink-0 sticky top-0 z-20">
      <div ref={containerRef} className="relative flex-1 max-w-[340px]">
        <div className="flex items-center gap-2 bg-sv-bg dark:bg-[var(--sv-bg)] rounded-lg px-3 py-[7px] text-[12px] text-sv-muted border border-sv-border dark:border-[var(--sv-border)]">
          <Search size={14} className="shrink-0" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search students, vans, drivers…"
            className="flex-1 bg-transparent outline-none text-sv-text dark:text-gray-200 placeholder:text-sv-muted"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults(null); }} className="shrink-0 text-sv-muted hover:text-sv-text">
              <X size={13} />
            </button>
          )}
        </div>

        {isOpen && query.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[var(--sv-card-bg)] border border-sv-border dark:border-[var(--sv-border)] rounded-xl shadow-lg max-h-[70vh] overflow-y-auto z-30">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-sv-muted">Searching…</div>
            ) : !hasResults ? (
              <div className="p-4 text-center text-xs text-sv-muted">No results for "{query}"</div>
            ) : (
              <div className="py-1.5">
                {Object.entries(results!).map(([category, items]) => {
                  if (!items || items.length === 0) return null;
                  const meta = CATEGORY_META[category];
                  const Icon = meta.icon;
                  return (
                    <div key={category} className="px-1.5">
                      <p className="px-2.5 py-1 text-[10px] font-semibold text-sv-muted uppercase tracking-wider">{meta.label}</p>
                      {items.map((item: any) => (
                        <button
                          key={item.id}
                          onClick={() => goTo(category)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-sv-bg dark:hover:bg-white/5 transition text-left"
                        >
                          <Icon size={14} className="text-sv-muted shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12.5px] text-sv-text dark:text-gray-200 truncate">{item.label}</p>
                            {item.sub && <p className="text-[11px] text-sv-muted truncate">{item.sub}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {title && (
        <span className="text-[13px] font-medium text-sv-text ml-2">{title}</span>
      )}
      <div className="ml-auto flex items-center gap-2.5">
        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1.5 px-2.5 py-1 border border-gray-200 dark:border-[var(--sv-border)] rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition"
        >
          {language === 'en' ? '🇸🇦 العربية' : '🇬🇧 English'}
        </button>
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
