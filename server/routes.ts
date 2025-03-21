import {
  insertBookingSchema,
  insertRideSchema,
  insertSafetyAlertSchema,
  insertSafetyZoneSchema,
  insertTrustedContactSchema
} from "@shared/schema";
import { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { setupAuth } from "./auth";
import { AlertType, safetyServices } from "./safetyServices";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Ride routes
  app.post("/api/rides", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const rideData = insertRideSchema.parse(req.body);
      
      // Validate departure time is in the future
      const departureTime = new Date(rideData.departureTime);
      if (departureTime <= new Date()) {
        return res.status(400).json({ error: "Departure time must be in the future" });
      }

      const ride = await storage.createRide({
        origin: rideData.origin,
        destination: rideData.destination,
        departureTime,
        seatsAvailable: rideData.seatsAvailable,
        price: rideData.price.toString(),
        driverId: req.user.id,
        status: "pending",
        routeDetails: "",
        estimatedDuration: "",
        carModel: rideData.carModel || null,
        carColor: rideData.carColor || null,
        licensePlate: rideData.licensePlate || null,
        preferences: rideData.preferences || null
      });

      // Create notification for potential riders
      if (ride.id) {
        await storage.createMessage({
          senderId: req.user.id,
          receiverId: req.user.id,
          content: `New ride available from ${ride.origin} to ${ride.destination}`,
          rideId: ride.id,
          isRead: false
        });
      }

      res.status(201).json(ride);
    } catch (error: any) {
      console.error("Ride creation error:", error);
      if (error.errors) {
        // Zod validation error
        res.status(400).json({ error: error.errors[0].message });
      } else {
        res.status(400).json({ error: "Invalid ride data. Please check all fields and try again." });
      }
    }
  });

  app.get("/api/rides", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rides = await storage.listRides();
    res.json(rides);
  });

  // Booking routes with enhanced features
  app.post("/api/bookings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const bookingData = insertBookingSchema.parse(req.body);
      
      // Check if ride exists and has enough seats
      const ride = await storage.getRide(bookingData.rideId ?? 0);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      // Check if ride has already departed
      if (new Date(ride.departureTime) < new Date()) {
        return res.status(400).json({ 
          error: "This ride has already departed" 
        });
      }
      
      // Check if ride is cancelled
      if (ride.status === "cancelled") {
        return res.status(400).json({ 
          error: "This ride has been cancelled" 
        });
      }
      
      // Check if ride is full
      if (ride.status === "full" || ride.seatsAvailable === 0) {
        return res.status(400).json({ 
          error: "This ride is fully booked" 
        });
      }
      
      // Check if user is trying to book their own ride
      if (ride.driverId === req.user.id) {
        return res.status(400).json({ 
          error: "You cannot book your own ride" 
        });
      }
      
      // Check if user has already booked this ride
      const existingBookings = await storage.listUserBookings(req.user.id);
      const alreadyBooked = existingBookings.some(
        booking => booking.rideId === ride.id && booking.status !== "cancelled"
      );
      
      if (alreadyBooked) {
        return res.status(400).json({ 
          error: "You have already booked this ride" 
        });
      }
      
      if (ride.seatsAvailable < bookingData.seats) {
        return res.status(400).json({ 
          error: `Not enough seats available. Only ${ride.seatsAvailable} seats left.` 
        });
      }
      
      // Create the booking
      const booking = await storage.createBooking({
        rideId: bookingData.rideId ?? 0,
        userId: req.user.id,
        seats: bookingData.seats,
        status: "confirmed", // Change from pending to confirmed
        paymentStatus: "pending",
        specialRequests: bookingData.specialRequests || null,
        pickupLocation: bookingData.pickupLocation || null,
        dropoffLocation: bookingData.dropoffLocation || null
      });

      // Update ride's available seats
      const updatedRide = await storage.updateRideSeats(ride.id, bookingData.seats);

      // Award points for booking
      await storage.updateUserPoints(req.user.id, 10);

      // Create reward record
      const reward = await storage.createReward({
        userId: req.user.id,
        type: "booking",
        points: 10,
        description: "Booked a ride",
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });

      // Get user information for notification
      const booker = await storage.getUser(req.user.id);
      const bookerName = booker?.fullName || booker?.username || "A user";

      // Notify the driver via WebSocket
      if (ride && ride.driverId) {
        const message = await storage.createMessage({
          senderId: req.user.id,
          receiverId: ride.driverId,
          content: `${bookerName} has booked ${bookingData.seats} seat(s) for your ride from ${ride.origin} to ${ride.destination}. You can contact them to coordinate.`,
          rideId: ride.id,
          isRead: false
        });

        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'notification',
              message: message
            }));
          }
        });
      }

      res.status(201).json({ 
        booking, 
        reward,
        ride: updatedRide,
        message: `Successfully booked ${bookingData.seats} seat(s). The driver will be notified.`
      });
    } catch (error: any) {
      console.error("Booking error:", error);
      res.status(400).json({ error: error.message || "Invalid booking data" });
    }
  });

  app.get("/api/bookings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const bookings = await storage.listUserBookings(req.user.id);
    res.json(bookings);
  });

  // Messages with real-time notifications
  app.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const messages = await storage.listUserMessages(req.user.id);
    res.json(messages);
  });

  app.get("/api/messages/unread", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const count = await storage.getUnreadMessageCount(req.user.id);
    res.json({ count });
  });

  app.post("/api/messages/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const messageId = parseInt(req.params.id);
      if (isNaN(messageId)) {
        return res.status(400).json({ error: "Invalid message ID" });
      }
      
      const message = await storage.markMessageAsRead(messageId);
      res.json(message);
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  });

  // Rewards routes
  app.get("/api/rewards", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rewards = await storage.listUserRewards(req.user.id);
    res.json(rewards);
  });

  // Safety routes
  app.post("/api/safety/alerts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const alertData = insertSafetyAlertSchema.parse(req.body);
      
      const alert = await safetyServices.createSafetyAlert({
        userId: req.user.id,
        rideId: alertData.rideId ?? 0,
        alertType: alertData.alertType as AlertType,
        details: alertData.details || "",
        latitude: alertData.latitude as number | undefined,
        longitude: alertData.longitude as number | undefined,
        timestamp: new Date(),
        status: "active"
      });

      // Broadcast alert to all connected clients for real-time notifications
      safetyServices.broadcastSafetyAlert(wss, alert);
      
      res.status(201).json(alert);
    } catch (error: any) {
      console.error("Safety alert creation error:", error);
      res.status(400).json({ error: error.message || "Invalid safety alert data" });
    }
  });

  app.get("/api/safety/alerts/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // In a real implementation, this would fetch alerts from the database
      // For now, return mock data
      const alerts = [
        {
          id: 1,
          userId: req.user.id,
          rideId: 1,
          alertType: AlertType.SAFETY_CHECK,
          details: "Routine safety check",
          timestamp: new Date(),
          status: "resolved",
          resolvedAt: new Date()
        }
      ];
      
      res.json(alerts);
    } catch (error: any) {
      console.error("Error fetching safety alerts:", error);
      res.status(500).json({ error: "Failed to fetch safety alerts" });
    }
  });

  app.post("/api/safety/alerts/:id/resolve", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const alertId = parseInt(req.params.id);
      if (isNaN(alertId)) {
        return res.status(400).json({ error: "Invalid alert ID" });
      }
      
      const resolvedAlert = await safetyServices.resolveSafetyAlert(alertId, req.user.id);
      res.json(resolvedAlert);
    } catch (error: any) {
      console.error("Error resolving safety alert:", error);
      res.status(500).json({ error: "Failed to resolve safety alert" });
    }
  });

  // Trusted contacts management
  app.post("/api/safety/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const contactData = insertTrustedContactSchema.parse(req.body);
      
      const contact = await safetyServices.addTrustedContact({
        userId: req.user.id,
        contactName: contactData.contactName,
        contactPhone: contactData.contactPhone,
        contactEmail: contactData.contactEmail,
        relationship: contactData.relationship,
        isEmergencyContact: contactData.isEmergencyContact || false
      });
      
      // If marked as emergency contact, update user's emergency contact ID
      if (contact.isEmergencyContact && contact.id) {
        await storage.updateUserProfile(req.user.id, {
          emergencyContactId: contact.id
        });
      }
      
      res.status(201).json(contact);
    } catch (error: any) {
      console.error("Trusted contact creation error:", error);
      res.status(400).json({ error: error.message || "Invalid contact data" });
    }
  });

  app.get("/api/safety/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const contacts = await safetyServices.getTrustedContacts(req.user.id);
      res.json(contacts);
    } catch (error: any) {
      console.error("Error fetching trusted contacts:", error);
      res.status(500).json({ error: "Failed to fetch trusted contacts" });
    }
  });

  // Safety zones management
  app.post("/api/safety/zones", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const zoneData = insertSafetyZoneSchema.parse(req.body);
      
      const zone = await safetyServices.registerSafetyZone({
        name: zoneData.name,
        description: zoneData.description || "",
        latitude: zoneData.latitude as number,
        longitude: zoneData.longitude as number,
        radiusMeters: zoneData.radiusMeters as number,
        createdBy: req.user.id,
        isVerified: false
      });
      
      res.status(201).json(zone);
    } catch (error: any) {
      console.error("Safety zone creation error:", error);
      res.status(400).json({ error: error.message || "Invalid zone data" });
    }
  });

  app.get("/api/safety/zones/nearby", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { latitude, longitude, radius } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }
      
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const rad = parseFloat(radius as string) || 5; // Default 5km radius
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }
      
      const zones = await safetyServices.getNearbyZones(lat, lng, rad);
      res.json(zones);
    } catch (error: any) {
      console.error("Error fetching nearby safety zones:", error);
      res.status(500).json({ error: "Failed to fetch nearby safety zones" });
    }
  });

  // Ride verification code for safety
  app.post("/api/rides/:id/verify-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const rideId = parseInt(req.params.id);
      if (isNaN(rideId)) {
        return res.status(400).json({ error: "Invalid ride ID" });
      }
      
      const code = await safetyServices.generateRideSafetyCode(rideId);
      
      // Store the verification code
      await storage.createRideVerification(rideId, req.user.id, code);
      
      res.json({ code });
    } catch (error: any) {
      console.error("Error generating verification code:", error);
      res.status(500).json({ error: "Failed to generate verification code" });
    }
  });

  app.post("/api/rides/:id/confirm-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const rideId = parseInt(req.params.id);
      if (isNaN(rideId)) {
        return res.status(400).json({ error: "Invalid ride ID" });
      }
      
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Verification code is required" });
      }
      
      const verified = await storage.verifyRideCode(rideId, code);
      
      if (verified) {
        // In a real implementation, this would update the ride_verifications table
        // For now, we'll just return success
        
        // Award safety points to both driver and passenger
        await storage.updateUserPoints(req.user.id, 5);
        
        // Create reward record
        await storage.createReward({
          userId: req.user.id,
          type: "safety_verification",
          points: 5,
          description: "Verified ride with safety code",
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        });
        
        res.json({ success: true, message: "Ride verification successful" });
      } else {
        res.status(400).json({ success: false, error: "Invalid verification code" });
      }
    } catch (error: any) {
      console.error("Error verifying code:", error);
      res.status(500).json({ error: "Failed to verify code" });
    }
  });

  // Enhanced ride tracking API endpoints
  app.post("/api/rides/:id/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const rideId = parseInt(req.params.id);
    const userId = req.user.id;
    
    try {
      const ride = await storage.getRide(rideId ?? 0);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      if (ride.driverId !== userId) {
        return res.status(403).json({ error: "Only the driver can start this ride" });
      }
      
      if (ride.status !== "pending") {
        return res.status(400).json({ error: `Cannot start a ride in ${ride.status} status` });
      }
      
      // Update ride status
      const updatedRide = await storage.updateRideStatus(rideId, "in_progress");
      
      // Create a ride start notification
      const bookings = await storage.listRideBookings(rideId);
      
      // Notify all passengers
      for (const booking of bookings) {
        if (booking.status === "confirmed") {
          await storage.createMessage({
            senderId: userId,
            receiverId: booking.userId,
            content: `Your ride from ${ride.origin} to ${ride.destination} has started. Track in real-time!`,
            rideId,
            isRead: false
          });
        }
      }
      
      // Broadcast to connected WebSocket clients
      wss.clients.forEach((client) => {
        // @ts-ignore - client.userId is custom property set on connection
        if (client.readyState === WebSocket.OPEN && client.userId) {
          client.send(JSON.stringify({
            type: "ride_status",
            rideId,
            status: "in_progress"
          }));
        }
      });
      
      res.json(updatedRide);
    } catch (error) {
      console.error("Error starting ride:", error);
      res.status(500).json({ error: "Failed to start ride" });
    }
  });

  app.post("/api/rides/:id/location", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const rideId = parseInt(req.params.id);
    const userId = req.user.id;
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }
    
    try {
      const ride = await storage.getRide(rideId ?? 0);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      // Store location update
      await storage.storeLocationUpdate(rideId, userId, latitude, longitude);
      
      // Calculate progress and ETA (simulated here)
      // In a production app, you would calculate these based on actual route,
      // distance, and average speed or use a routing API like Google Maps
      const progress = Math.min(100, Math.random() * 70 + 10); // Random progress, in real app would be calculated
      
      const now = new Date();
      const estimatedArrivalTime = new Date(now.getTime() + Math.floor(Math.random() * 30 + 15) * 60000);
      
      // Calculate duration in minutes
      const durationMinutes = Math.floor((estimatedArrivalTime.getTime() - now.getTime()) / 60000);
      
      // Broadcast location update to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "location_update",
            rideId,
            location: {
              latitude,
              longitude,
              updatedAt: new Date().toISOString()
            },
            progress
          }));
          
          client.send(JSON.stringify({
            type: "eta_update",
            rideId,
            eta: estimatedArrivalTime.toISOString(),
            duration: `${durationMinutes} min` 
          }));
        }
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating location:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  // Define a middleware to check authentication
  const requireAuthMiddleware = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    next();
  };

  app.get("/api/rides/:id/details", requireAuthMiddleware, async (req: any, res) => {
    const rideId = parseInt(req.params.id);
    
    try {
      const ride = await storage.getRide(rideId ?? 0);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      const driver = await storage.getUser(ride.driverId ?? 0);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      
      // Get last location update
      const lastLocation = await storage.getLastLocationUpdate(rideId);
      
      // Count confirmed bookings for passenger count
      const bookings = await storage.listRideBookings(rideId);
      const passengerCount = bookings.filter((b: any) => b.status === "confirmed").reduce((sum: number, b: any) => sum + b.seats, 0);
      
      // Mock distance and duration for testing
      // In a real app, these would be calculated using a mapping API
      const distance = "8.5 km";
      const duration = "15 min";
      
      const rideDetails = {
        id: ride.id,
        origin: ride.origin,
        destination: ride.destination,
        departureTime: ride.departureTime,
        driverName: driver.fullName || driver.username,
        driverId: driver.id,
        carModel: ride.carModel,
        carColor: ride.carColor,
        licensePlate: ride.licensePlate,
        status: ride.status,
        estimatedArrival: new Date(new Date().getTime() + 15 * 60000).toISOString(), // 15 min from now as example
        currentLocation: lastLocation,
        progress: lastLocation ? 35 : 0, // Example progress percentage
        distance,
        duration,
        passengerCount
      };
      
      res.json(rideDetails);
    } catch (error) {
      console.error("Error fetching ride details:", error);
      res.status(500).json({ error: "Failed to fetch ride details" });
    }
  });

  app.get("/api/rides/active", requireAuthMiddleware, async (req: any, res) => {
    const userId = req.user.id;
    
    try {
      // Find rides where user is driver
      const driverRides = await storage.listUserDrivingRides(userId);
      
      // Find rides where user is passenger
      const userBookings = await storage.listUserBookings(userId);
      const passengerRideIds = userBookings
        .filter(booking => booking.status === "confirmed" || booking.status === "pending")
        .map(booking => booking.rideId);
      
      const passengerRides = [];
      for (const rideId of passengerRideIds) {
        const ride = await storage.getRide(rideId ?? 0);
        if (ride && (ride.status === "pending" || ride.status === "in_progress")) {
          passengerRides.push(ride);
        }
      }
      
      // Format the response
      const activeRides = [
        ...driverRides.map((ride: any) => ({
          id: ride.id,
          origin: ride.origin,
          destination: ride.destination,
          departureTime: ride.departureTime,
          status: ride.status,
          isDriver: true
        })),
        ...passengerRides.map((ride: any) => ({
          id: ride.id,
          origin: ride.origin,
          destination: ride.destination,
          departureTime: ride.departureTime,
          status: ride.status,
          isDriver: false
        }))
      ];
      
      res.json(activeRides);
    } catch (error) {
      console.error("Error fetching active rides:", error);
      res.status(500).json({ error: "Failed to fetch active rides" });
    }
  });

  // AI-powered ride verification and safety endpoints
  app.post("/api/rides/:id/verify-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const rideId = parseInt(req.params.id);
    const userId = req.user.id;
    
    try {
      const ride = await storage.getRide(rideId ?? 0);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      // Generate a 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the verification code
      await storage.createRideVerification(rideId, userId, code);
      
      res.json({ code });
    } catch (error) {
      console.error("Error generating verification code:", error);
      res.status(500).json({ error: "Failed to generate verification code" });
    }
  });

  app.post("/api/rides/:id/confirm-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const rideId = parseInt(req.params.id);
    const userId = req.user.id;
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "Verification code is required" });
    }
    
    try {
      // Verify the code
      const verified = await storage.verifyRideCode(rideId, code);
      
      if (!verified) {
        return res.status(400).json({ error: "Invalid verification code" });
      }
      
      // Award safety points to the user
      await storage.updateUserPoints(userId, 10);
      
      // Create reward
      await storage.createReward({
        userId,
        type: "safety_verification",
        points: 10,
        description: "Completed ride verification",
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error confirming verification code:", error);
      res.status(500).json({ error: "Failed to confirm verification code" });
    }
  });

  // AI-powered safety alerts and analytics endpoints
  app.post("/api/safety/alerts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userId = req.user.id;
    const { rideId, alertType, details, latitude, longitude } = req.body;
    
    if (!rideId || !alertType) {
      return res.status(400).json({ error: "Ride ID and alert type are required" });
    }
    
    try {
      const ride = await storage.getRide(rideId ?? 0);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      // Create the safety alert
      const alert = await safetyServices.createSafetyAlert({
        userId,
        rideId,
        alertType: alertType,
        details: details || "",
        latitude,
        longitude,
        timestamp: new Date(),
        status: "active"
      });
      
      // Broadcast the alert to WebSocket clients
      safetyServices.broadcastSafetyAlert(wss, alert);
      
      // For emergency alerts, send notifications to the trusted contacts
      if (alertType === "emergency") {
        const trustedContacts = await safetyServices.getTrustedContacts(userId);
        
        for (const contact of trustedContacts) {
          console.log(`Would send emergency notification to ${contact.contactName} at ${contact.contactPhone}`);
          // In production, this would integrate with SMS/notification service
        }
      }
      
      // If the alert is for a specific ride, notify the driver and/or passengers
      if (userId === ride.driverId) {
        // If the driver raised the alert, notify all passengers
        const bookings = await storage.listRideBookings(rideId);
        
        for (const booking of bookings) {
          if (booking.status === "confirmed") {
            await storage.createMessage({
              senderId: userId,
              receiverId: booking.userId,
              content: `SAFETY ALERT: ${safetyServices.getAlertMessage({ alertType } as any)}`,
              rideId,
              isRead: false
            });
          }
        }
      } else {
        // If a passenger raised the alert, notify the driver
        await storage.createMessage({
          senderId: userId,
          receiverId: ride.driverId,
          content: `SAFETY ALERT: ${safetyServices.getAlertMessage({ alertType } as any)}`,
          rideId,
          isRead: false
        });
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Error creating safety alert:", error);
      res.status(500).json({ error: "Failed to create safety alert" });
    }
  });

  app.get("/api/safety/alerts/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userId = req.user.id;
    
    try {
      const alerts = await storage.listUserSafetyAlerts(userId);
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching safety alerts:", error);
      res.status(500).json({ error: "Failed to fetch safety alerts" });
    }
  });

  app.post("/api/safety/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userId = req.user.id;
    const { contactName, contactPhone, contactEmail, relationship, isEmergencyContact } = req.body;
    
    if (!contactName || !contactPhone || !relationship) {
      return res.status(400).json({ error: "Name, phone, and relationship are required" });
    }
    
    try {
      // Check if we're making this an emergency contact
      if (isEmergencyContact) {
        // If this user already has an emergency contact, update it
        const existingContacts = await storage.listUserTrustedContacts(userId);
        const existingEmergencyContact = existingContacts.find((c: any) => c.isEmergencyContact);
        
        if (existingEmergencyContact) {
          await storage.updateTrustedContact(existingEmergencyContact.id, {
            isEmergencyContact: false
          });
        }
      }
      
      // Create the new contact
      const contact = await storage.createTrustedContact({
        userId,
        contactName,
        contactPhone,
        contactEmail: contactEmail || null,
        relationship,
        isEmergencyContact: isEmergencyContact || false
      });
      
      // If this is an emergency contact, update the user's emergency contact ID
      if (isEmergencyContact) {
        await storage.updateUserEmergencyContact(userId, contact.id);
      }
      
      res.json(contact);
    } catch (error) {
      console.error("Error creating trusted contact:", error);
      res.status(500).json({ error: "Failed to create trusted contact" });
    }
  });

  app.get("/api/safety/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userId = req.user.id;
    
    try {
      const contacts = await storage.listUserTrustedContacts(userId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching trusted contacts:", error);
      res.status(500).json({ error: "Failed to fetch trusted contacts" });
    }
  });

  // AI recommendation and analytics endpoints
  app.get("/api/rides/recommended", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userId = req.user.id;
    
    try {
      // Get user's ride history
      const userBookings = await storage.listUserBookings(userId);
      const rideTakenIds = userBookings.map(booking => booking.rideId);
      
      // Get the actual rides from the bookings
      const takenRides = [];
      for (const rideId of rideTakenIds) {
        const ride = await storage.getRide(rideId ?? 0);
        if (ride) {
          takenRides.push(ride);
        }
      }
      
      // Simple recommendation logic based on popular destinations or frequent trips
      // In production, this would use more sophisticated ML algorithms
      const allRides = await storage.listRides();
      
      // Filter out rides created by this user, already booked, or departed
      const availableRides = allRides.filter(ride => 
        ride.driverId !== userId && 
        ride.status === "pending" && 
        new Date(ride.departureTime) > new Date() &&
        !userBookings.some(b => b.rideId === ride.id && b.status !== "cancelled")
      );
      
      let recommendedRides: any[] = [];
      
      // If user has taken rides before, recommend based on destination preference
      if (takenRides.length > 0) {
        // Track origin and destination frequency
        const destinationCounts: Record<string, number> = {};
        const originCounts: Record<string, number> = {};
        
        // Count frequency of origins and destinations
        takenRides.forEach(ride => {
          const destination = ride.destination;
          const origin = ride.origin;
          destinationCounts[destination] = (destinationCounts[destination] || 0) + 1;
          originCounts[origin] = (originCounts[origin] || 0) + 1;
        });
        
        // Sort by frequency
        const popularDestinations = Object.entries(destinationCounts)
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0]);
          
        const popularOrigins = Object.entries(originCounts)
          .sort((a, b) => b[1] - a[1])
          .map(entry => entry[0]);
        
        // First recommend rides that match both popular origins and destinations
        recommendedRides = availableRides.filter(ride => 
          popularOrigins.includes(ride.origin) && popularDestinations.includes(ride.destination)
        );
        
        // Then add rides that match just popular origins
        if (recommendedRides.length < 5) {
          const originMatches = availableRides.filter(ride => 
            popularOrigins.includes(ride.origin) && !recommendedRides.some(r => r.id === ride.id)
          );
          recommendedRides = [...recommendedRides, ...originMatches].slice(0, 5);
        }
        
        // Then add rides that match just popular destinations
        if (recommendedRides.length < 5) {
          const destMatches = availableRides.filter(ride => 
            popularDestinations.includes(ride.destination) && 
            !recommendedRides.some(r => r.id === ride.id)
          );
          recommendedRides = [...recommendedRides, ...destMatches].slice(0, 5);
        }
      }
      
      // If we still don't have enough recommendations, add some recent rides
      if (recommendedRides.length < 5) {
        const recentRides = availableRides
          .filter(ride => !recommendedRides.some(r => r.id === ride.id))
          .sort((a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime())
          .slice(0, 5 - recommendedRides.length);
        
        recommendedRides = [...recommendedRides, ...recentRides];
      }
      
      res.json(recommendedRides);
    } catch (error) {
      console.error("Error generating ride recommendations:", error);
      res.status(500).json({ error: "Failed to generate ride recommendations" });
    }
  });

  app.get("/api/user/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userId = req.user.id;
    
    try {
      const user = await storage.getUser(userId);
      
      // Get user's bookings
      const userBookings = await storage.listUserBookings(userId);
      const completedBookings = userBookings.filter(b => b.status === "completed");
      
      // Get user's rides as driver
      const userDrivingRides = await storage.listUserDrivingRides(userId);
      const completedDrivingRides = userDrivingRides.filter(r => r.status === "completed");
      
      // Get total CO2 saved (example calculation)
      // In production, this would use actual distance data
      const co2SavedKg = (completedBookings.length * 2.3) + (completedDrivingRides.length * 0.8);
      
      // Get total distance traveled
      // This is a simplified calculation; in production would use actual route distances
      const distanceTraveledKm = (completedBookings.length * 12) + (completedDrivingRides.length * 15);
      
      // Calculate ratings
      const userReviews = await storage.listUserReviews(userId);
      const avgRating = userReviews.length > 0 
        ? userReviews.reduce((sum, review) => sum + Number(review.rating), 0) / userReviews.length
        : 5.0;
      
      // Get rewards summary
      const userRewards = await storage.listUserRewards(userId);
      const totalRewardPoints = userRewards.reduce((sum, reward) => sum + reward.points, 0);
      
      const stats = {
        totalRides: completedBookings.length + completedDrivingRides.length,
        ridesAsPassenger: completedBookings.length,
        ridesAsDriver: completedDrivingRides.length,
        co2SavedKg,
        distanceTraveledKm,
        avgRating,
        totalRewardPoints,
        safetyVerificationsCompleted: userRewards.filter(r => r.type === "safety_verification").length,
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user statistics" });
    }
  });

  // WebSocket connection setup
  wss.on("connection", (ws, req) => {
    console.log("WebSocket client connected");
    
    // Add message handler
    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle subscription requests
        if (data.type === "subscribe") {
          console.log(`Client subscribing to ${data.channel}`);
          // @ts-ignore - custom property
          ws.channel = data.channel;
          // @ts-ignore - custom property
          ws.userId = data.userId;
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });
    
    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });

  return httpServer;
}