import PageLayout from "@/components/layout/PageLayout";
import RideCard from "@/components/rides/ride-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import type { Ride } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Award, Car, Leaf, Star } from "lucide-react";

/** Shape returned by GET /api/user/stats. */
type UserStats = {
  totalRides: number;
  ridesAsPassenger: number;
  ridesAsDriver: number;
  co2SavedKg: number;
  distanceTraveledKm: number;
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

  const tiles = [
    {
      label: "Rides completed",
      value: stats?.totalRides ?? 0,
      icon: Car,
    },
    {
      label: "Reward points",
      value: stats?.totalRewardPoints ?? 0,
      icon: Award,
    },
    {
      label: "CO2 saved",
      value: `${(stats?.co2SavedKg ?? 0).toFixed(1)} kg`,
      icon: Leaf,
    },
    {
      label: "Average rating",
      value: (stats?.avgRating ?? 0).toFixed(1),
      icon: Star,
    },
  ];

  return (
    <PageLayout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold">
          Welcome back{user?.fullName ? `, ${user.fullName}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your activity and rides picked out for you.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-full bg-primary/10 p-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  {statsLoading ? (
                    <Skeleton className="mt-1 h-6 w-16" />
                  ) : (
                    <p className="text-xl font-semibold">{value}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Recommended rides</CardTitle>
          </CardHeader>
          <CardContent>
            {ridesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
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
