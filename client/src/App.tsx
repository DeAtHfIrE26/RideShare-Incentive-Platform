import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import { ProtectedRoute } from "./lib/protected-route";
import { queryClient } from "./lib/queryClient";
import { routeChunks } from "./lib/route-chunks";

import AboutPage from "@/pages/about-page";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import NotFound from "@/pages/not-found";
import ProfilePage from "@/pages/profile-page";
import RewardsPage from "@/pages/rewards-page";
import RidesPage from "@/pages/rides-page";

/**
 * The safety console and the chat client load on demand.
 *
 * The whole application used to build into a single 414 kB file, so a first
 * visit downloaded both of them, and every other page's code, before it could
 * paint the sign-in form. On a throttled phone that download alone took 2.5s
 * and was the entire LCP. These two are 73 kB of it. The remaining pages stay
 * inline because each is a few kB and a separate chunk would cost a cold deep
 * link more in round trips than it saves in bytes.
 *
 * Both are prefetched on hover by the navigation, and at startup when the URL
 * opens straight onto one, so the split is not felt in use.
 */
// safety-page is a named export, so it needs mapping to a default.
const SafetyPage = lazy(() =>
  routeChunks["/safety"]().then((m) => ({
    default: (m as { SafetyPage: React.ComponentType }).SafetyPage,
  })),
);
const ChatPage = lazy(() => routeChunks["/chat"]() as Promise<{ default: React.ComponentType }>);

/**
 * Shown while a route's chunk is in flight. It fills the viewport so the
 * arriving page does not shift the layout under it.
 */
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/" component={HomePage} />
        <ProtectedRoute path="/rides" component={RidesPage} />
        <ProtectedRoute path="/rewards" component={RewardsPage} />
        <ProtectedRoute path="/safety" component={SafetyPage} />
        <ProtectedRoute path="/chat" component={ChatPage} />
        <ProtectedRoute path="/messages" component={ChatPage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />
        <Route path="/about" component={AboutPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
