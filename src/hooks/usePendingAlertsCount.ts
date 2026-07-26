import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// The sidebar's "Alerts Overview" badge and the topbar bell icon both used
// to show a hardcoded literal "3", regardless of what was actually
// happening — this hook gives both a single, real, live count instead.
//
// Driver alerts don't currently have any read/unread concept in the
// backend, so there's no meaningful "needs attention" number to compute
// for them yet — only complaints have a real, well-defined "pending"
// state. limit=1 keeps this cheap: we only need the total count from the
// pagination metadata, not the actual records.
export function usePendingAlertsCount() {
  const { data } = useQuery({
    queryKey: ['pending-complaints-count'],
    queryFn: () => api.get('/report/getComplainsByAdmin', { params: { status: 'pending', limit: 1 } }),
    select: (res) => res.data?.pagination?.total ?? 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return data ?? 0;
}
