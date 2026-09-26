import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/route-chunks";
import { Link } from "wouter";
import type { NavItem } from "./nav-items";

/**
 * A single navigation row.
 *
 * wouter 3 renders its own <a>, so the child must not be another one. The
 * previous markup wrapped every Link in an <a>, producing nested anchors
 * (invalid HTML, and the inner one carried no href so it was invisible to
 * keyboard navigation and to middle-click).
 */
export function NavLink({
  item,
  active,
  collapsed = false,
  unreadCount = 0,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  collapsed?: boolean;
  unreadCount?: number;
  onNavigate?: () => void;
}) {
  const showBadge = item.badge === "unread" && unreadCount > 0;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      onMouseEnter={() => prefetchRoute(item.href)}
      onFocus={() => prefetchRoute(item.href)}
      onTouchStart={() => prefetchRoute(item.href)}
      title={collapsed ? item.name : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60",
      )}
    >
      <span className="relative flex shrink-0 items-center">
        <item.icon className="h-4 w-4" />
        {collapsed && showBadge && (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-2 w-2 rounded-full bg-destructive"
            aria-hidden="true"
          />
        )}
      </span>
      {!collapsed && (
        <>
          <span className="truncate">{item.name}</span>
          {showBadge && (
            <Badge
              variant="destructive"
              className="ml-auto flex h-5 min-w-5 items-center justify-center px-1 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </>
      )}
      {collapsed && showBadge && <span className="sr-only">{unreadCount} unread</span>}
    </Link>
  );
}
