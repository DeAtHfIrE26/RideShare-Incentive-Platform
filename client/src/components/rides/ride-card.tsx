import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Ride } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertCircle, Calendar, Clock, CreditCard, MapPin, Users } from "lucide-react";
import { useState } from "react";

interface RideCardProps {
  ride: Ride;
}

export default function RideCard({ ride }: RideCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [seatsToBook, setSeatsToBook] = useState(1);

  const bookingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bookings", {
        rideId: ride.id,
        seats: seatsToBook,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to book ride");
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      // Invalidate and refetch rides data to update UI
      queryClient.invalidateQueries({ queryKey: ["/api/rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      
      toast({
        title: "Booking successful",
        description: data.message || "You have successfully booked this ride.",
      });
      setIsBookingDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isDriver = ride.driverId === user?.id;
  const isAvailable = ride.status !== "full" && ride.seatsAvailable > 0;
  const isFull = ride.seatsAvailable === 0 || ride.status === "full";
  const isPending = ride.status === "pending";
  const isCompleted = ride.status === "completed";
  const isCancelled = ride.status === "cancelled";
  
  // Calculate if the departure time is in the past
  const isDeparted = new Date(ride.departureTime) < new Date();

  const getStatusBadge = () => {
    if (isFull) return <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">Full</Badge>;
    if (isCompleted) return <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">Completed</Badge>;
    if (isCancelled) return <Badge variant="destructive" className="ml-2">Cancelled</Badge>;
    if (isDeparted) return <Badge variant="outline" className="ml-2">Departed</Badge>;
    if (isPending) return <Badge variant="secondary" className="ml-2">Available</Badge>;
    return null;
  };

  const handleBookClick = () => {
    if (!isAvailable || isFull) {
      toast({
        title: "Ride is full",
        description: "This ride has no available seats.",
        variant: "destructive",
      });
      return;
    }
    
    if (isDeparted) {
      toast({
        title: "Ride has departed",
        description: "This ride has already departed.",
        variant: "destructive",
      });
      return;
    }
    
    setSeatsToBook(1);
    setIsBookingDialogOpen(true);
  };

  return (
    <>
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  From
                </div>
                <p className="font-medium">{ride.origin}</p>
              </div>
              <div className="space-y-1 text-right">
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-end">
                  <MapPin className="h-4 w-4" />
                  To
                </div>
                <p className="font-medium">{ride.destination}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(ride.departureTime), "MMM d, h:mm a")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {ride.seatsAvailable} {ride.seatsAvailable === 1 ? "seat" : "seats"} left
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">${Number(ride.price).toFixed(2)}</span>
                {getStatusBadge()}
              </div>
            </div>
            
            {ride.carModel && (
              <div className="text-sm text-muted-foreground pt-2 border-t">
                <span className="font-medium">Car:</span> {ride.carModel} {ride.carColor && `(${ride.carColor})`}
                {ride.licensePlate && ` • License: ${ride.licensePlate}`}
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          {isDriver ? (
            <Button variant="outline" className="w-full" disabled>
              Your Ride
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={!isAvailable || bookingMutation.isPending || isFull || isCompleted || isCancelled || isDeparted}
              onClick={handleBookClick}
            >
              {bookingMutation.isPending
                ? "Booking..."
                : isAvailable
                ? "Book Now"
                : isFull
                ? "Fully Booked"
                : isCompleted
                ? "Completed"
                : isDeparted
                ? "Departed"
                : "Unavailable"}
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book a Ride</DialogTitle>
            <DialogDescription>
              You are booking a ride from {ride.origin} to {ride.destination}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="seats" className="text-right">
                Seats
              </Label>
              <Input
                id="seats"
                type="number"
                min={1}
                max={ride.seatsAvailable}
                value={seatsToBook}
                onChange={(e) => setSeatsToBook(Math.min(ride.seatsAvailable, Math.max(1, parseInt(e.target.value) || 1)))}
                className="col-span-3"
              />
            </div>
            
            {ride.seatsAvailable < 2 && (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Only 1 seat available</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Price per seat:</span>
              <span className="font-medium">${Number(ride.price).toFixed(2)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Total price:</span>
              <span className="font-medium">${(Number(ride.price) * seatsToBook).toFixed(2)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Departure: {format(new Date(ride.departureTime), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBookingDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => bookingMutation.mutate()} 
              disabled={bookingMutation.isPending}
            >
              {bookingMutation.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
