import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/">
            <a className="flex items-center gap-2 font-bold text-xl text-primary">
              <Icons.shield className="h-6 w-6" />
              <span>CarpoolRewards</span>
            </a>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-1">
          <Link href="/">
            <a className="px-3 py-2 rounded-md text-sm hover:bg-muted">Home</a>
          </Link>
          <Link href="/rides">
            <a className="px-3 py-2 rounded-md text-sm hover:bg-muted">Rides</a>
          </Link>
          <Link href="/rewards">
            <a className="px-3 py-2 rounded-md text-sm hover:bg-muted">Rewards</a>
          </Link>
          <Link href="/safety">
            <a className="px-3 py-2 rounded-md text-sm font-medium bg-primary/10 text-primary">Safety</a>
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm hidden md:inline-block">
                {user.username}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-sm"
              >
                Sign out
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <a>
                <Button size="sm">Sign in</Button>
              </a>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
} 