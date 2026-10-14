import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const ALERTS_UNREAD_KEY = ['alerts-unread'];

/**
 * Real unread count for the Alerts badge (sidebar + topbar bell): school
 * alerts newer than when this user last opened the Alerts page.
 * Refreshed every 30 s and whenever a live safety alert arrives.
 */
export function useUnreadAlertsCount(): number {
  const { data } = useQuery({
    queryKey: ALERTS_UNREAD_KEY,
    queryFn: () => api.get('/alert/admin/unreadCount'),
    select: (res: any) => (res.data?.data?.unread as number) ?? 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: false,
  });
  return data ?? 0;
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
