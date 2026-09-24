import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { MobileNav } from "./mobile-nav";
import { isNavItemActive, NAV_ITEMS } from "./nav-items";

/**
 * The top bar carries the current section and the account actions only.
 *
 * It used to repeat four of the sidebar's destinations, with "Safety" marked
 * active by a hard-coded class so it stayed highlighted on every page. Primary
 * navigation now lives in exactly one place: the rail on desktop, the sheet
 * below lg.
 */
export function Header() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const current = NAV_ITEMS.find((item) => isNavItemActive(item, location));

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <MobileNav />

      {/* The rail carries the wordmark from lg up, so show it only below that. */}
      <Link href="/" className="text-primary lg:hidden">
        <Logo markClassName="h-7 w-7" />
      </Link>

      {current && (
        <h2 className="hidden text-sm font-medium text-muted-foreground lg:block">
          {current.name}
        </h2>
      )}

      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <>
            <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground sm:inline">
              {user.username}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? "Signing out…" : "Sign out"}
            </Button>
          </>
        ) : (
          <Button size="sm" asChild>
            <Link href="/auth">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
