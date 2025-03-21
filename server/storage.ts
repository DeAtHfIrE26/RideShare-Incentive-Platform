import type { Booking, InsertUser, Message, Review, Reward, Ride, User } from "@shared/schema";
import { bookings, messages, reviews, rewards, rides, users } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { and, desc, eq, or } from "drizzle-orm";
import { sql } from 'drizzle-orm/sql';
import session from "express-session";
import { db, pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPoints(userId: number, points: number): Promise<User>;
  updateUserProfile(userId: number, profile: Partial<User>): Promise<User>;

  // Ride operations
  createRide(ride: Omit<Ride, "id" | "createdAt">): Promise<Ride>;
  getRide(id: number): Promise<Ride | undefined>;
  listRides(): Promise<Ride[]>;
  updateRideStatus(rideId: number, status: string): Promise<Ride>;
  updateRideSeats(rideId: number, seatsBooked: number): Promise<Ride>;

  // Additional ride operations
  listUserDrivingRides(userId: number): Promise<Ride[]>;
  listRideBookings(rideId: number): Promise<Booking[]>;
  storeLocationUpdate(rideId: number, userId: number, latitude: number, longitude: number): Promise<any>;
  getLastLocationUpdate(rideId: number): Promise<any>;

  // Booking operations
  createBooking(booking: Omit<Booking, "id" | "createdAt">): Promise<Booking>;
  getBooking(id: number): Promise<Booking | undefined>;
  listUserBookings(userId: number): Promise<Booking[]>;
  updateBookingStatus(bookingId: number, status: string): Promise<Booking>;

  // Ride verification methods
  createRideVerification(rideId: number, passengerId: number, verificationCode: string): Promise<any>;
  verifyRideCode(rideId: number, code: string): Promise<boolean>;

  // Safety methods
  createSafetyAlert(alert: {
    userId: number;
    rideId: number;
    alertType: string;
    details: string;
    latitude?: number;
    longitude?: number;
    status: string;
  }): Promise<any>;
  listUserSafetyAlerts(userId: number): Promise<any[]>;
  
  // Trusted contact methods
  createTrustedContact(contact: {
    userId: number;
    contactName: string;
    contactPhone: string;
    contactEmail: string | null;
    relationship: string;
    isEmergencyContact: boolean;
  }): Promise<any>;
  listUserTrustedContacts(userId: number): Promise<any[]>;
  updateTrustedContact(contactId: number, updates: Partial<{
    contactName: string;
    contactPhone: string;
    contactEmail: string | null;
    relationship: string;
    isEmergencyContact: boolean;
  }>): Promise<any>;
  updateUserEmergencyContact(userId: number, contactId: number): Promise<any>;

  // Reward operations
  createReward(reward: Omit<Reward, "id" | "createdAt">): Promise<Reward>;
  listUserRewards(userId: number): Promise<Reward[]>;

  // Message operations
  createMessage(message: Omit<Message, "id" | "createdAt">): Promise<Message>;
  listUserMessages(userId: number): Promise<Message[]>;
  markMessageAsRead(messageId: number): Promise<Message>;
  getUnreadMessageCount(userId: number): Promise<number>;

  // Review operations
  createReview(review: Omit<Review, "id" | "createdAt">): Promise<Review>;
  listUserReviews(userId: number): Promise<Review[]>;
  getUserRating(userId: number): Promise<number>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Use any to bypass the type checking for Pool
    // This is necessary because @neondatabase/serverless Pool has a different interface
    // than what connect-pg-simple expects, but they are compatible at runtime
    this.sessionStore = new PostgresSessionStore({
      pool: pool as any,
      createTableIfMissing: true,
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error in getUser:", error);
      
      // If the error is about missing columns, try a more selective query
      if (error instanceof Error && error.message.includes("column") && error.message.includes("does not exist")) {
        // Try a more conservative query that doesn't rely on the potentially missing columns
        const [safeUser] = await db.select({
          id: users.id,
          username: users.username,
          password: users.password,
          email: users.email,
          fullName: users.fullName,
          phoneNumber: users.phoneNumber,
          profileImage: users.profileImage,
          bio: users.bio,
          points: users.points,
          rating: users.rating,
          verifiedDriver: users.verifiedDriver,
          totalRides: users.totalRides,
          createdAt: users.createdAt,
          lastActive: users.lastActive,
        }).from(users).where(eq(users.id, id));
        
        // Add missing safety fields with default values
        return safeUser ? {
          ...safeUser,
          identityVerified: false,
          safetyPreferences: null,
          emergencyContactId: null
        } as User : undefined;
      }
      
      // For other errors, rethrow
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error in getUserByUsername:", error);
      
      // If the error is about missing columns, try a more selective query
      if (error instanceof Error && error.message.includes("column") && error.message.includes("does not exist")) {
        // Try a more conservative query that doesn't rely on the potentially missing columns
        const [safeUser] = await db.select({
          id: users.id,
          username: users.username,
          password: users.password,
          email: users.email,
          fullName: users.fullName,
          phoneNumber: users.phoneNumber,
          profileImage: users.profileImage,
          bio: users.bio,
          points: users.points,
          rating: users.rating,
          verifiedDriver: users.verifiedDriver,
          totalRides: users.totalRides,
          createdAt: users.createdAt,
          lastActive: users.lastActive,
        }).from(users).where(eq(users.username, username));
        
        // Add missing safety fields with default values
        return safeUser ? {
          ...safeUser,
          identityVerified: false,
          safetyPreferences: null,
          emergencyContactId: null
        } as User : undefined;
      }
      
      // For other errors, rethrow
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error("Error in createUser:", error);
      
      // If the error is about missing columns, try a more selective insert
      if (error instanceof Error && error.message.includes("column") && error.message.includes("does not exist")) {
        // Extract only the basic fields that should exist in all cases
        const basicUser = {
          username: insertUser.username,
          password: insertUser.password,
          email: insertUser.email,
          fullName: insertUser.fullName || null,
          phoneNumber: insertUser.phoneNumber || null,
        };
        
        try {
          const [createdUser] = await db.insert(users).values(basicUser).returning({
            id: users.id,
            username: users.username,
            password: users.password,
            email: users.email,
            fullName: users.fullName,
            phoneNumber: users.phoneNumber,
            createdAt: users.createdAt,
            lastActive: users.lastActive,
          });
          
          // Add missing fields with default values
          // Using type assertion to avoid TypeScript errors
          return {
            ...createdUser,
            profileImage: null,
            bio: null,
            points: 0,
            rating: "5.0", // String to match the expected type
            verifiedDriver: false,
            totalRides: 0,
            identityVerified: false,
            safetyPreferences: null,
            emergencyContactId: null
          } as unknown as User;
        } catch (innerError) {
          console.error("Secondary error in createUser:", innerError);
          throw new Error("Failed to create user with limited fields");
        }
      }
      
      // For other errors, rethrow
      throw error;
    }
  }

  async updateUserPoints(userId: number, points: number): Promise<User> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      const [updatedUser] = await db
        .update(users)
        .set({ points: (user?.points || 0) + points })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error("Error in updateUserPoints:", error);
      
      // If it's a missing column error, try to get the user first and then update with defaults
      if (error instanceof Error && error.message.includes("column") && error.message.includes("does not exist")) {
        try {
          // Get user with basic fields
          const [basicUser] = await db.select({
            id: users.id,
            username: users.username,
            password: users.password,
            email: users.email,
            fullName: users.fullName,
            phoneNumber: users.phoneNumber,
          }).from(users).where(eq(users.id, userId));
          
          if (!basicUser) {
            throw new Error("User not found");
          }
          
          // Return a user object with the updated points and default values for missing fields
          return {
            ...basicUser,
            points: points,
            profileImage: null,
            bio: null,
            rating: "5.0",
            verifiedDriver: false,
            totalRides: 0,
            createdAt: new Date(),
            lastActive: new Date(),
            identityVerified: false,
            safetyPreferences: null,
            emergencyContactId: null
          } as unknown as User;
        } catch (innerError) {
          console.error("Secondary error in updateUserPoints:", innerError);
          throw new Error("Failed to update user points with limited fields");
        }
      }
      
      throw error;
    }
  }

  async updateUserProfile(userId: number, profile: Partial<User>): Promise<User> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(profile)
        .where(eq(users.id, userId))
        .returning();
      return updatedUser;
    } catch (error) {
      console.error("Error in updateUserProfile:", error);
      
      // If it's a missing column error, try to update only the basic fields
      if (error instanceof Error && error.message.includes("column") && error.message.includes("does not exist")) {
        try {
          // Extract only basic fields that should exist in all tables
          const basicProfile: Record<string, any> = {};
          if (profile.fullName !== undefined) basicProfile.fullName = profile.fullName;
          if (profile.phoneNumber !== undefined) basicProfile.phoneNumber = profile.phoneNumber;
          if (profile.email !== undefined) basicProfile.email = profile.email;
          
          // Update with only basic fields
          const [basicUpdatedUser] = await db
            .update(users)
            .set(basicProfile)
            .where(eq(users.id, userId))
            .returning({
              id: users.id,
              username: users.username,
              password: users.password,
              email: users.email,
              fullName: users.fullName,
              phoneNumber: users.phoneNumber,
              createdAt: users.createdAt,
              lastActive: users.lastActive,
            });
          
          if (!basicUpdatedUser) {
            throw new Error("User not found");
          }
          
          // Return a user object with updated fields and default values for missing fields
          return {
            ...basicUpdatedUser,
            ...profile, // Include all requested profile updates
            profileImage: profile.profileImage || null,
            bio: profile.bio || null,
            points: profile.points || 0,
            rating: profile.rating || "5.0",
            verifiedDriver: profile.verifiedDriver || false,
            totalRides: profile.totalRides || 0,
            identityVerified: profile.identityVerified || false,
            safetyPreferences: profile.safetyPreferences || null,
            emergencyContactId: profile.emergencyContactId || null
          } as unknown as User;
        } catch (innerError) {
          console.error("Secondary error in updateUserProfile:", innerError);
          throw new Error("Failed to update user profile with limited fields");
        }
      }
      
      throw error;
    }
  }

  // Ride operations
  async createRide(ride: Omit<Ride, "id" | "createdAt">): Promise<Ride> {
    const [newRide] = await db.insert(rides).values(ride).returning();
    return newRide;
  }

  async getRide(id: number): Promise<Ride | undefined> {
    const [ride] = await db.select().from(rides).where(eq(rides.id, id));
    return ride;
  }

  async listRides(): Promise<Ride[]> {
    return db.select().from(rides).orderBy(desc(rides.createdAt));
  }

  async updateRideStatus(rideId: number, status: string): Promise<Ride> {
    const [updatedRide] = await db
      .update(rides)
      .set({ status })
      .where(eq(rides.id, rideId))
      .returning();
    return updatedRide;
  }

  async updateRideSeats(rideId: number, seatsBooked: number): Promise<Ride> {
    const [ride] = await db.select().from(rides).where(eq(rides.id, rideId));
    
    if (!ride) {
      throw new Error("Ride not found");
    }
    
    // Calculate new available seats
    const newSeatsAvailable = Math.max(0, ride.seatsAvailable - seatsBooked);
    
    // Update ride status based on available seats
    let newStatus = ride.status;
    if (newSeatsAvailable === 0) {
      newStatus = "full";
    } else if (ride.status === "full" && newSeatsAvailable > 0) {
      // If seats were added back (e.g., cancellation)
      newStatus = "pending";
    }
    
    // Update the ride with atomic transaction
    const [updatedRide] = await db
      .update(rides)
      .set({ 
        seatsAvailable: newSeatsAvailable,
        status: newStatus
      })
      .where(eq(rides.id, rideId))
      .returning();
      
    return updatedRide;
  }

  // Booking operations
  async createBooking(booking: Omit<Booking, "id" | "createdAt">): Promise<Booking> {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async listUserBookings(userId: number): Promise<Booking[]> {
    return db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));
  }

  async updateBookingStatus(bookingId: number, status: string): Promise<Booking> {
    const [updatedBooking] = await db
      .update(bookings)
      .set({ status })
      .where(eq(bookings.id, bookingId))
      .returning();
    return updatedBooking;
  }

  // Reward operations
  async createReward(reward: Omit<Reward, "id" | "createdAt">): Promise<Reward> {
    const [newReward] = await db.insert(rewards).values(reward).returning();
    return newReward;
  }

  async listUserRewards(userId: number): Promise<Reward[]> {
    return db
      .select()
      .from(rewards)
      .where(eq(rewards.userId, userId))
      .orderBy(desc(rewards.createdAt));
  }

  // Message operations
  async createMessage(message: Omit<Message, "id" | "createdAt">): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async listUserMessages(userId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        )
      )
      .orderBy(desc(messages.createdAt));
  }

  async markMessageAsRead(messageId: number): Promise<Message> {
    const [updatedMessage] = await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId))
      .returning();
    return updatedMessage;
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.isRead, false)
        )
      );
    return result?.count || 0;
  }

  // Review operations
  async createReview(review: Omit<Review, "id" | "createdAt">): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async listUserReviews(userId: number): Promise<Review[]> {
    return db
      .select()
      .from(reviews)
      .where(eq(reviews.reviewedId, userId))
      .orderBy(desc(reviews.createdAt));
  }

  async getUserRating(userId: number): Promise<number> {
    const [result] = await db
      .select({ 
        avgRating: sql<number>`avg(${reviews.rating})` 
      })
      .from(reviews)
      .where(eq(reviews.reviewedId, userId));
    return result?.avgRating || 5.0;
  }

  // Additional ride operations
  async listUserDrivingRides(userId: number): Promise<Ride[]> {
    return listUserDrivingRides(userId);
  }

  async listRideBookings(rideId: number): Promise<Booking[]> {
    return listRideBookings(rideId);
  }

  async storeLocationUpdate(rideId: number, userId: number, latitude: number, longitude: number): Promise<any> {
    return storeLocationUpdate(rideId, userId, latitude, longitude);
  }

  async getLastLocationUpdate(rideId: number): Promise<any> {
    return getLastLocationUpdate(rideId);
  }

  // Ride verification methods
  async createRideVerification(rideId: number, passengerId: number, verificationCode: string): Promise<any> {
    return createRideVerification(rideId, passengerId, verificationCode);
  }

  async verifyRideCode(rideId: number, code: string): Promise<boolean> {
    return verifyRideCode(rideId, code);
  }

  // Safety methods
  async createSafetyAlert(alert: {
    userId: number;
    rideId: number;
    alertType: string;
    details: string;
    latitude?: number;
    longitude?: number;
    status: string;
  }): Promise<any> {
    return createSafetyAlert(alert);
  }

  async listUserSafetyAlerts(userId: number): Promise<any[]> {
    return listUserSafetyAlerts(userId);
  }

  // Trusted contact methods
  async createTrustedContact(contact: {
    userId: number;
    contactName: string;
    contactPhone: string;
    contactEmail: string | null;
    relationship: string;
    isEmergencyContact: boolean;
  }): Promise<any> {
    return createTrustedContact(contact);
  }

  async listUserTrustedContacts(userId: number): Promise<any[]> {
    return listUserTrustedContacts(userId);
  }

  async updateTrustedContact(contactId: number, updates: Partial<{
    contactName: string;
    contactPhone: string;
    contactEmail: string | null;
    relationship: string;
    isEmergencyContact: boolean;
  }>): Promise<any> {
    return updateTrustedContact(contactId, updates);
  }

  async updateUserEmergencyContact(userId: number, contactId: number): Promise<any> {
    return updateUserEmergencyContact(userId, contactId);
  }
}

export const storage = new DatabaseStorage();

// Enhanced ride tracking methods
export async function updateRideStatus(rideId: number, status: string) {
  const ride = await db.query.rides.findFirst({
    where: eq(rides.id, rideId)
  });
  
  if (!ride) {
    throw new Error("Ride not found");
  }
  
  await db.update(rides)
    .set({ status })
    .where(eq(rides.id, rideId));
  
  return {
    ...ride,
    status
  };
}

export async function storeLocationUpdate(rideId: number, userId: number, latitude: number, longitude: number) {
  // In a production app, you would have a dedicated table for location updates
  // For this demo, we'll simulate with a console log
  console.log(`Location update for ride ${rideId} by user ${userId}: ${latitude}, ${longitude}`);
  
  // Return a simulated success response
  return { success: true };
}

export async function getLastLocationUpdate(rideId: number) {
  // In a production app, this would query the location_updates table
  // For this demo, we'll return simulated data
  return {
    latitude: 37.7749 + (Math.random() * 0.01 - 0.005),
    longitude: -122.4194 + (Math.random() * 0.01 - 0.005),
    updatedAt: new Date().toISOString()
  };
}

// Ride verification methods
export async function createRideVerification(rideId: number, passengerId: number, verificationCode: string) {
  // In a production app, we would insert to a rideVerifications table
  // For this demo, we're simulating the operation and returning mock data
  console.log(`Creating ride verification for ride ${rideId}, passenger ${passengerId}: ${verificationCode}`);
  
  return {
    id: Math.floor(Math.random() * 10000),
    rideId,
    passengerId,
    verificationCode,
    verified: false,
    generatedAt: new Date(),
    verifiedAt: null
  };
}

export async function verifyRideCode(rideId: number, code: string) {
  // In a production app, we would check against the stored verification code
  // For this demo, we're simulating verification (any code will work)
  console.log(`Verifying code for ride ${rideId}: ${code}`);
  return true;
}

// Safety-related methods
export async function createSafetyAlert(alert: {
  userId: number;
  rideId: number;
  alertType: string;
  details: string;
  latitude?: number;
  longitude?: number;
  status: string;
}) {
  // In a production app, we would insert to a safetyAlerts table
  // For this demo, we're simulating the operation
  console.log(`Creating safety alert: ${JSON.stringify(alert)}`);
  
  return {
    id: Math.floor(Math.random() * 10000),
    ...alert,
    timestamp: new Date(),
    resolvedBy: null,
    resolvedAt: null
  };
}

export async function listUserSafetyAlerts(userId: number) {
  // In a production app, we would query the safetyAlerts table
  // For this demo, return mock data
  return [
    {
      id: 1,
      userId,
      rideId: 123,
      alertType: "safety_check",
      details: "Routine safety check",
      status: "resolved",
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      resolvedBy: userId,
      resolvedAt: new Date(Date.now() - 85000000)
    }
  ];
}

export async function createTrustedContact(contact: {
  userId: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  relationship: string;
  isEmergencyContact: boolean;
}) {
  // In a production app, we would insert to a trustedContacts table
  // For this demo, we're simulating the operation
  console.log(`Creating trusted contact: ${JSON.stringify(contact)}`);
  
  return {
    id: Math.floor(Math.random() * 10000),
    ...contact,
    createdAt: new Date()
  };
}

export async function updateTrustedContact(contactId: number, updates: Partial<{
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  relationship: string;
  isEmergencyContact: boolean;
}>) {
  // In a production app, we would update the trustedContacts table
  // For this demo, we're simulating the operation
  console.log(`Updating trusted contact ${contactId}: ${JSON.stringify(updates)}`);
  
  return {
    id: contactId,
    userId: 1, // Mock user ID
    contactName: "Updated Contact",
    contactPhone: "+1234567890",
    contactEmail: updates.contactEmail || null,
    relationship: updates.relationship || "Family",
    isEmergencyContact: updates.isEmergencyContact || false,
    createdAt: new Date()
  };
}

export async function listUserTrustedContacts(userId: number) {
  // In a production app, we would query the trustedContacts table
  // For this demo, return mock data
  return [
    {
      id: 1,
      userId,
      contactName: "Emergency Contact",
      contactPhone: "+1234567890",
      contactEmail: "emergency@example.com",
      relationship: "Family",
      isEmergencyContact: true,
      createdAt: new Date(Date.now() - 86400000) // 1 day ago
    }
  ];
}

export async function updateUserEmergencyContact(userId: number, contactId: number) {
  // In a production app, we would update the users table
  // For this demo, we're simulating the operation
  console.log(`Setting emergency contact ${contactId} for user ${userId}`);
  
  // Update the user in the database to set emergency contact
  await db.update(users)
    .set({ emergencyContactId: contactId })
    .where(eq(users.id, userId));
    
  return { success: true };
}

// Enhanced ride querying methods
export async function listUserDrivingRides(userId: number) {
  return db.query.rides.findMany({
    where: and(
      eq(rides.driverId, userId),
      or(
        eq(rides.status, "pending"),
        eq(rides.status, "in_progress")
      )
    ),
    orderBy: [desc(rides.departureTime)]
  });
}

export async function listRideBookings(rideId: number) {
  return db.query.bookings.findMany({
    where: eq(bookings.rideId, rideId)
  });
}

export async function listUserReviews(userId: number) {
  return db.query.reviews.findMany({
    where: eq(reviews.reviewedId, userId)
  });
}