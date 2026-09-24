import PageLayout from "@/components/layout/PageLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

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

export default function ProfilePage() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
  });

  const initials = (user?.fullName || user?.username || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const rows: Array<[string, string | number]> = [
    ["Rides completed", stats?.totalRides ?? 0],
    ["As passenger", stats?.ridesAsPassenger ?? 0],
    ["As driver", stats?.ridesAsDriver ?? 0],
    ["Distance travelled", `${(stats?.distanceTraveledKm ?? 0).toFixed(1)} km`],
    ["CO2 avoided by riding", `${(stats?.co2SavedKg ?? 0).toFixed(1)} kg`],
    ["CO2 avoided by your passengers", `${(stats?.co2EnabledKg ?? 0).toFixed(1)} kg`],
    ["Total CO2 impact", `${(stats?.co2ImpactKg ?? 0).toFixed(1)} kg`],
    ["Average rating", (stats?.avgRating ?? 0).toFixed(1)],
    ["Reward points", stats?.totalRewardPoints ?? 0],
    ["Safety verifications", stats?.safetyVerificationsCompleted ?? 0],
  ];

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Profile</h1>

        <Card className="mt-6">
          <CardContent className="flex flex-wrap items-center gap-4 p-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-medium">
                {user?.fullName || user?.username}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {user?.email}
              </p>
              {user?.phoneNumber && (
                <p className="text-sm text-muted-foreground">
                  {user.phoneNumber}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {user?.verifiedDriver && <Badge>Verified driver</Badge>}
                {user?.identityVerified && (
                  <Badge variant="secondary">Identity verified</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <dl className="space-y-1">
                {rows.map(([label, value], index) => (
                  <div key={label}>
                    {index > 0 && <Separator className="my-1" />}
                    <div className="flex items-center justify-between py-2">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            )}
            {!isLoading && (stats?.ridesWithoutDistance ?? 0) > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                {stats?.ridesWithoutDistance} completed journey
                {(stats?.ridesWithoutDistance ?? 0) === 1 ? " has" : "s have"} no
                recorded distance and{" "}
                {(stats?.ridesWithoutDistance ?? 0) === 1 ? "is" : "are"} excluded
                from the distance and CO2 figures above. Emissions are calculated
                at {stats?.emissionFactorKgPerKm} kg CO2e per vehicle-kilometre.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
