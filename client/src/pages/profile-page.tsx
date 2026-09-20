import PageLayout from "@/components/layout/PageLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();

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
    ["CO2 saved", `${(stats?.co2SavedKg ?? 0).toFixed(1)} kg`],
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
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Sign out
            </Button>
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
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
