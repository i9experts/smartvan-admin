import { useQuery } from '@tanstack/react-query';
import { featureApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// A school admin/staff's own effective Basic/Premium feature set — powers
// the sidebar's lock icons and each gated page's paywall. Only admin/
// school_staff accounts have a school to resolve; superadmins see
// everything (the backend's FeatureGuard already lets them through
// unconditionally, so there's nothing to gate on this side either).
export function useFeatures() {
  const { user } = useAuth();
  const enabled = user?.role === 'admin' || user?.role === 'school_staff';

  const { data, isLoading } = useQuery({
    queryKey: ['my-features'],
    queryFn: () => featureApi.getMyFeatures(),
    select: (res) => res.data?.data,
    enabled,
    staleTime: 30_000,
  });

  const effective = new Set(data?.effectiveFeatures ?? []);

  return {
    featureTier: data?.featureTier ?? 'basic',
    premiumSubscriptionStatus: data?.premiumSubscriptionStatus ?? 'inactive',
    effectiveFeatures: effective,
    hasFeature: (key: string) => !enabled || effective.has(key),
    loading: enabled && isLoading,
  };
}
