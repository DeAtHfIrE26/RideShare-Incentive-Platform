import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

/** The signed-in user, shown once at the foot of the navigation. */
export function UserCard({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  if (!user) return null;

  const initial = (user.fullName || user.username).charAt(0).toUpperCase();

  return (
    <Link
      href="/profile"
      onClick={onNavigate}
      title={collapsed ? (user.fullName ?? user.username) : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-sidebar-accent/50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        collapsed && "justify-center",
      )}
    >
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={user.profileImage || ""} alt="" />
        <AvatarFallback className="bg-primary/10 text-sm">{initial}</AvatarFallback>
      </Avatar>
      {!collapsed && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.fullName || user.username}</p>
          <div className="mt-0.5 flex items-center gap-1">
            <Badge variant="secondary" className="px-1 py-0 text-xs font-normal">
              {user.points ?? 0} pts
            </Badge>
            {user.verifiedDriver && (
              <Badge variant="outline" className="px-1 py-0 text-xs font-normal">
                Driver
              </Badge>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}
