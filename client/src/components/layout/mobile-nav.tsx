import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUnreadCount } from "@/hooks/use-unread-count";
import { Menu } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { isNavItemActive, NAV_ITEMS } from "./nav-items";
import { NavLink } from "./nav-link";
import { UserCard } from "./user-card";

/**
 * Navigation below lg. Previously there was none: the rail collapsed to zero
 * width, its toggle was hidden under sm, and the header's links were hidden
 * under md, so a phone had no way to reach any other page.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const unreadCount = useUnreadCount();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-72 flex-col gap-0 bg-sidebar p-0">
        <div className="flex h-16 shrink-0 items-center border-b px-4">
          <SheetTitle className="text-primary">
            <Logo markClassName="h-7 w-7" />
          </SheetTitle>
        </div>
        <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isNavItemActive(item, location)}
              unreadCount={unreadCount}
              onNavigate={() => setOpen(false)}
            />
          ))}
        </nav>
        <div className="shrink-0 border-t px-3 py-3">
          <UserCard onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
