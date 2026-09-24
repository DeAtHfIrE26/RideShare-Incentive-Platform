import { useQuery } from "@tanstack/react-query";

/**
 * Unread message count for the navigation badge. One query key, so the desktop
 * rail and the mobile sheet share a single poll rather than opening one each.
 */
export function useUnreadCount(): number {
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread"],
    refetchInterval: 30000,
  });
  return data?.count ?? 0;
}
