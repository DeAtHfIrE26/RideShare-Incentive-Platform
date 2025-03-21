import { storage } from "./storage";
import { WebSocket } from "ws";

// Safety alert types
export enum AlertType {
  EMERGENCY = "emergency",
  SAFETY_CHECK = "safety_check",
  LOCATION_DEVIATION = "location_deviation",
  DELAYED_ARRIVAL = "delayed_arrival",
  BEHAVIORAL_CONCERN = "behavioral_concern"
}

export interface SafetyAlert {
  id?: number;
  userId: number;
  rideId: number;
  alertType: AlertType;
  details: string;
  latitude?: number;
  longitude?: number;
  timestamp: Date;
  status: "active" | "resolved" | "false_alarm";
  resolvedBy?: number;
  resolvedAt?: Date;
}

export interface SafetyZone {
  id?: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  createdBy: number;
  isVerified: boolean;
}

export interface TrustedContact {
  id?: number;
  userId: number;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  relationship: string;
  isEmergencyContact: boolean;
}

// Safety service methods
export const safetyServices = {
  // Create a safety alert
  async createSafetyAlert(alert: Omit<SafetyAlert, "id">): Promise<SafetyAlert> {
    // In a real implementation, this would insert into a safety_alerts table
    // For now we'll mock the response
    const alertWithId = { ...alert, id: Math.floor(Math.random() * 10000) };
    
    // Notify emergency services for EMERGENCY alerts
    if (alert.alertType === AlertType.EMERGENCY) {
      await this.notifyEmergencyServices(alertWithId);
    }
    
    // Create system message for all parties
    const ride = await storage.getRide(alert.rideId);
    if (!ride) throw new Error("Ride not found");
    
    // Notify driver if alert was created by passenger
    if (ride.driverId !== alert.userId) {
      await storage.createMessage({
        senderId: alert.userId,
        receiverId: ride.driverId,
        content: `⚠️ SAFETY ALERT: ${this.getAlertMessage(alert)}`,
        rideId: alert.rideId,
        isRead: false
      });
    }
    
    // Notify trusted contacts
    await this.notifyTrustedContacts(alert.userId, alertWithId);
    
    return alertWithId;
  },
  
  // Resolve a safety alert
  async resolveSafetyAlert(alertId: number, resolvedBy: number): Promise<SafetyAlert> {
    // In a real implementation, this would update the safety_alerts table
    // For now we'll mock the response
    const resolvedAlert = {
      id: alertId,
      userId: 1, // Mock user ID
      rideId: 1, // Mock ride ID
      alertType: AlertType.SAFETY_CHECK,
      details: "Issue resolved",
      timestamp: new Date(),
      status: "resolved" as const,
      resolvedBy,
      resolvedAt: new Date()
    };
    
    return resolvedAlert;
  },
  
  // Notify emergency services (simulated)
  async notifyEmergencyServices(alert: SafetyAlert): Promise<void> {
    console.log(`EMERGENCY SERVICES NOTIFIED: ${JSON.stringify(alert)}`);
    // In a real implementation, this would integrate with emergency services API
  },
  
  // Notify trusted contacts
  async notifyTrustedContacts(userId: number, alert: SafetyAlert): Promise<void> {
    // In a real implementation, this would fetch trusted contacts and notify them
    console.log(`Notifying trusted contacts for user ${userId} about alert ${alert.id}`);
  },
  
  // Add a trusted contact
  async addTrustedContact(contact: Omit<TrustedContact, "id">): Promise<TrustedContact> {
    // Mock implementation
    return { ...contact, id: Math.floor(Math.random() * 10000) };
  },
  
  // Get user's trusted contacts
  async getTrustedContacts(userId: number): Promise<TrustedContact[]> {
    // Mock implementation
    return [
      {
        id: 1,
        userId,
        contactName: "Emergency Contact",
        contactPhone: "+1234567890",
        relationship: "Family",
        isEmergencyContact: true
      }
    ];
  },
  
  // Register a safe zone
  async registerSafetyZone(zone: Omit<SafetyZone, "id">): Promise<SafetyZone> {
    // Mock implementation
    return { ...zone, id: Math.floor(Math.random() * 10000) };
  },
  
  // Get nearby safety zones
  async getNearbyZones(latitude: number, longitude: number, radiusKm: number): Promise<SafetyZone[]> {
    // Mock implementation
    return [
      {
        id: 1,
        name: "University Campus",
        description: "Well-lit, 24/7 security patrol",
        latitude: latitude + 0.01,
        longitude: longitude - 0.01,
        radiusMeters: 500,
        createdBy: 1,
        isVerified: true
      }
    ];
  },
  
  // Generate safety verification code for ride
  async generateRideSafetyCode(rideId: number): Promise<string> {
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // In a real implementation, store this code with the ride
    return code;
  },
  
  // Verify ride safety code
  async verifyRideSafetyCode(rideId: number, code: string): Promise<boolean> {
    // In a real implementation, verify against stored code
    return true; // Mock success
  },

  // Helper method to get human-readable alert message
  getAlertMessage(alert: SafetyAlert): string {
    switch (alert.alertType) {
      case AlertType.EMERGENCY:
        return "Emergency alert triggered. Emergency services have been notified.";
      case AlertType.SAFETY_CHECK:
        return "Safety check requested. Please respond to confirm your safety.";
      case AlertType.LOCATION_DEVIATION:
        return "Vehicle has deviated from expected route. Please verify with driver.";
      case AlertType.DELAYED_ARRIVAL:
        return "Arrival significantly delayed. System monitoring situation.";
      case AlertType.BEHAVIORAL_CONCERN:
        return "Behavioral concern reported. Stay vigilant and report any issues.";
      default:
        return "Safety alert triggered. Please take appropriate precautions.";
    }
  },
  
  // Broadcast safety alerts to connected WebSocket clients
  broadcastSafetyAlert(wss: WebSocketServer, alert: SafetyAlert): void {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'safety_alert',
          data: alert
        }));
      }
    });
  }
};

// Define WebSocketServer interface (missing in the import)
interface WebSocketServer {
  clients: Set<WebSocket>;
} 