'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Lock, Unlock, Sparkles } from 'lucide-react';
import { featureApi, FeatureDef } from '@/lib/api';

interface SchoolFeatureSettings {
  schoolId: string;
  schoolName: string;
  featureTier: 'basic' | 'premium';
  enabledFeatures: string[];
  disabledFeatures: string[];
  effectiveFeatures: string[];
  premiumSubscriptionStatus: 'active' | 'inactive' | 'payment_failed';
  registry: FeatureDef[];
}

export function SchoolFeaturesModal({ schoolId, schoolName, onClose }: { schoolId: string; schoolName: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [pendingTier, setPendingTier] = useState<'basic' | 'premium' | null>(null);
  const [pendingEnabled, setPendingEnabled] = useState<Set<string> | null>(null);
  const [pendingDisabled, setPendingDisabled] = useState<Set<string> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['school-features', schoolId],
    queryFn: () => featureApi.getSchoolFeatures(schoolId),
    select: (res): SchoolFeatureSettings => res.data?.data,
  });

  const tier = pendingTier ?? data?.featureTier ?? 'basic';
  const enabledOverrides = pendingEnabled ?? new Set(data?.enabledFeatures ?? []);
  const disabledOverrides = pendingDisabled ?? new Set(data?.disabledFeatures ?? []);

  const saveMutation = useMutation({
    mutationFn: () => featureApi.updateSchoolFeatureTier(schoolId, {
      featureTier: tier,
      enabledFeatures: Array.from(enabledOverrides),
      disabledFeatures: Array.from(disabledOverrides),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['school-features', schoolId] });
      onClose();
    },
  });

  function tierDefaultHas(key: string, forTier: 'basic' | 'premium', registry: FeatureDef[]) {
    if (forTier === 'premium') return true;
    return registry.find((f) => f.key === key)?.tier === 'basic';
  }

  function toggleFeature(key: string, registry: FeatureDef[]) {
    const defaultOn = tierDefaultHas(key, tier, registry);
    const nextEnabled = new Set(enabledOverrides);
    const nextDisabled = new Set(disabledOverrides);
    const currentlyOn = defaultOn ? !nextDisabled.has(key) : nextEnabled.has(key);

    if (currentlyOn) {
      // Turning off: if it's on by tier default, explicitly disable it;
      // if it's only on via an override, just remove that override.
      if (defaultOn) nextDisabled.add(key); else nextEnabled.delete(key);
    } else {
      if (defaultOn) nextDisabled.delete(key); else nextEnabled.add(key);
    }
    setPendingEnabled(nextEnabled);
    setPendingDisabled(nextDisabled);
  }

  const registry = data?.registry ?? [];
  const basicFeatures = registry.filter((f) => f.tier === 'basic');
  const premiumFeatures = registry.filter((f) => f.tier === 'premium');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1B3B69]">Feature Access</h2>
            <p className="text-xs text-gray-400 mt-0.5">{schoolName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Tier switch */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Tier</p>
              <div className="flex gap-2">
                {(['basic', 'premium'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setPendingTier(t); }}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border transition-colors ${
                      tier === t
                        ? t === 'premium'
                          ? 'bg-[#FEC610]/15 border-[#FEC610] text-[#1B3B69]'
                          : 'bg-[#1B3B69] border-[#1B3B69] text-white'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {t === 'premium' && <Sparkles size={14} className="inline mr-1.5 -mt-0.5" />}
                    {t === 'basic' ? 'Basic' : 'Premium'}
                  </button>
                ))}
              </div>
              {data && (
                <p className="text-xs text-gray-400 mt-2">
                  Stripe subscription: <span className="font-medium text-gray-600">{data.premiumSubscriptionStatus}</span>
                  {data.premiumSubscriptionStatus === 'active' && ' (self-serve — changing the tier here overrides it until the subscription next syncs)'}
                </p>
              )}
            </div>

            {/* Per-feature overrides */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Individual features — hand-tune on top of the tier above
              </p>
              <div className="space-y-1.5">
                {[...basicFeatures, ...premiumFeatures].map((f) => {
                  const defaultOn = tierDefaultHas(f.key, tier, registry);
                  const on = defaultOn ? !disabledOverrides.has(f.key) : enabledOverrides.has(f.key);
                  const overridden = defaultOn ? disabledOverrides.has(f.key) : enabledOverrides.has(f.key);
                  return (
                    <button
                      key={f.key}
                      onClick={() => toggleFeature(f.key, registry)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                        on ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      {on ? <Unlock size={14} className="text-emerald-600 flex-shrink-0" /> : <Lock size={14} className="text-gray-400 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">{f.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${f.tier === 'premium' ? 'bg-[#FEC610]/20 text-[#8a6500]' : 'bg-gray-200 text-gray-500'}`}>
                            {f.tier}
                          </span>
                          {overridden && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">overridden</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{f.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {saveMutation.isError && (
              <div className="text-sm text-red-600">Could not save. Please try again.</div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#1B3B69] text-white text-sm font-semibold hover:bg-[#111d4a] disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
