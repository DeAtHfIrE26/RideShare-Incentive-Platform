import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import { ProtectedRoute } from "./lib/protected-route";
import { queryClient } from "./lib/queryClient";

import AboutPage from "@/pages/about-page";
import AuthPage from "@/pages/auth-page";
import ChatPage from "@/pages/chat-page";
import HomePage from "@/pages/home-page";
import NotFound from "@/pages/not-found";
import ProfilePage from "@/pages/profile-page";
import RewardsPage from "@/pages/rewards-page";
import RidesPage from "@/pages/rides-page";
import { SafetyPage } from "@/pages/safety-page";

function Router() {
  return (
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