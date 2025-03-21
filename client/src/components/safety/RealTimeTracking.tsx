import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, ArrowLeft, Clock, MapPin, Navigation, Phone, Shield, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";

interface RealTimeTrackingProps {
  rideId: number;
  isDriver: boolean;
  onBack: () => void;
}

interface Location {
  latitude: number;
  longitude: number;
  updatedAt: string;
}

interface RideDetails {
  id: number;
  origin: string;
  destination: string;
  departureTime: string;
  driverName: string;
  driverId: number;
  carModel?: string;
  carColor?: string;
  licensePlate?: string;
  status: string;
  estimatedArrival: string;
  currentLocation?: Location;
  progress: number;
  distance: string;
  duration: string;
  passengerCount: number;
}

export function RealTimeTracking({ rideId, isDriver, onBack }: RealTimeTrackingProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rideDetails, setRideDetails] = useState<RideDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [emergencyType, setEmergencyType] = useState<'emergency' | 'locationDeviation' | 'delay' | 'behavior' | null>(null);
  
  useEffect(() => {
    // Fetch initial ride details
    const fetchRideDetails = async () => {
      try {
        const response = await apiRequest('GET', `/api/rides/${rideId}/details`);
        if (!response.ok) {
          throw new Error("Failed to load ride details");
        }
        const data = await response.json();
        setRideDetails(data);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load ride details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchRideDetails();
    
    // Set up websocket connection for real-time updates
    const socket = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`);
    
    socket.onopen = () => {
      console.log("WebSocket connected");
      socket.send(JSON.stringify({
        type: "subscribe",
        channel: `ride_${rideId}`,
        userId: user?.id,
      }));
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "location_update") {
        setRideDetails(prev => prev ? { ...prev, currentLocation: data.location, progress: data.progress } : prev);
      } else if (data.type === "eta_update") {
        setRideDetails(prev => prev ? { ...prev, estimatedArrival: data.eta, duration: data.duration } : prev);
      } else if (data.type === "ride_status") {
        setRideDetails(prev => prev ? { ...prev, status: data.status } : prev);
      }
    };
    
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };
    
    // Cleanup function
    return () => {
      socket.close();
    };
  }, [rideId, user, toast]);
  
  const startRide = async () => {
    try {
      const response = await apiRequest('POST', `/api/rides/${rideId}/start`, {});
      if (!response.ok) {
        throw new Error("Failed to start ride");
      }
      
      setIsTracking(true);
      // Mock position tracking
      startLocationTracking();
      
      toast({
        title: "Ride started",
        description: "Real-time tracking is now active",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start ride",
        variant: "destructive",
      });
    }
  };
  
  const startLocationTracking = () => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Send location update to server
          apiRequest('POST', `/api/rides/${rideId}/location`, {
            latitude,
            longitude,
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            title: "Location error",
            description: "Unable to track location. Please enable location services.",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000
        }
      );
    } else {
      toast({
        title: "Location not supported",
        description: "Your browser does not support geolocation",
        variant: "destructive",
      });
    }
  };
  
  const triggerSafetyAlert = async (alertType: string, details?: string) => {
    try {
      const response = await apiRequest('POST', '/api/safety/alert', {
        rideId,
        alertType,
        details: details || '',
      });
      
      if (!response.ok) {
        throw new Error("Failed to send safety alert");
      }
      
      toast({
        title: "Alert sent",
        description: "Your safety alert has been sent successfully",
      });
      
      setEmergencyType(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send safety alert",
        variant: "destructive",
      });
    }
  };
  
  const sendEmergencyAlert = () => {
    triggerSafetyAlert('emergency', 'Emergency button triggered by user');
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">Real-Time Ride Tracking</h2>
      </div>
      
      {rideDetails && (
        <>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Ride #{rideDetails.id}</CardTitle>
                  <CardDescription>
                    {new Date(rideDetails.departureTime).toLocaleString()}
                  </CardDescription>
                </div>
                <Badge variant={
                  rideDetails.status === 'in_progress' ? "default" :
                  rideDetails.status === 'completed' ? "success" :
                  rideDetails.status === 'cancelled' ? "destructive" : "outline"
                }>
                  {rideDetails.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">From</div>
                    <div className="font-medium">{rideDetails.origin}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">To</div>
                    <div className="font-medium">{rideDetails.destination}</div>
                  </div>
                </div>
              </div>
              
              {!isDriver && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="font-medium mb-1">Driver Information</div>
                  <div className="text-sm">{rideDetails.driverName}</div>
                  {rideDetails.carModel && (
                    <div className="text-sm mt-2">
                      {rideDetails.carModel} {rideDetails.carColor && `(${rideDetails.carColor})`}
                      {rideDetails.licensePlate && ` • License: ${rideDetails.licensePlate}`}
                    </div>
                  )}
                </div>
              )}
              
              {rideDetails.currentLocation && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="text-sm">Trip Progress</div>
                    <Progress value={rideDetails.progress} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">ETA</div>
                      <div className="font-medium flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(rideDetails.estimatedArrival).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-sm text-muted-foreground">Remaining</div>
                      <div className="font-medium">{rideDetails.duration}</div>
                    </div>
                  </div>
                  
                  <div className="aspect-[16/9] relative bg-muted rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Navigation className="h-8 w-8 text-primary animate-pulse" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50"></div>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="bg-background/80 backdrop-blur-sm p-2 rounded text-sm">
                        Last updated: {new Date(rideDetails.currentLocation.updatedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              {isDriver && rideDetails.status === 'pending' && (
                <Button onClick={startRide} className="w-full">
                  Start Ride
                </Button>
              )}
              
              {rideDetails.status === 'in_progress' && (
                <div className="grid grid-cols-2 gap-2 w-full">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline">
                        <Phone className="h-4 w-4 mr-2" />
                        Contact
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Contact Options</SheetTitle>
                        <SheetDescription>
                          Reach out to {isDriver ? "passenger" : "driver"} or support
                        </SheetDescription>
                      </SheetHeader>
                      <div className="space-y-4 mt-6">
                        <Button className="w-full">
                          Call {isDriver ? "Passenger" : "Driver"}
                        </Button>
                        <Button variant="outline" className="w-full">
                          Send Message
                        </Button>
                        <Button variant="outline" className="w-full">
                          Contact Support
                        </Button>
                      </div>
                    </SheetContent>
                  </Sheet>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Emergency
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Emergency Assistance</AlertDialogTitle>
                        <AlertDialogDescription>
                          What type of help do you need? For immediate police assistance, please call 911 directly.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="grid grid-cols-2 gap-3 py-4">
                        <Button
                          variant="destructive"
                          className="h-auto py-3 flex flex-col"
                          onClick={() => setEmergencyType('emergency')}
                        >
                          <AlertCircle className="h-6 w-6 mb-1" />
                          <span>Emergency</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto py-3 flex flex-col"
                          onClick={() => setEmergencyType('locationDeviation')}
                        >
                          <MapPin className="h-6 w-6 mb-1" />
                          <span>Route Deviation</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto py-3 flex flex-col"
                          onClick={() => setEmergencyType('delay')}
                        >
                          <Clock className="h-6 w-6 mb-1" />
                          <span>Excessive Delay</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="h-auto py-3 flex flex-col"
                          onClick={() => setEmergencyType('behavior')}
                        >
                          <Shield className="h-6 w-6 mb-1" />
                          <span>Safety Concern</span>
                        </Button>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  
                  {emergencyType === 'emergency' && (
                    <AlertDialog open={true} onOpenChange={() => setEmergencyType(null)}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Emergency Alert</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will send an emergency alert to our support team and trusted contacts. Emergency services may be contacted if necessary.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={sendEmergencyAlert}>Send Emergency Alert</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  {emergencyType === 'locationDeviation' && (
                    <AlertDialog open={true} onOpenChange={() => setEmergencyType(null)}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Route Deviation Alert</AlertDialogTitle>
                          <AlertDialogDescription>
                            If the vehicle is not following the expected route, we'll notify the driver and monitor the situation.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => triggerSafetyAlert('location_deviation', 'Vehicle deviating from expected route')}>
                            Report Deviation
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  {emergencyType === 'delay' && (
                    <AlertDialog open={true} onOpenChange={() => setEmergencyType(null)}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excessive Delay</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will flag significant delays in the journey for monitoring.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => triggerSafetyAlert('delayed_arrival', 'Significant delay in journey')}>
                            Report Delay
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  
                  {emergencyType === 'behavior' && (
                    <AlertDialog open={true} onOpenChange={() => setEmergencyType(null)}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Safety Concern</AlertDialogTitle>
                          <AlertDialogDescription>
                            Report inappropriate behavior or other safety concerns during your ride.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => triggerSafetyAlert('behavioral_concern', 'Safety concern with ride participant')}>
                            Report Concern
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
              
              {rideDetails.status === 'completed' && (
                <div className="w-full text-center p-3 bg-green-50 text-green-700 rounded-lg">
                  <ThumbsUp className="h-5 w-5 mx-auto mb-2" />
                  <p>Ride completed successfully!</p>
                </div>
              )}
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
} 