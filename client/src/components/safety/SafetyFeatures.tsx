import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Icons } from "@/components/ui/icons";
import { fetchWithAuth } from "@/lib/auth-fetch";

// Alert type enum matching server-side
export enum AlertType {
  EMERGENCY = "emergency",
  SAFETY_CHECK = "safety_check",
  LOCATION_DEVIATION = "location_deviation",
  DELAYED_ARRIVAL = "delayed_arrival",
  BEHAVIORAL_CONCERN = "behavioral_concern"
}

export function SafetyFeatures({ rideId }: { rideId?: number }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("controls");
  const [selectedAlertType, setSelectedAlertType] = useState<AlertType | null>(null);
  const [alertDetails, setAlertDetails] = useState("");
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  
  // Safety score based on completed verifications, connected contacts, etc.
  const [safetyScore, setSafetyScore] = useState(75);
  
  // Fetch trusted contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ["trusted-contacts"],
    queryFn: async () => {
      const response = await fetchWithAuth("/api/safety/contacts");
      if (!response.ok) throw new Error("Failed to fetch contacts");
      return response.json();
    },
  });
  
  // Fetch safety alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ["safety-alerts"],
    queryFn: async () => {
      const response = await fetchWithAuth("/api/safety/alerts/user");
      if (!response.ok) throw new Error("Failed to fetch alerts");
      return response.json();
    },
  });
  
  // Create safety alert mutation
  const createAlert = useMutation({
    mutationFn: async (data: {
      rideId: number;
      alertType: AlertType;
      details: string;
      latitude?: number;
      longitude?: number;
    }) => {
      const response = await fetchWithAuth("/api/safety/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create alert");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["safety-alerts"] });
      toast({
        title: "Alert Sent",
        description: "Your safety alert has been sent successfully.",
      });
      setAlertDetails("");
      setSelectedAlertType(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Create contact mutation
  const createContact = useMutation({
    mutationFn: async (data: {
      contactName: string;
      contactPhone: string;
      contactEmail?: string;
      relationship: string;
      isEmergencyContact: boolean;
    }) => {
      const response = await fetchWithAuth("/api/safety/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add contact");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trusted-contacts"] });
      toast({
        title: "Contact Added",
        description: "Trusted contact has been added successfully.",
      });
    },
  });
  
  // Generate verification code
  const generateCode = useMutation({
    mutationFn: async (rideId: number) => {
      const response = await fetchWithAuth(`/api/rides/${rideId}/verify-code`, {
        method: "POST",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate code");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setVerificationCode(data.code);
      toast({
        title: "Code Generated",
        description: "Share this code with your driver/passenger to verify identity.",
      });
    },
  });
  
  // Verify code
  const verifyCode = useMutation({
    mutationFn: async ({ rideId, code }: { rideId: number; code: string }) => {
      const response = await fetchWithAuth(`/api/rides/${rideId}/confirm-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Invalid verification code");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verified",
        description: "Ride verification successful! Safety points awarded.",
      });
      setEnteredCode("");
      // Increase safety score
      setSafetyScore((prev) => Math.min(100, prev + 5));
    },
    onError: (error) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle emergency alert
  const handleEmergency = () => {
    if (!rideId) {
      toast({
        title: "Error",
        description: "No active ride found",
        variant: "destructive",
      });
      return;
    }
    
    // Get current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        createAlert.mutate({
          rideId,
          alertType: AlertType.EMERGENCY,
          details: "Emergency assistance requested",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        
        setShowEmergencyDialog(true);
      },
      (error) => {
        console.error("Error getting location:", error);
        createAlert.mutate({
          rideId,
          alertType: AlertType.EMERGENCY,
          details: "Emergency assistance requested (location unavailable)",
        });
        
        setShowEmergencyDialog(true);
      }
    );
  };
  
  // Handle regular alert
  const handleCreateAlert = () => {
    if (!rideId || !selectedAlertType) {
      toast({
        title: "Error",
        description: "Missing ride ID or alert type",
        variant: "destructive",
      });
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        createAlert.mutate({
          rideId,
          alertType: selectedAlertType,
          details: alertDetails,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Error getting location:", error);
        createAlert.mutate({
          rideId,
          alertType: selectedAlertType,
          details: alertDetails,
        });
      }
    );
  };
  
  // Generate code for ride
  const handleGenerateCode = () => {
    if (!rideId) {
      toast({
        title: "Error",
        description: "No active ride found",
        variant: "destructive",
      });
      return;
    }
    
    generateCode.mutate(rideId);
  };
  
  // Verify entered code
  const handleVerifyCode = () => {
    if (!rideId) {
      toast({
        title: "Error",
        description: "No active ride found",
        variant: "destructive",
      });
      return;
    }
    
    verifyCode.mutate({ rideId, code: enteredCode });
  };
  
  // UI for when no ride is active
  if (!rideId) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Safety Features</CardTitle>
          <CardDescription>
            Advanced safety tools for your carpool journeys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Icons.shield className="h-4 w-4" />
              <AlertTitle>No Active Ride</AlertTitle>
              <AlertDescription>
                Safety features are fully available during active rides. Book or start a ride to access all safety tools.
              </AlertDescription>
            </Alert>
            
            <div className="mt-4">
              <Label>Your Safety Score</Label>
              <div className="flex items-center mt-2">
                <Progress value={safetyScore} className="h-2 flex-1" />
                <span className="ml-2 text-sm font-medium">{safetyScore}%</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Complete safety verifications and add trusted contacts to improve your score.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => setActiveTab("contacts")}>
            Manage Trusted Contacts
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Ride Safety Hub</CardTitle>
            <CardDescription>
              Advanced tools to ensure your safe journey
            </CardDescription>
          </div>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleEmergency}
            disabled={createAlert.isPending}
          >
            {createAlert.isPending ? (
              <Icons.spinner className="h-4 w-4 animate-spin" />
            ) : (
              <Icons.alert className="h-4 w-4 mr-2" />
            )}
            Emergency
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="controls">Safety Controls</TabsTrigger>
            <TabsTrigger value="verify">Ride Verification</TabsTrigger>
            <TabsTrigger value="contacts">Trusted Contacts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="controls" className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="alert-type">Alert Type</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant={selectedAlertType === AlertType.SAFETY_CHECK ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setSelectedAlertType(AlertType.SAFETY_CHECK)}
                  >
                    <Icons.checkCircle className="h-4 w-4 mr-2" />
                    Safety Check
                  </Button>
                  <Button
                    variant={selectedAlertType === AlertType.LOCATION_DEVIATION ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setSelectedAlertType(AlertType.LOCATION_DEVIATION)}
                  >
                    <Icons.mapPin className="h-4 w-4 mr-2" />
                    Route Deviation
                  </Button>
                  <Button
                    variant={selectedAlertType === AlertType.DELAYED_ARRIVAL ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setSelectedAlertType(AlertType.DELAYED_ARRIVAL)}
                  >
                    <Icons.clock className="h-4 w-4 mr-2" />
                    Delayed Arrival
                  </Button>
                  <Button
                    variant={selectedAlertType === AlertType.BEHAVIORAL_CONCERN ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setSelectedAlertType(AlertType.BEHAVIORAL_CONCERN)}
                  >
                    <Icons.user className="h-4 w-4 mr-2" />
                    Behavior Concern
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="details">Details</Label>
                <Textarea
                  id="details"
                  placeholder="Provide additional information about your safety concern"
                  className="mt-1"
                  value={alertDetails}
                  onChange={(e) => setAlertDetails(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleCreateAlert} 
                disabled={!selectedAlertType || createAlert.isPending}
              >
                {createAlert.isPending ? (
                  <Icons.spinner className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Icons.bell className="h-4 w-4 mr-2" />
                )}
                Send Alert
              </Button>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-sm font-medium mb-2">Recent Safety Alerts</h3>
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent alerts</p>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert: any) => (
                    <div key={alert.id} className="border rounded-md p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{alert.alertType.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">{alert.details}</p>
                        </div>
                        <Badge variant={alert.status === "active" ? "destructive" : "outline"}>
                          {alert.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="verify" className="space-y-4">
            <Alert>
              <Icons.shield className="h-4 w-4" />
              <AlertTitle>Ride Verification</AlertTitle>
              <AlertDescription>
                Verify your ride by exchanging verification codes with your driver/passenger. 
                This enhances security and earns safety points.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Generate Verification Code</Label>
                {verificationCode ? (
                  <div className="mt-2">
                    <div className="flex items-center justify-center bg-muted p-4 rounded-md">
                      <span className="text-2xl font-bold tracking-widest">{verificationCode}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Share this code with your driver/passenger
                    </p>
                  </div>
                ) : (
                  <Button 
                    onClick={handleGenerateCode} 
                    className="w-full"
                    disabled={generateCode.isPending}
                  >
                    {generateCode.isPending ? (
                      <Icons.spinner className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Icons.qrCode className="h-4 w-4 mr-2" />
                    )}
                    Generate Code
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="verification-code">Enter Verification Code</Label>
                <div className="flex space-x-2">
                  <Input
                    id="verification-code"
                    placeholder="Enter 6-digit code"
                    value={enteredCode}
                    onChange={(e) => setEnteredCode(e.target.value)}
                    maxLength={6}
                  />
                  <Button 
                    onClick={handleVerifyCode}
                    disabled={enteredCode.length !== 6 || verifyCode.isPending}
                  >
                    {verifyCode.isPending ? (
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.check className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <Label>Your Safety Score</Label>
              <div className="flex items-center mt-2">
                <Progress value={safetyScore} className="h-2 flex-1" />
                <span className="ml-2 text-sm font-medium">{safetyScore}%</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Complete safety verifications to improve your score.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="contacts" className="space-y-4">
            <Alert>
              <Icons.users className="h-4 w-4" />
              <AlertTitle>Trusted Contacts</AlertTitle>
              <AlertDescription>
                Add contacts who can be notified in case of emergency. Your emergency contact 
                will automatically receive alerts if you trigger an emergency signal.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium mb-2">Your Trusted Contacts</h3>
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No trusted contacts added yet</p>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact: any) => (
                    <div key={contact.id} className="border rounded-md p-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{contact.contactName}</p>
                        <p className="text-sm text-muted-foreground">{contact.relationship} • {contact.contactPhone}</p>
                      </div>
                      {contact.isEmergencyContact && (
                        <Badge variant="secondary">Emergency Contact</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Icons.plus className="h-4 w-4 mr-2" />
                  Add Trusted Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Trusted Contact</DialogTitle>
                  <DialogDescription>
                    Add someone you trust who can be notified in case of emergency.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createContact.mutate({
                    contactName: formData.get("name") as string,
                    contactPhone: formData.get("phone") as string,
                    contactEmail: formData.get("email") as string,
                    relationship: formData.get("relationship") as string,
                    isEmergencyContact: formData.get("emergency") === "on",
                  });
                }}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" name="phone" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email (Optional)</Label>
                      <Input id="email" name="email" type="email" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="relationship">Relationship</Label>
                      <Input id="relationship" name="relationship" required />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="emergency"
                        name="emergency"
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="emergency" className="text-sm font-normal">
                        Make this my emergency contact
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createContact.isPending}>
                      {createContact.isPending ? (
                        <Icons.spinner className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Save Contact
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Emergency Dialog */}
      <Dialog open={showEmergencyDialog} onOpenChange={setShowEmergencyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-destructive">Emergency Alert Sent</DialogTitle>
            <DialogDescription className="text-center">
              Emergency services have been notified. Stay calm and wait for assistance.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center p-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <Icons.phone className="h-8 w-8 text-destructive" />
            </div>
            <p className="font-medium">Keep your phone accessible</p>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Emergency services and your trusted contacts may try to contact you.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="sm:flex-1" onClick={() => setShowEmergencyDialog(false)}>
              <Icons.x className="h-4 w-4 mr-2" />
              Close Alert
            </Button>
            <Button variant="destructive" className="sm:flex-1">
              <Icons.phone className="h-4 w-4 mr-2" />
              Call Emergency Services
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 