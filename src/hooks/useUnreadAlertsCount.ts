import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export const ALERTS_UNREAD_KEY = ['alerts-unread'];

/**
 * Real unread count for the Alerts badge (sidebar + topbar bell): school
 * alerts newer than when this user last opened the Alerts page.
 * Refreshed every 30 s and whenever a live safety alert arrives.
 *
 * This is called unconditionally from the Sidebar for every authenticated
 * role, but the underlying count is inherently school-scoped — a
 * superadmin isn't scoped to one school, so skip the call rather than
 * firing a request the backend can't meaningfully answer.
 */
export function useUnreadAlertsCount(): number {
  const { user } = useAuth();
  const enabled = user?.role === 'admin' || user?.role === 'school_staff';

  const { data } = useQuery({
    queryKey: ALERTS_UNREAD_KEY,
    queryFn: () => api.get('/alert/admin/unreadCount'),
    select: (res: any) => (res.data?.data?.unread as number) ?? 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: false,
    enabled,
  });
  return enabled ? (data ?? 0) : 0;
}

/** Clears the badge for this user (called when the Alerts page is open). */
export function useMarkAlertsSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/alert/admin/markSeen'),
    onMutate: () => {
      // Badge goes to 0 straight away.
      qc.setQueryData(ALERTS_UNREAD_KEY, { data: { data: { unread: 0 } } });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ALERTS_UNREAD_KEY }),
  });
}
