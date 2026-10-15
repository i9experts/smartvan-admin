'use client';

import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, Sparkles, Lock, ServerCog } from 'lucide-react';
import { schoolApi } from '@/lib/api';

interface FeatureAdoption {
  key: string;
  label: string;
  description: string;
  tier: 'basic' | 'premium';
  backendEnforced: boolean;
  schoolCount: number;
  viaOverrideCount: number;
  adoptionPercent: number;
}

export default function AppsModulesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['apps-modules-overview'],
    queryFn: () => schoolApi.getAppsModulesOverview(),
    select: (res) => res.data.data as { totalSchools: number; features: FeatureAdoption[] },
  });

  const features = data?.features ?? [];
  const basicFeatures = features.filter((f) => f.tier === 'basic');
  const premiumFeatures = features.filter((f) => f.tier === 'premium');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3B69] flex items-center gap-2">
          <LayoutGrid size={24} /> Apps &amp; Modules
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Every feature in the platform and how many of {data?.totalSchools ?? 0} institutions can currently reach it.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-8">
          <FeatureSection title="Basic tier (included for every institution)" icon={<ServerCog size={16} className="text-gray-400" />} features={basicFeatures} />
          <FeatureSection title="Premium tier (unlocked via upgrade or override)" icon={<Sparkles size={16} className="text-[#8a6500]" />} features={premiumFeatures} />
        </div>
      )}
    </div>
  );
}

function FeatureSection({ title, icon, features }: { title: string; icon: React.ReactNode; features: FeatureAdoption[] }) {
  if (features.length === 0) return null;
  return (
    <div>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
        {icon} {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => (
          <div key={f.key} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-gray-800">{f.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{f.description}</p>
              </div>
              {!f.backendEnforced && (
                <span title="Not enforced server-side yet" className="shrink-0">
                  <Lock size={13} className="text-gray-300" />
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{f.schoolCount} institutions</span>
                <span className="font-semibold text-gray-700">{f.adoptionPercent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${f.tier === 'premium' ? 'bg-[#FEC610]' : 'bg-[#1B3B69]'}`}
                  style={{ width: `${f.adoptionPercent}%` }}
                />
              </div>
            </div>

            {f.viaOverrideCount > 0 && (
              <p className="text-[11px] text-gray-400">{f.viaOverrideCount} via per-school override</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
