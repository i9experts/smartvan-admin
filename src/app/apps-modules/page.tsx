'use client';

import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, Sparkles, Lock, ServerCog, Building2 } from 'lucide-react';
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

interface InstitutionFeatureBreakdown {
  schoolId: string;
  schoolName: string;
  featureTier: 'basic' | 'premium';
  premiumFeatureCount: number;
  premiumFeatureKeys: string[];
}

export default function AppsModulesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['apps-modules-overview'],
    queryFn: () => schoolApi.getAppsModulesOverview(),
    select: (res) => res.data.data as { totalSchools: number; features: FeatureAdoption[] },
  });

  const { data: byInstitution, isLoading: isLoadingByInstitution } = useQuery({
    queryKey: ['apps-modules-by-institution'],
    queryFn: () => schoolApi.getAppsModulesByInstitution(),
    select: (res) =>
      res.data.data as { totalSchools: number; totalPremiumFeatures: number; institutions: InstitutionFeatureBreakdown[] },
  });

  const features = data?.features ?? [];
  const basicFeatures = features.filter((f) => f.tier === 'basic');
  const premiumFeatures = features.filter((f) => f.tier === 'premium');
  const labelByKey = Object.fromEntries(features.map((f) => [f.key, f.label]));

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

          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              <Building2 size={16} className="text-gray-400" /> By institution
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Which Premium features each institution currently has access to — entitlement, not confirmed usage (this
              codebase doesn&apos;t yet log when a feature page is actually opened).
            </p>
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              {isLoadingByInstitution ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>
              ) : (byInstitution?.institutions.length ?? 0) === 0 ? (
                <p className="text-xs text-gray-300 text-center py-6">No institutions yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                        <th className="pb-2 font-medium">Institution</th>
                        <th className="pb-2 font-medium">Tier</th>
                        <th className="pb-2 font-medium">Premium features</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byInstitution!.institutions.map((inst) => (
                        <tr key={inst.schoolId} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 text-gray-800 font-medium">{inst.schoolName}</td>
                          <td className="py-2.5">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                inst.featureTier === 'premium' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {inst.featureTier === 'premium' ? 'Premium' : 'Basic'}
                            </span>
                          </td>
                          <td className="py-2.5">
                            {inst.premiumFeatureKeys.length === 0 ? (
                              <span className="text-xs text-gray-300">None</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {inst.premiumFeatureKeys.map((k) => (
                                  <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-[#FEC610]/15 text-[#8a6500]">
                                    {labelByKey[k] || k}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
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
