import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

/**
 * Route wrapper that renders `component` only for a signed-in user.
 * While the session is resolving it shows a spinner; once resolved and absent
 * it redirects to /auth.
 */
export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  // ComponentType rather than a bare function, so a React.lazy() component
  // from the route-level code splitting in App.tsx is accepted.
  component: React.ComponentType;
}) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex min-h-screen items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/auth" />;
        }

        return <Component />;
      }}
    </Route>
  );
}
