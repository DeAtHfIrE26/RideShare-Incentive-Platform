import { Award, Car, Home, Info, MessageSquare, Shield, User } from "lucide-react";

export type NavItem = {
  name: string;
  href: string;
  icon: React.FC<{ className?: string }>;
  /** Extra paths that should light this item up, e.g. an alias route. */
  activePaths?: string[];
  /** Shows the unread-message count next to this item. */
  badge?: "unread";
};

/**
 * The one definition of the primary navigation. The desktop rail and the
 * mobile sheet both render from this, so the two can no longer drift apart —
 * previously the sidebar listed seven destinations and the header listed a
 * different four.
 */
export const NAV_ITEMS: NavItem[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Rides", href: "/rides", icon: Car },
  { name: "Messages", href: "/chat", icon: MessageSquare, activePaths: ["/messages"], badge: "unread" },
  { name: "Rewards", href: "/rewards", icon: Award },
  { name: "Safety", href: "/safety", icon: Shield },
  { name: "Profile", href: "/profile", icon: User },
  { name: "About", href: "/about", icon: Info },
];

export function isNavItemActive(item: NavItem, location: string): boolean {
  return location === item.href || (item.activePaths?.includes(location) ?? false);
}
