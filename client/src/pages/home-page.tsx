import PageLayout from "@/components/layout/PageLayout";
import RideCard from "@/components/rides/ride-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Skeleton } from "@/components/ui/skeleton";
import { listItemMotion, MOTION_CLASS, useMotionEnabled } from "@/lib/motion";
import { useAuth } from "@/hooks/use-auth";
import type { Ride } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Award, Car, Leaf, Star } from "lucide-react";

/** Shape returned by GET /api/user/stats. */
type UserStats = {
  totalRides: number;
  ridesAsPassenger: number;
  ridesAsDriver: number;
  /** Emissions the user personally avoided by riding instead of driving. */
  co2SavedKg: number;
  /** Emissions their passengers avoided on rides this user drove. */
  co2EnabledKg: number;
  /** savedKg + enabledKg. Never re-derive this by summing the two elsewhere. */
  co2ImpactKg: number;
  distanceTraveledKm: number;
  /** Completed journeys with no recorded distance, excluded from the figures. */
  ridesWithoutDistance: number;
  emissionFactorKgPerKm: number;
  avgRating: number;
  totalRewardPoints: number;
  safetyVerificationsCompleted: number;
};

export default function HomePage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
  });

  const { data: recommended, isLoading: ridesLoading } = useQuery<Ride[]>({
    queryKey: ["/api/rides/recommended"],
  });

  const motionOn = useMotionEnabled();

  // Each figure counts up to its value rather than appearing, so the change is
  // legible when the stats resolve or are refetched.
  const tiles = [
    {
      label: "Rides completed",
      value: stats?.totalRides ?? 0,
      decimals: 0,
      suffix: "",
      icon: Car,
    },
    {
      label: "Reward points",
      value: stats?.totalRewardPoints ?? 0,
      decimals: 0,
      suffix: "",
      icon: Award,
    },
    {
      // Own savings plus savings enabled for passengers. The two are kept
      // separate in the API so they are never double counted; this tile shows
      // the combined figure and the profile page breaks it down.
      label: "CO2 impact",
      value: stats?.co2ImpactKg ?? 0,
      decimals: 1,
      suffix: " kg",
      icon: Leaf,
    },
    {
      label: "Average rating",
      value: stats?.avgRating ?? 0,
      decimals: 1,
      suffix: "",
      icon: Star,
    },
  ];

  return (
    <PageLayout>
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">
          Welcome back{user?.fullName ? `, ${user.fullName}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your activity and rides picked out for you.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map(({ label, value, decimals, suffix, icon: Icon }, index) => (
            <div key={label} {...listItemMotion(motionOn, index)}>
              <Card className={`h-full ${MOTION_CLASS.liftOnHover}`}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-full bg-primary/10 p-3">
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    {statsLoading ? (
                      <Skeleton className="mt-1 h-7 w-20" />
                    ) : (
                      <p className="text-xl font-semibold tabular-nums">
                        <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recommended rides</CardTitle>
          </CardHeader>
          <CardContent>
            {ridesLoading ? (
              <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
                <Skeleton className="h-[232px] w-full" />
                <Skeleton className="h-[232px] w-full" />
              </div>
            ) : recommended && recommended.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {recommended.map((ride) => (
                  <RideCard key={ride.id} ride={ride} />
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-muted-foreground">
                No recommendations yet. Browse all rides to get started.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
