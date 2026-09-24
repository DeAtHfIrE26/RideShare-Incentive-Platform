import PageLayout from "@/components/layout/PageLayout";
import { RealTimeTracking } from "@/components/safety/RealTimeTracking";
import { SafetyFeatures } from "@/components/safety/SafetyFeatures";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import type { Ride } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useState } from "react";
import { formatStatus } from "@/lib/status";

export function SafetyPage() {
  const { user } = useAuth();
  const [trackingRideId, setTrackingRideId] = useState<number | null>(null);

  const { data: activeRides, isLoading } = useQuery<Ride[]>({
    queryKey: ["/api/rides/active"],
  });

  const trackedRide = activeRides?.find((ride) => ride.id === trackingRideId);

  if (trackingRideId !== null) {
    return (
      <PageLayout showFooter={false}>
        <div className="p-4 sm:p-6">
          <RealTimeTracking
            rideId={trackingRideId}
            isDriver={trackedRide?.driverId === user?.id}
            onBack={() => setTrackingRideId(null)}
          />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">Safety</h1>
        <p className="mt-1 text-muted-foreground">
          Trusted contacts, alerts, and live tracking for your active rides.
        </p>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Track an active ride</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : activeRides && activeRides.length > 0 ? (
              <div className="space-y-2">
                {activeRides.map((ride) => (
                  <div
                    key={ride.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {ride.origin} to {ride.destination}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatStatus(ride.status, "Scheduled")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTrackingRideId(ride.id)}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Track
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-muted-foreground">
                No active rides to track.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <SafetyFeatures />
        </div>
      </div>
    </PageLayout>
  );
}

export default SafetyPage;
