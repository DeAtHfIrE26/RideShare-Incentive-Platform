import PageLayout from "@/components/layout/PageLayout";
import RideCard from "@/components/rides/ride-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Ride } from "@shared/schema";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

const PAGE_SIZE = 20;

/** Shape returned by the paginated /api/rides endpoint. */
type RidePage = {
  items: Ride[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

const EMPTY_RIDE = {
  origin: "",
  destination: "",
  departureTime: "",
  seatsAvailable: "1",
  price: "0",
  distanceKm: "",
  carModel: "",
  carColor: "",
  licensePlate: "",
};

function RideGrid({ rides, loading }: { rides?: Ride[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (!rides || rides.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">No rides here yet.</p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rides.map((ride) => (
        <RideCard key={ride.id} ride={ride} />
      ))}
    </div>
  );
}

export default function RidesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_RIDE);

  // /api/rides is paginated; pages are appended as the user asks for more
  // rather than the whole table arriving at once.
  const all = useInfiniteQuery<RidePage>({
    queryKey: ["/api/rides"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const res = await apiRequest(
        "GET",
        `/api/rides?limit=${PAGE_SIZE}&offset=${pageParam as number}`,
      );
      return res.json();
    },
    getNextPageParam: (last) =>
      last.hasMore ? last.offset + last.items.length : undefined,
  });

  const allRides = all.data?.pages.flatMap((page) => page.items) ?? [];
  const totalRides = all.data?.pages[0]?.total ?? 0;
  const active = useQuery<Ride[]>({ queryKey: ["/api/rides/active"] });

  const createRide = useMutation({
    mutationFn: async () => {
      // insertRideSchema expects numbers for seats and price, and a future
      // departureTime; the datetime-local value is sent as an ISO string.
      const res = await apiRequest("POST", "/api/rides", {
        origin: form.origin,
        destination: form.destination,
        departureTime: new Date(form.departureTime).toISOString(),
        seatsAvailable: Number(form.seatsAvailable),
        price: Number(form.price),
        // Optional: left out entirely when blank, so the ride is excluded from
        // emissions statistics rather than carrying an invented distance.
        distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined,
        carModel: form.carModel || undefined,
        carColor: form.carColor || undefined,
        licensePlate: form.licensePlate || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rides/active"] });
      toast({ title: "Ride published" });
      setForm(EMPTY_RIDE);
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Could not publish ride",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const field = (key: keyof typeof EMPTY_RIDE) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <PageLayout>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Rides</h1>
            <p className="mt-1 text-muted-foreground">
              Browse open rides or publish one of your own.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Offer a ride
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Offer a ride</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  createRide.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="origin">Origin</Label>
                  <Input id="origin" required maxLength={100} {...field("origin")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <Input
                    id="destination"
                    required
                    maxLength={100}
                    {...field("destination")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departureTime">Departure time</Label>
                  <Input
                    id="departureTime"
                    type="datetime-local"
                    required
                    {...field("departureTime")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="seatsAvailable">Seats</Label>
                    <Input
                      id="seatsAvailable"
                      type="number"
                      min={1}
                      max={8}
                      required
                      {...field("seatsAvailable")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      {...field("price")}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="distanceKm">Distance (km)</Label>
                  <Input
                    id="distanceKm"
                    type="number"
                    min={1}
                    max={5000}
                    step="1"
                    placeholder="Optional"
                    {...field("distanceKm")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for CO2 and distance statistics. Left blank, this ride
                    is excluded from them rather than estimated.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="carModel">Car model</Label>
                    <Input id="carModel" {...field("carModel")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carColor">Car colour</Label>
                    <Input id="carColor" {...field("carColor")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">Licence plate</Label>
                  <Input id="licensePlate" {...field("licensePlate")} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createRide.isPending}>
                    {createRide.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Publish
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all" className="mt-6">
          <TabsList>
            <TabsTrigger value="all">All rides</TabsTrigger>
            <TabsTrigger value="active">My active rides</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Open rides</CardTitle>
              </CardHeader>
              <CardContent>
                <RideGrid rides={allRides} loading={all.isLoading} />
                {all.hasNextPage && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => all.fetchNextPage()}
                      disabled={all.isFetchingNextPage}
                    >
                      {all.isFetchingNextPage && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Load more
                    </Button>
                  </div>
                )}
                {allRides.length > 0 && (
                  <p className="mt-3 text-center text-sm text-muted-foreground">
                    Showing {allRides.length} of {totalRides}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="active" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Active rides</CardTitle>
              </CardHeader>
              <CardContent>
                <RideGrid rides={active.data} loading={active.isLoading} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
