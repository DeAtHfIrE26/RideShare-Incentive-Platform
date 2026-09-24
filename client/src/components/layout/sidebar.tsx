import { Logo, LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useUnreadCount } from "@/hooks/use-unread-count";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Link, useLocation } from "wouter";
import { isNavItemActive, NAV_ITEMS } from "./nav-items";
import { NavLink } from "./nav-link";
import { UserCard } from "./user-card";

/**
 * The persistent navigation rail, shown from lg upwards. Below that the same
 * destinations are served by MobileNav as a sheet, so the rail is simply not
 * rendered and no width has to be reserved for it.
 *
 * `collapsed` is owned by PageLayout rather than by this component: when it
 * lived here the content beside the rail kept its ml-64 margin after the rail
 * shrank to 64px, leaving a 192px empty strip down the page.
 */
export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [location] = useLocation();
  const unreadCount = useUnreadCount();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r bg-sidebar transition-[width] duration-200 lg:flex",
        collapsed ? "lg:w-16" : "lg:w-64",
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b px-3",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        {collapsed ? (
          <Link href="/" title="RideShare" className="text-primary">
            <LogoMark className="h-7 w-7" />
          </Link>
        ) : (
          <>
            <Link href="/" className="text-primary">
              <Logo markClassName="h-7 w-7" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              aria-label="Collapse sidebar"
              aria-expanded={true}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center border-b py-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            aria-label="Expand sidebar"
            aria-expanded={false}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        </div>
      )}

      <nav
        aria-label="Main"
        className={cn("flex-1 space-y-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isNavItemActive(item, location)}
            collapsed={collapsed}
            unreadCount={unreadCount}
          />
        ))}
      </nav>

      <div className={cn("shrink-0 border-t p-2", collapsed ? "px-2" : "px-3 py-3")}>
        <UserCard collapsed={collapsed} />
      </div>
    </aside>
  );
}
