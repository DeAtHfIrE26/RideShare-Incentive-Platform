var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/serverless.ts
import { sql as sql2 } from "drizzle-orm";
import express2 from "express";

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  bookings: () => bookings,
  insertBookingSchema: () => insertBookingSchema,
  insertReviewSchema: () => insertReviewSchema,
  insertRideSchema: () => insertRideSchema,
  insertSafetyAlertSchema: () => insertSafetyAlertSchema,
  insertSafetyZoneSchema: () => insertSafetyZoneSchema,
  insertTrustedContactSchema: () => insertTrustedContactSchema,
  insertUserSchema: () => insertUserSchema,
  messages: () => messages,
  reviews: () => reviews,
  rewards: () => rewards,
  rideVerifications: () => rideVerifications,
  rideVerificationsRelations: () => rideVerificationsRelations,
  rides: () => rides,
  ridesRelations: () => ridesRelations,
  safetyAlerts: () => safetyAlerts,
  safetyAlertsRelations: () => safetyAlertsRelations,
  safetyZones: () => safetyZones,
  safetyZonesRelations: () => safetyZonesRelations,
  trustedContacts: () => trustedContacts,
  trustedContactsRelations: () => trustedContactsRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { relations } from "drizzle-orm";
import { boolean, decimal, index, integer, json, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  phoneNumber: text("phone_number"),
  profileImage: text("profile_image"),
  bio: text("bio"),
  points: integer("points").default(0),
  rating: decimal("rating").default("5.0"),
  verifiedDriver: boolean("verified_driver").default(false),
  totalRides: integer("total_rides").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  lastActive: timestamp("last_active").defaultNow(),
  // Safety profile fields
  identityVerified: boolean("identity_verified").default(false),
  safetyPreferences: json("safety_preferences"),
  emergencyContactId: integer("emergency_contact_id")
});
var rides = pgTable("rides", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").references(() => users.id),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  departureTime: timestamp("departure_time").notNull(),
  seatsAvailable: integer("seats_available").notNull(),
  price: decimal("price").notNull(),
  status: text("status").default("pending"),
  carModel: text("car_model"),
  carColor: text("car_color"),
  licensePlate: text("license_plate"),
  preferences: text("preferences"),
  // e.g., "no smoking", "music", etc.
  routeDetails: text("route_details"),
  estimatedDuration: text("estimated_duration"),
  /**
   * Route length in kilometres. Required for any honest emissions or distance
   * figure: the dashboard previously multiplied ride counts by invented
   * constants because the real distance was not stored anywhere.
   */
  distanceKm: decimal("distance_km"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  // Browsing open rides orders by departure and filters on status.
  statusDepartureIdx: index("rides_status_departure_idx").on(table.status, table.departureTime),
  driverIdx: index("rides_driver_id_idx").on(table.driverId)
}));
var bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").references(() => rides.id),
  userId: integer("user_id").references(() => users.id),
  seats: integer("seats").notNull(),
  status: text("status").default("pending"),
  specialRequests: text("special_requests"),
  pickupLocation: text("pickup_location"),
  dropoffLocation: text("dropoff_location"),
  paymentStatus: text("payment_status").default("pending"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  rideIdx: index("bookings_ride_id_idx").on(table.rideId),
  userIdx: index("bookings_user_id_idx").on(table.userId),
  // "has this user already booked this ride" is checked on every booking.
  rideUserIdx: index("bookings_ride_user_idx").on(table.rideId, table.userId)
}));
var rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(),
  points: integer("points").notNull(),
  description: text("description").notNull(),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  userIdx: index("rewards_user_id_idx").on(table.userId)
}));
var messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id),
  content: text("content").notNull(),
  rideId: integer("ride_id").references(() => rides.id),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  senderIdx: index("messages_sender_id_idx").on(table.senderId),
  // Unread counts poll this pair every 30 seconds from the sidebar.
  receiverReadIdx: index("messages_receiver_read_idx").on(table.receiverId, table.isRead),
  rideIdx: index("messages_ride_id_idx").on(table.rideId)
}));
var reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  reviewerId: integer("reviewer_id").references(() => users.id),
  reviewedId: integer("reviewed_id").references(() => users.id),
  rideId: integer("ride_id").references(() => rides.id),
  rating: decimal("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  reviewedIdx: index("reviews_reviewed_id_idx").on(table.reviewedId),
  reviewerIdx: index("reviews_reviewer_id_idx").on(table.reviewerId)
}));
var safetyAlerts = pgTable("safety_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  rideId: integer("ride_id").references(() => rides.id),
  alertType: text("alert_type").notNull(),
  details: text("details"),
  latitude: decimal("latitude"),
  longitude: decimal("longitude"),
  timestamp: timestamp("timestamp").defaultNow(),
  status: text("status").default("active"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  userIdx: index("safety_alerts_user_id_idx").on(table.userId),
  rideIdx: index("safety_alerts_ride_id_idx").on(table.rideId),
  statusIdx: index("safety_alerts_status_idx").on(table.status)
}));
var trustedContacts = pgTable("trusted_contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  contactEmail: text("contact_email"),
  relationship: text("relationship").notNull(),
  isEmergencyContact: boolean("is_emergency_contact").default(false),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  userIdx: index("trusted_contacts_user_id_idx").on(table.userId)
}));
var safetyZones = pgTable("safety_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  latitude: decimal("latitude").notNull(),
  longitude: decimal("longitude").notNull(),
  radiusMeters: integer("radius_meters").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var rideVerifications = pgTable("ride_verifications", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").references(() => rides.id),
  passengerId: integer("passenger_id").references(() => users.id),
  verificationCode: text("verification_code").notNull(),
  verified: boolean("verified").default(false),
  generatedAt: timestamp("generated_at").defaultNow(),
  verifiedAt: timestamp("verified_at")
});
var usersRelations = relations(users, ({ many, one }) => ({
  ridesAsDriver: many(rides),
  bookings: many(bookings),
  rewards: many(rewards),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  givenReviews: many(reviews, { relationName: "reviewer" }),
  receivedReviews: many(reviews, { relationName: "reviewed" }),
  safetyAlerts: many(safetyAlerts),
  trustedContacts: many(trustedContacts),
  createdSafetyZones: many(safetyZones),
  emergencyContact: one(trustedContacts, {
    fields: [users.emergencyContactId],
    references: [trustedContacts.id]
  })
}));
var ridesRelations = relations(rides, ({ one, many }) => ({
  driver: one(users, { fields: [rides.driverId], references: [users.id] }),
  bookings: many(bookings),
  messages: many(messages),
  reviews: many(reviews),
  safetyAlerts: many(safetyAlerts),
  verifications: many(rideVerifications)
}));
var safetyAlertsRelations = relations(safetyAlerts, ({ one }) => ({
  user: one(users, { fields: [safetyAlerts.userId], references: [users.id] }),
  ride: one(rides, { fields: [safetyAlerts.rideId], references: [rides.id] }),
  resolver: one(users, { fields: [safetyAlerts.resolvedBy], references: [users.id] })
}));
var trustedContactsRelations = relations(trustedContacts, ({ one }) => ({
  user: one(users, { fields: [trustedContacts.userId], references: [users.id] })
}));
var safetyZonesRelations = relations(safetyZones, ({ one }) => ({
  creator: one(users, { fields: [safetyZones.createdBy], references: [users.id] })
}));
var rideVerificationsRelations = relations(rideVerifications, ({ one }) => ({
  ride: one(rides, { fields: [rideVerifications.rideId], references: [rides.id] }),
  passenger: one(users, { fields: [rideVerifications.passengerId], references: [users.id] })
}));
var insertSafetyAlertSchema = createInsertSchema(safetyAlerts).pick({
  userId: true,
  rideId: true,
  alertType: true,
  details: true,
  latitude: true,
  longitude: true
}).extend({
  alertType: z.enum([
    "emergency",
    "safety_check",
    "location_deviation",
    "delayed_arrival",
    "behavioral_concern"
  ]),
  details: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});
var insertTrustedContactSchema = createInsertSchema(trustedContacts).pick({
  userId: true,
  contactName: true,
  contactPhone: true,
  contactEmail: true,
  relationship: true,
  isEmergencyContact: true
}).extend({
  contactName: z.string().min(1, "Contact name is required"),
  contactPhone: z.string().min(10, "Valid phone number is required"),
  contactEmail: z.string().email("Invalid email format").optional(),
  relationship: z.string().min(1, "Relationship is required"),
  isEmergencyContact: z.boolean().optional()
});
var insertSafetyZoneSchema = createInsertSchema(safetyZones).pick({
  name: true,
  description: true,
  latitude: true,
  longitude: true,
  radiusMeters: true,
  createdBy: true
}).extend({
  name: z.string().min(1, "Zone name is required"),
  description: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  radiusMeters: z.number().int().min(10, "Radius must be at least 10 meters")
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  phoneNumber: true
}).extend({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phoneNumber: z.string().optional(),
  fullName: z.string().optional()
});
var insertRideSchema = createInsertSchema(rides).pick({
  origin: true,
  destination: true,
  departureTime: true,
  seatsAvailable: true,
  price: true,
  carModel: true,
  carColor: true,
  licensePlate: true,
  preferences: true,
  distanceKm: true
}).extend({
  // Optional: a ride without a known distance is excluded from emissions and
  // distance statistics rather than having a value invented for it.
  distanceKm: z.number().positive("Distance must be greater than zero").max(5e3, "Distance looks implausible").optional(),
  origin: z.string().min(1, "Origin is required").max(100),
  destination: z.string().min(1, "Destination is required").max(100),
  departureTime: z.string().refine((val) => {
    const date = new Date(val);
    return date > /* @__PURE__ */ new Date();
  }, "Departure time must be in the future"),
  seatsAvailable: z.number().int().min(1, "At least 1 seat required").max(8, "Maximum 8 seats allowed"),
  price: z.number().min(0, "Price cannot be negative").multipleOf(0.01, "Price must be in valid currency format"),
  carModel: z.string().optional(),
  carColor: z.string().optional(),
  licensePlate: z.string().optional(),
  preferences: z.string().optional()
});
var insertBookingSchema = createInsertSchema(bookings).pick({
  rideId: true,
  seats: true,
  specialRequests: true,
  pickupLocation: true,
  dropoffLocation: true
}).extend({
  // drizzle-zod infers a bare integer here, which accepted 0 and created a
  // confirmed booking for no seats. Bounded to match the per-ride maximum.
  seats: z.number().int().min(1, "At least 1 seat is required").max(8, "Maximum 8 seats allowed"),
  specialRequests: z.string().optional(),
  pickupLocation: z.string().optional(),
  dropoffLocation: z.string().optional()
});
var insertReviewSchema = createInsertSchema(reviews).pick({
  rating: true,
  comment: true
}).extend({
  rating: z.number().min(1).max(5),
  comment: z.string().optional()
});

// server/db.ts
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
dotenv.config();
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/hardening.ts
import express from "express";
import helmet from "helmet";
var BODY_LIMIT = "100kb";
function applyHardening(app2) {
  app2.disable("x-powered-by");
  app2.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // The shadcn theme plugin injects a <style> block into index.html,
          // and Tailwind sets inline styles at runtime.
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:"],
          fontSrc: ["'self'", "data:"],
          // Same-origin API plus the /ws channel used by chat and tracking.
          connectSrc: ["'self'", "ws:", "wss:"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      },
      // Vercel terminates TLS and sets HSTS at the edge; leaving helmet's
      // default on is harmless and correct for other hosts.
      crossOriginEmbedderPolicy: false
    })
  );
  app2.use(express.json({ limit: BODY_LIMIT }));
  app2.use(express.urlencoded({ extended: false, limit: BODY_LIMIT }));
  app2.use((err, _req, res, next) => {
    if (err && typeof err === "object" && "type" in err) {
      const type = err.type;
      if (type === "entity.parse.failed") {
        return res.status(400).json({ error: "Malformed JSON in request body" });
      }
      if (type === "entity.too.large") {
        return res.status(413).json({ error: `Request body exceeds the ${BODY_LIMIT} limit` });
      }
    }
    return next(err);
  });
}

// server/routes.ts
import { createServer } from "http";
import { WebSocket as WebSocket2, WebSocketServer } from "ws";

// server/auth.ts
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import session2 from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

// server/storage.ts
import connectPg from "connect-pg-simple";
import { and, desc, eq, gte, inArray, or } from "drizzle-orm";
import { sql } from "drizzle-orm/sql";
import session from "express-session";
var PostgresSessionStore = connectPg(session);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  // User operations
  async getUser(id) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error("Error in getUser:", error);
      if (error instanceof Error && error.message.includes("column") && error.message.includes("does not exist")) {
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
          lastActive: users.lastActive
        }).from(users).where(eq(users.id, id));
        return safeUser ? {
          ...safeUser,
          identityVerified: false,
          safetyPreferences: null,
          emergencyContactId: null
        } : void 0;
      }
      throw error;
    }
  }
  async getUserByUsername(username) {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error("Error in getUserByUsername:", error);
      if (error instanceof Error && error.message.includes("column") && error.message.includes("does not exist")) {
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
          lastActive: users.lastActive
        }).from(users).where(eq(users.username, username));
        return safeUser ? {
          ...safeUser,
          identityVerified: false,
          safetyPreferences: null,
          emergencyContactId: null
        } : void 0;
      }
      throw error;
    }
  }
  async createUser(insertUser) {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error("Error in createUser:", error);
      if (error instanceof Error && error.message.includes("column") && error.message.includes("does not exist")) {
        const basicUser = {
          username: insertUser.username,
          password: insertUser.password,
          email: insertUser.email,
          fullName: insertUser.fullName || null,
          phoneNumber: insertUser.phoneNumber || null
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
            lastActive: users.lastActive
          });
          return {
            ...createdUser,
            profileImage: null,
            bio: null,
            points: 0,
            rating: "5.0",
            // String to match the expected type
            verifiedDriver: false,
            totalRides: 0,
            identityVerified: false,
            safetyPreferences: null,
            emergencyContactId: null
          };
        } catch (innerError) {
          console.error("Secondary error in createUser:", innerError);
          throw new Error("Failed to create user with limited fields");
        }
      }
      throw error;
    }
  }
  async updateUserPoints(userId, points) {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      const [updatedUser] = await db.update(users).set({ points: (user?.points || 0) + points }).where(eq(users.id, userId)).returning();
      return updatedUser;
    } catch (error) {
      console.error("Error in updateUserPoints:", error);
      if (error instanceof Error && error.message.includes("column") && error.message.includes("does not exist")) {
        try {
          const [basicUser] = await db.select({
            id: users.id,
            username: users.username,
            password: users.password,
            email: users.email,
            fullName: users.fullName,
            phoneNumber: users.phoneNumber
          }).from(users).where(eq(users.id, userId));
          if (!basicUser) {
            throw new Error("User not found");
          }
          return {
            ...basicUser,
            points,
            profileImage: null,
            bio: null,
            rating: "5.0",
            verifiedDriver: false,
            totalRides: 0,
            createdAt: /* @__PURE__ */ new Date(),
            lastActive: /* @__PURE__ */ new Date(),
            identityVerified: false,
            safetyPreferences: null,
            emergencyContactId: null
          };
        } catch (innerError) {
          console.error("Secondary error in updateUserPoints:", innerError);
          throw new Error("Failed to update user points with limited fields");
        }
      }
      throw error;
    }
  }
  async updateUserProfile(userId, profile) {
    try {
      const [updatedUser] = await db.update(users).set(profile).where(eq(users.id, userId)).returning();
      return updatedUser;
    } catch (error) {
      console.error("Error in updateUserProfile:", error);
      if (error instanceof Error && error.message.includes("column") && error.message.includes("does not exist")) {
        try {
          const basicProfile = {};
          if (profile.fullName !== void 0) basicProfile.fullName = profile.fullName;
          if (profile.phoneNumber !== void 0) basicProfile.phoneNumber = profile.phoneNumber;
          if (profile.email !== void 0) basicProfile.email = profile.email;
          const [basicUpdatedUser] = await db.update(users).set(basicProfile).where(eq(users.id, userId)).returning({
            id: users.id,
            username: users.username,
            password: users.password,
            email: users.email,
            fullName: users.fullName,
            phoneNumber: users.phoneNumber,
            createdAt: users.createdAt,
            lastActive: users.lastActive
          });
          if (!basicUpdatedUser) {
            throw new Error("User not found");
          }
          return {
            ...basicUpdatedUser,
            ...profile,
            // Include all requested profile updates
            profileImage: profile.profileImage || null,
            bio: profile.bio || null,
            points: profile.points || 0,
            rating: profile.rating || "5.0",
            verifiedDriver: profile.verifiedDriver || false,
            totalRides: profile.totalRides || 0,
            identityVerified: profile.identityVerified || false,
            safetyPreferences: profile.safetyPreferences || null,
            emergencyContactId: profile.emergencyContactId || null
          };
        } catch (innerError) {
          console.error("Secondary error in updateUserProfile:", innerError);
          throw new Error("Failed to update user profile with limited fields");
        }
      }
      throw error;
    }
  }
  // Ride operations
  async createRide(ride) {
    const [newRide] = await db.insert(rides).values(ride).returning();
    return newRide;
  }
  async getRide(id) {
    const [ride] = await db.select().from(rides).where(eq(rides.id, id));
    return ride;
  }
  /**
   * A page of rides, newest first.
   *
   * This was an unbounded `SELECT * FROM rides`: every row went over the wire
   * and into the browser on each load, so response size and render cost grew
   * without limit as the table filled. Callers now pass a window and receive
   * the total alongside it.
   */
  async listRides(options = { limit: 20, offset: 0 }) {
    return db.select().from(rides).orderBy(desc(rides.createdAt)).limit(options.limit).offset(options.offset);
  }
  async countRides() {
    const [row] = await db.select({ count: sql`count(*)::int` }).from(rides);
    return Number(row?.count ?? 0);
  }
  async updateRideStatus(rideId, status) {
    const [updatedRide] = await db.update(rides).set({ status }).where(eq(rides.id, rideId)).returning();
    return updatedRide;
  }
  /**
   * Atomically reserves seats on a ride.
   *
   * The booking route previously read seatsAvailable, checked it, and only
   * later decremented it. Concurrent requests all read the same value, all
   * passed the check, and the ride oversold: five simultaneous bookings on a
   * one-seat ride produced five confirmed bookings.
   *
   * This performs the check and the decrement as a single guarded UPDATE, so
   * the database serialises contending writers on the row. Returns the updated
   * ride when the reservation succeeded, or null when there were not enough
   * seats left, which is how the caller detects losing the race.
   */
  /**
   * Fetches many rides in one query.
   *
   * Several routes resolved rides by looping `await getRide(id)` over a list of
   * bookings, which issues one round trip per booking. At Singapore latency
   * from a US function that is the dominant cost of those endpoints.
   */
  async getRidesByIds(ids) {
    if (ids.length === 0) return [];
    const unique = Array.from(new Set(ids));
    return db.select().from(rides).where(inArray(rides.id, unique));
  }
  /**
   * Seats confirmed or completed per ride, aggregated in the database rather
   * than by loading every booking row into the process.
   */
  async countConfirmedSeatsByRide(rideIds) {
    if (rideIds.length === 0) return /* @__PURE__ */ new Map();
    const unique = Array.from(new Set(rideIds));
    const rows = await db.select({
      rideId: bookings.rideId,
      seats: sql`COALESCE(SUM(${bookings.seats}), 0)::int`
    }).from(bookings).where(
      and(
        inArray(bookings.rideId, unique),
        inArray(bookings.status, ["confirmed", "completed"])
      )
    ).groupBy(bookings.rideId);
    return new Map(
      rows.filter((row) => row.rideId !== null).map((row) => [row.rideId, Number(row.seats)])
    );
  }
  async reserveRideSeats(rideId, seats) {
    const [updated] = await db.update(rides).set({
      seatsAvailable: sql`${rides.seatsAvailable} - ${seats}`,
      status: sql`CASE WHEN ${rides.seatsAvailable} - ${seats} <= 0 THEN 'full' ELSE ${rides.status} END`
    }).where(and(eq(rides.id, rideId), gte(rides.seatsAvailable, seats))).returning();
    return updated ?? null;
  }
  /** Returns seats to a ride when a reservation could not be completed. */
  async releaseRideSeats(rideId, seats) {
    await db.update(rides).set({
      seatsAvailable: sql`${rides.seatsAvailable} + ${seats}`,
      status: sql`CASE WHEN ${rides.status} = 'full' THEN 'pending' ELSE ${rides.status} END`
    }).where(eq(rides.id, rideId));
  }
  async updateRideSeats(rideId, seatsBooked) {
    const [ride] = await db.select().from(rides).where(eq(rides.id, rideId));
    if (!ride) {
      throw new Error("Ride not found");
    }
    const newSeatsAvailable = Math.max(0, ride.seatsAvailable - seatsBooked);
    let newStatus = ride.status;
    if (newSeatsAvailable === 0) {
      newStatus = "full";
    } else if (ride.status === "full" && newSeatsAvailable > 0) {
      newStatus = "pending";
    }
    const [updatedRide] = await db.update(rides).set({
      seatsAvailable: newSeatsAvailable,
      status: newStatus
    }).where(eq(rides.id, rideId)).returning();
    return updatedRide;
  }
  // Booking operations
  async createBooking(booking) {
    const [newBooking] = await db.insert(bookings).values(booking).returning();
    return newBooking;
  }
  async getBooking(id) {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }
  async listUserBookings(userId) {
    return db.select().from(bookings).where(eq(bookings.userId, userId)).orderBy(desc(bookings.createdAt));
  }
  async updateBookingStatus(bookingId, status) {
    const [updatedBooking] = await db.update(bookings).set({ status }).where(eq(bookings.id, bookingId)).returning();
    return updatedBooking;
  }
  // Reward operations
  async createReward(reward) {
    const [newReward] = await db.insert(rewards).values(reward).returning();
    return newReward;
  }
  async listUserRewards(userId) {
    return db.select().from(rewards).where(eq(rewards.userId, userId)).orderBy(desc(rewards.createdAt));
  }
  // Message operations
  async createMessage(message) {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }
  async listUserMessages(userId) {
    return db.select().from(messages).where(
      or(
        eq(messages.senderId, userId),
        eq(messages.receiverId, userId)
      )
    ).orderBy(desc(messages.createdAt));
  }
  async markMessageAsRead(messageId) {
    const [updatedMessage] = await db.update(messages).set({ isRead: true }).where(eq(messages.id, messageId)).returning();
    return updatedMessage;
  }
  async getUnreadMessageCount(userId) {
    const [result] = await db.select({ count: sql`count(*)` }).from(messages).where(
      and(
        eq(messages.receiverId, userId),
        eq(messages.isRead, false)
      )
    );
    return result?.count || 0;
  }
  // Review operations
  async createReview(review) {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }
  async listUserReviews(userId) {
    return db.select().from(reviews).where(eq(reviews.reviewedId, userId)).orderBy(desc(reviews.createdAt));
  }
  async getUserRating(userId) {
    const [result] = await db.select({
      avgRating: sql`avg(${reviews.rating})`
    }).from(reviews).where(eq(reviews.reviewedId, userId));
    return result?.avgRating || 5;
  }
  // Additional ride operations
  async listUserDrivingRides(userId) {
    return listUserDrivingRides(userId);
  }
  async listRideBookings(rideId) {
    return listRideBookings(rideId);
  }
  async storeLocationUpdate(rideId, userId, latitude, longitude) {
    return storeLocationUpdate(rideId, userId, latitude, longitude);
  }
  async getLastLocationUpdate(rideId) {
    return getLastLocationUpdate(rideId);
  }
  // Ride verification methods
  async createRideVerification(rideId, passengerId, verificationCode) {
    return createRideVerification(rideId, passengerId, verificationCode);
  }
  async verifyRideCode(rideId, code) {
    return verifyRideCode(rideId, code);
  }
  // Safety methods
  async createSafetyAlert(alert) {
    return createSafetyAlert(alert);
  }
  async listUserSafetyAlerts(userId) {
    return listUserSafetyAlerts(userId);
  }
  // Trusted contact methods
  async createTrustedContact(contact) {
    return createTrustedContact(contact);
  }
  async listUserTrustedContacts(userId) {
    return listUserTrustedContacts(userId);
  }
  async updateTrustedContact(contactId, updates) {
    return updateTrustedContact(contactId, updates);
  }
  async updateUserEmergencyContact(userId, contactId) {
    return updateUserEmergencyContact(userId, contactId);
  }
};
var storage = new DatabaseStorage();
async function storeLocationUpdate(rideId, userId, latitude, longitude) {
  console.log(`Location update for ride ${rideId} by user ${userId}: ${latitude}, ${longitude}`);
  return { success: true };
}
async function getLastLocationUpdate(rideId) {
  return {
    latitude: 37.7749 + (Math.random() * 0.01 - 5e-3),
    longitude: -122.4194 + (Math.random() * 0.01 - 5e-3),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function createRideVerification(rideId, passengerId, verificationCode) {
  console.log(`Creating ride verification for ride ${rideId}, passenger ${passengerId}: ${verificationCode}`);
  return {
    id: Math.floor(Math.random() * 1e4),
    rideId,
    passengerId,
    verificationCode,
    verified: false,
    generatedAt: /* @__PURE__ */ new Date(),
    verifiedAt: null
  };
}
async function verifyRideCode(rideId, code) {
  console.log(`Verifying code for ride ${rideId}: ${code}`);
  return true;
}
async function createSafetyAlert(alert) {
  console.log(`Creating safety alert: ${JSON.stringify(alert)}`);
  return {
    id: Math.floor(Math.random() * 1e4),
    ...alert,
    timestamp: /* @__PURE__ */ new Date(),
    resolvedBy: null,
    resolvedAt: null
  };
}
async function listUserSafetyAlerts(userId) {
  return [
    {
      id: 1,
      userId,
      rideId: 123,
      alertType: "safety_check",
      details: "Routine safety check",
      status: "resolved",
      timestamp: new Date(Date.now() - 864e5),
      // 1 day ago
      resolvedBy: userId,
      resolvedAt: new Date(Date.now() - 85e6)
    }
  ];
}
async function createTrustedContact(contact) {
  console.log(`Creating trusted contact: ${JSON.stringify(contact)}`);
  return {
    id: Math.floor(Math.random() * 1e4),
    ...contact,
    createdAt: /* @__PURE__ */ new Date()
  };
}
async function updateTrustedContact(contactId, updates) {
  console.log(`Updating trusted contact ${contactId}: ${JSON.stringify(updates)}`);
  return {
    id: contactId,
    userId: 1,
    // Mock user ID
    contactName: "Updated Contact",
    contactPhone: "+1234567890",
    contactEmail: updates.contactEmail || null,
    relationship: updates.relationship || "Family",
    isEmergencyContact: updates.isEmergencyContact || false,
    createdAt: /* @__PURE__ */ new Date()
  };
}
async function listUserTrustedContacts(userId) {
  return [
    {
      id: 1,
      userId,
      contactName: "Emergency Contact",
      contactPhone: "+1234567890",
      contactEmail: "emergency@example.com",
      relationship: "Family",
      isEmergencyContact: true,
      createdAt: new Date(Date.now() - 864e5)
      // 1 day ago
    }
  ];
}
async function updateUserEmergencyContact(userId, contactId) {
  console.log(`Setting emergency contact ${contactId} for user ${userId}`);
  await db.update(users).set({ emergencyContactId: contactId }).where(eq(users.id, userId));
  return { success: true };
}
async function listUserDrivingRides(userId) {
  return db.query.rides.findMany({
    where: eq(rides.driverId, userId),
    orderBy: [desc(rides.departureTime)]
  });
}
async function listRideBookings(rideId) {
  return db.query.bookings.findMany({
    where: eq(bookings.rideId, rideId)
  });
}

// server/auth.ts
function toPublicUser(user) {
  const { password: _password, ...publicUser } = user;
  return publicUser;
}
function limitFromEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
var credentialsLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  limit: limitFromEnv("AUTH_RATE_LIMIT", 10),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many attempts. Please try again later." }
});
var registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1e3,
  limit: limitFromEnv("REGISTRATION_RATE_LIMIT", 10),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many accounts created. Please try again later." }
});
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}
async function comparePasswords(supplied, stored) {
  return bcrypt.compare(supplied, stored);
}
function setupAuth(app2) {
  const isProduction = process.env.NODE_ENV === "production";
  const sessionSettings = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      // Only force Secure in production; local development runs over plain
      // HTTP and would otherwise never receive the cookie.
      secure: isProduction,
      // lax stops the cookie riding along on cross-site form posts, which is
      // the CSRF vector that matters for these endpoints.
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1e3
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        console.error("Authentication error:", error);
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      console.error("Deserialize user error:", error);
      done(error, null);
    }
  });
  app2.post("/api/register", registrationLimiter, async (req, res, next) => {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid registration details",
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
    }
    try {
      const existingUser = await storage.getUserByUsername(parsed.data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const user = await storage.createUser({
        ...parsed.data,
        password: await hashPassword(parsed.data.password)
      });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(toPublicUser(user));
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error during registration" });
    }
  });
  app2.post("/api/login", credentialsLimiter, (req, res, next) => {
    passport.authenticate("local", (err, user, _info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.login(user, (err2) => {
        if (err2) return next(err2);
        return res.json(toPublicUser(user));
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
  app2.get("/api/user", (req, res) => {
    if (req.user) {
      res.json(toPublicUser(req.user));
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
}

// server/safetyServices.ts
import { WebSocket } from "ws";
var safetyServices = {
  // Create a safety alert
  async createSafetyAlert(alert) {
    const alertWithId = { ...alert, id: Math.floor(Math.random() * 1e4) };
    if (alert.alertType === "emergency" /* EMERGENCY */) {
      await this.notifyEmergencyServices(alertWithId);
    }
    const ride = await storage.getRide(alert.rideId);
    if (!ride) throw new Error("Ride not found");
    if (ride.driverId !== alert.userId) {
      await storage.createMessage({
        senderId: alert.userId,
        receiverId: ride.driverId,
        content: `\u26A0\uFE0F SAFETY ALERT: ${this.getAlertMessage(alert)}`,
        rideId: alert.rideId,
        isRead: false
      });
    }
    await this.notifyTrustedContacts(alert.userId, alertWithId);
    return alertWithId;
  },
  // Resolve a safety alert
  async resolveSafetyAlert(alertId, resolvedBy) {
    const resolvedAlert = {
      id: alertId,
      userId: 1,
      // Mock user ID
      rideId: 1,
      // Mock ride ID
      alertType: "safety_check" /* SAFETY_CHECK */,
      details: "Issue resolved",
      timestamp: /* @__PURE__ */ new Date(),
      status: "resolved",
      resolvedBy,
      resolvedAt: /* @__PURE__ */ new Date()
    };
    return resolvedAlert;
  },
  // Notify emergency services (simulated)
  async notifyEmergencyServices(alert) {
    console.log(`EMERGENCY SERVICES NOTIFIED: ${JSON.stringify(alert)}`);
  },
  // Notify trusted contacts
  async notifyTrustedContacts(userId, alert) {
    console.log(`Notifying trusted contacts for user ${userId} about alert ${alert.id}`);
  },
  // Add a trusted contact
  async addTrustedContact(contact) {
    return { ...contact, id: Math.floor(Math.random() * 1e4) };
  },
  // Get user's trusted contacts
  async getTrustedContacts(userId) {
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
  async registerSafetyZone(zone) {
    return { ...zone, id: Math.floor(Math.random() * 1e4) };
  },
  // Get nearby safety zones
  async getNearbyZones(latitude, longitude, radiusKm) {
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
  async generateRideSafetyCode(rideId) {
    const code = Math.floor(1e5 + Math.random() * 9e5).toString();
    return code;
  },
  // Verify ride safety code
  async verifyRideSafetyCode(rideId, code) {
    return true;
  },
  // Helper method to get human-readable alert message
  getAlertMessage(alert) {
    switch (alert.alertType) {
      case "emergency" /* EMERGENCY */:
        return "Emergency alert triggered. Emergency services have been notified.";
      case "safety_check" /* SAFETY_CHECK */:
        return "Safety check requested. Please respond to confirm your safety.";
      case "location_deviation" /* LOCATION_DEVIATION */:
        return "Vehicle has deviated from expected route. Please verify with driver.";
      case "delayed_arrival" /* DELAYED_ARRIVAL */:
        return "Arrival significantly delayed. System monitoring situation.";
      case "behavioral_concern" /* BEHAVIORAL_CONCERN */:
        return "Behavioral concern reported. Stay vigilant and report any issues.";
      default:
        return "Safety alert triggered. Please take appropriate precautions.";
    }
  },
  // Broadcast safety alerts to connected WebSocket clients
  broadcastSafetyAlert(wss, alert) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "safety_alert",
          data: alert
        }));
      }
    });
  }
};

// server/pagination.ts
var DEFAULT_PAGE_SIZE = 20;
var MAX_PAGE_SIZE = 100;
function readPageParams(req) {
  const rawLimit = Number(req.query.limit);
  const rawOffset = Number(req.query.offset);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;
  return { limit, offset };
}
function buildPage(items, total, params) {
  return {
    items,
    total,
    limit: params.limit,
    offset: params.offset,
    hasMore: params.offset + items.length < total
  };
}

// server/routes.ts
import { ZodError } from "zod";

// shared/emissions.ts
var DEFAULT_EMISSION_FACTOR_KG_PER_KM = 0.15;
function resolveEmissionFactor(raw) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_EMISSION_FACTOR_KG_PER_KM;
}
var round = (value) => Math.round(value * 100) / 100;
function calculateEmissions(tripsAsPassenger, drives, emissionFactor = DEFAULT_EMISSION_FACTOR_KG_PER_KM) {
  let savedKg = 0;
  let enabledKg = 0;
  let distanceKm = 0;
  let ridesWithoutDistance = 0;
  for (const trip of tripsAsPassenger) {
    if (trip.distanceKm === null || !Number.isFinite(trip.distanceKm) || trip.distanceKm <= 0) {
      ridesWithoutDistance++;
      continue;
    }
    savedKg += trip.distanceKm * emissionFactor;
    distanceKm += trip.distanceKm;
  }
  for (const drive of drives) {
    if (drive.distanceKm === null || !Number.isFinite(drive.distanceKm) || drive.distanceKm <= 0) {
      ridesWithoutDistance++;
      continue;
    }
    distanceKm += drive.distanceKm;
    enabledKg += Math.max(0, drive.passengerSeats) * drive.distanceKm * emissionFactor;
  }
  return {
    savedKg: round(savedKg),
    enabledKg: round(enabledKg),
    totalImpactKg: round(savedKg + enabledKg),
    distanceKm: round(distanceKm),
    ridesWithoutDistance
  };
}

// server/routes.ts
function toKm(value) {
  if (value === null || value === void 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
function validationError(error) {
  if (error instanceof ZodError) {
    return {
      error: "Invalid request data",
      errors: error.issues.map((issue) => ({
        field: issue.path.join(".") || "(body)",
        message: issue.message
      }))
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { error: message || "Invalid request data" };
}
async function registerRoutes(app2) {
  setupAuth(app2);
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  app2.post("/api/rides", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const rideData = insertRideSchema.parse(req.body);
      const departureTime = new Date(rideData.departureTime);
      if (departureTime <= /* @__PURE__ */ new Date()) {
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
        distanceKm: rideData.distanceKm === void 0 ? null : String(rideData.distanceKm),
        carModel: rideData.carModel || null,
        carColor: rideData.carColor || null,
        licensePlate: rideData.licensePlate || null,
        preferences: rideData.preferences || null
      });
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
    } catch (error) {
      console.error("Ride creation error:", error);
      if (error.errors) {
        res.status(400).json({ error: error.errors[0].message });
      } else {
        res.status(400).json({ error: "Invalid ride data. Please check all fields and try again." });
      }
    }
  });
  app2.get("/api/rides", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const params = readPageParams(req);
    const [rides2, total] = await Promise.all([
      storage.listRides(params),
      storage.countRides()
    ]);
    res.json(buildPage(rides2, total, params));
  });
  app2.post("/api/bookings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const bookingData = insertBookingSchema.parse(req.body);
      const ride = await storage.getRide(bookingData.rideId ?? 0);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      if (new Date(ride.departureTime) < /* @__PURE__ */ new Date()) {
        return res.status(400).json({
          error: "This ride has already departed"
        });
      }
      if (ride.status === "cancelled") {
        return res.status(400).json({
          error: "This ride has been cancelled"
        });
      }
      if (ride.status === "full" || ride.seatsAvailable === 0) {
        return res.status(400).json({
          error: "This ride is fully booked"
        });
      }
      if (ride.driverId === req.user.id) {
        return res.status(400).json({
          error: "You cannot book your own ride"
        });
      }
      const existingBookings = await storage.listUserBookings(req.user.id);
      const alreadyBooked = existingBookings.some(
        (booking2) => booking2.rideId === ride.id && booking2.status !== "cancelled"
      );
      if (alreadyBooked) {
        return res.status(400).json({
          error: "You have already booked this ride"
        });
      }
      const updatedRide = await storage.reserveRideSeats(ride.id, bookingData.seats);
      if (!updatedRide) {
        const current = await storage.getRide(ride.id);
        return res.status(400).json({
          error: `Not enough seats available. Only ${current?.seatsAvailable ?? 0} seats left.`
        });
      }
      let booking;
      try {
        booking = await storage.createBooking({
          rideId: bookingData.rideId ?? 0,
          userId: req.user.id,
          seats: bookingData.seats,
          status: "confirmed",
          // Change from pending to confirmed
          paymentStatus: "pending",
          specialRequests: bookingData.specialRequests || null,
          pickupLocation: bookingData.pickupLocation || null,
          dropoffLocation: bookingData.dropoffLocation || null
        });
      } catch (bookingError) {
        await storage.releaseRideSeats(ride.id, bookingData.seats);
        throw bookingError;
      }
      await storage.updateUserPoints(req.user.id, 10);
      const reward = await storage.createReward({
        userId: req.user.id,
        type: "booking",
        points: 10,
        description: "Booked a ride",
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3)
        // 30 days from now
      });
      const booker = await storage.getUser(req.user.id);
      const bookerName = booker?.fullName || booker?.username || "A user";
      if (ride && ride.driverId) {
        const message = await storage.createMessage({
          senderId: req.user.id,
          receiverId: ride.driverId,
          content: `${bookerName} has booked ${bookingData.seats} seat(s) for your ride from ${ride.origin} to ${ride.destination}. You can contact them to coordinate.`,
          rideId: ride.id,
          isRead: false
        });
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket2.OPEN) {
            client.send(JSON.stringify({
              type: "notification",
              message
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
    } catch (error) {
      console.error("Booking error:", error);
      res.status(400).json(validationError(error));
    }
  });
  app2.get("/api/bookings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const bookings2 = await storage.listUserBookings(req.user.id);
    res.json(bookings2);
  });
  app2.get("/api/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const messages2 = await storage.listUserMessages(req.user.id);
    res.json(messages2);
  });
  app2.get("/api/messages/unread", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const count = await storage.getUnreadMessageCount(req.user.id);
    res.json({ count });
  });
  app2.post("/api/messages/:id/read", async (req, res) => {
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
  app2.get("/api/rewards", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rewards2 = await storage.listUserRewards(req.user.id);
    res.json(rewards2);
  });
  app2.post("/api/safety/alerts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const alertData = insertSafetyAlertSchema.parse(req.body);
      const alert = await safetyServices.createSafetyAlert({
        userId: req.user.id,
        rideId: alertData.rideId ?? 0,
        alertType: alertData.alertType,
        details: alertData.details || "",
        latitude: alertData.latitude,
        longitude: alertData.longitude,
        timestamp: /* @__PURE__ */ new Date(),
        status: "active"
      });
      safetyServices.broadcastSafetyAlert(wss, alert);
      res.status(201).json(alert);
    } catch (error) {
      console.error("Safety alert creation error:", error);
      res.status(400).json(validationError(error));
    }
  });
  app2.get("/api/safety/alerts/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const alerts = [
        {
          id: 1,
          userId: req.user.id,
          rideId: 1,
          alertType: "safety_check" /* SAFETY_CHECK */,
          details: "Routine safety check",
          timestamp: /* @__PURE__ */ new Date(),
          status: "resolved",
          resolvedAt: /* @__PURE__ */ new Date()
        }
      ];
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching safety alerts:", error);
      res.status(500).json({ error: "Failed to fetch safety alerts" });
    }
  });
  app2.post("/api/safety/alerts/:id/resolve", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const alertId = parseInt(req.params.id);
      if (isNaN(alertId)) {
        return res.status(400).json({ error: "Invalid alert ID" });
      }
      const resolvedAlert = await safetyServices.resolveSafetyAlert(alertId, req.user.id);
      res.json(resolvedAlert);
    } catch (error) {
      console.error("Error resolving safety alert:", error);
      res.status(500).json({ error: "Failed to resolve safety alert" });
    }
  });
  app2.post("/api/safety/contacts", async (req, res) => {
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
      if (contact.isEmergencyContact && contact.id) {
        await storage.updateUserProfile(req.user.id, {
          emergencyContactId: contact.id
        });
      }
      res.status(201).json(contact);
    } catch (error) {
      console.error("Trusted contact creation error:", error);
      res.status(400).json(validationError(error));
    }
  });
  app2.get("/api/safety/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const contacts = await safetyServices.getTrustedContacts(req.user.id);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching trusted contacts:", error);
      res.status(500).json({ error: "Failed to fetch trusted contacts" });
    }
  });
  app2.post("/api/safety/zones", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const zoneData = insertSafetyZoneSchema.parse(req.body);
      const zone = await safetyServices.registerSafetyZone({
        name: zoneData.name,
        description: zoneData.description || "",
        latitude: zoneData.latitude,
        longitude: zoneData.longitude,
        radiusMeters: zoneData.radiusMeters,
        createdBy: req.user.id,
        isVerified: false
      });
      res.status(201).json(zone);
    } catch (error) {
      console.error("Safety zone creation error:", error);
      res.status(400).json(validationError(error));
    }
  });
  app2.get("/api/safety/zones/nearby", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { latitude, longitude, radius } = req.query;
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const rad = parseFloat(radius) || 5;
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "Invalid coordinates" });
      }
      const zones = await safetyServices.getNearbyZones(lat, lng, rad);
      res.json(zones);
    } catch (error) {
      console.error("Error fetching nearby safety zones:", error);
      res.status(500).json({ error: "Failed to fetch nearby safety zones" });
    }
  });
  app2.post("/api/rides/:id/verify-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const rideId = parseInt(req.params.id);
      if (isNaN(rideId)) {
        return res.status(400).json({ error: "Invalid ride ID" });
      }
      const code = await safetyServices.generateRideSafetyCode(rideId);
      await storage.createRideVerification(rideId, req.user.id, code);
      res.json({ code });
    } catch (error) {
      console.error("Error generating verification code:", error);
      res.status(500).json({ error: "Failed to generate verification code" });
    }
  });
  app2.post("/api/rides/:id/confirm-code", async (req, res) => {
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
        await storage.updateUserPoints(req.user.id, 5);
        await storage.createReward({
          userId: req.user.id,
          type: "safety_verification",
          points: 5,
          description: "Verified ride with safety code",
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3)
          // 30 days from now
        });
        res.json({ success: true, message: "Ride verification successful" });
      } else {
        res.status(400).json({ success: false, error: "Invalid verification code" });
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      res.status(500).json({ error: "Failed to verify code" });
    }
  });
  app2.post("/api/rides/:id/start", async (req, res) => {
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
      const updatedRide = await storage.updateRideStatus(rideId, "in_progress");
      const bookings2 = await storage.listRideBookings(rideId);
      for (const booking of bookings2) {
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
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket2.OPEN && client.userId) {
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
  app2.post("/api/rides/:id/location", async (req, res) => {
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
      await storage.storeLocationUpdate(rideId, userId, latitude, longitude);
      const progress = Math.min(100, Math.random() * 70 + 10);
      const now = /* @__PURE__ */ new Date();
      const estimatedArrivalTime = new Date(now.getTime() + Math.floor(Math.random() * 30 + 15) * 6e4);
      const durationMinutes = Math.floor((estimatedArrivalTime.getTime() - now.getTime()) / 6e4);
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket2.OPEN) {
          client.send(JSON.stringify({
            type: "location_update",
            rideId,
            location: {
              latitude,
              longitude,
              updatedAt: (/* @__PURE__ */ new Date()).toISOString()
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
  const requireAuthMiddleware = (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    next();
  };
  app2.get("/api/rides/:id/details", requireAuthMiddleware, async (req, res) => {
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
      const lastLocation = await storage.getLastLocationUpdate(rideId);
      const bookings2 = await storage.listRideBookings(rideId);
      const passengerCount = bookings2.filter((b) => b.status === "confirmed").reduce((sum, b) => sum + b.seats, 0);
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
        estimatedArrival: new Date((/* @__PURE__ */ new Date()).getTime() + 15 * 6e4).toISOString(),
        // 15 min from now as example
        currentLocation: lastLocation,
        progress: lastLocation ? 35 : 0,
        // Example progress percentage
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
  app2.get("/api/rides/active", requireAuthMiddleware, async (req, res) => {
    const userId = req.user.id;
    try {
      const driverRides = (await storage.listUserDrivingRides(userId)).filter(
        (ride) => ride.status === "pending" || ride.status === "in_progress"
      );
      const userBookings = await storage.listUserBookings(userId);
      const passengerRideIds = userBookings.filter((booking) => booking.status === "confirmed" || booking.status === "pending").map((booking) => booking.rideId);
      const passengerRides = (await storage.getRidesByIds(
        passengerRideIds.filter((id) => typeof id === "number")
      )).filter((ride) => ride.status === "pending" || ride.status === "in_progress");
      const activeRides = [
        ...driverRides.map((ride) => ({
          id: ride.id,
          origin: ride.origin,
          destination: ride.destination,
          departureTime: ride.departureTime,
          status: ride.status,
          isDriver: true
        })),
        ...passengerRides.map((ride) => ({
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
  app2.post("/api/rides/:id/verify-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rideId = parseInt(req.params.id);
    const userId = req.user.id;
    try {
      const ride = await storage.getRide(rideId ?? 0);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      const code = Math.floor(1e5 + Math.random() * 9e5).toString();
      await storage.createRideVerification(rideId, userId, code);
      res.json({ code });
    } catch (error) {
      console.error("Error generating verification code:", error);
      res.status(500).json({ error: "Failed to generate verification code" });
    }
  });
  app2.post("/api/rides/:id/confirm-code", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rideId = parseInt(req.params.id);
    const userId = req.user.id;
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Verification code is required" });
    }
    try {
      const verified = await storage.verifyRideCode(rideId, code);
      if (!verified) {
        return res.status(400).json({ error: "Invalid verification code" });
      }
      await storage.updateUserPoints(userId, 10);
      await storage.createReward({
        userId,
        type: "safety_verification",
        points: 10,
        description: "Completed ride verification",
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1e3)
        // 90 days from now
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error confirming verification code:", error);
      res.status(500).json({ error: "Failed to confirm verification code" });
    }
  });
  app2.post("/api/safety/alerts", async (req, res) => {
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
      const alert = await safetyServices.createSafetyAlert({
        userId,
        rideId,
        alertType,
        details: details || "",
        latitude,
        longitude,
        timestamp: /* @__PURE__ */ new Date(),
        status: "active"
      });
      safetyServices.broadcastSafetyAlert(wss, alert);
      if (alertType === "emergency") {
        const trustedContacts2 = await safetyServices.getTrustedContacts(userId);
        for (const contact of trustedContacts2) {
          console.log(`Would send emergency notification to ${contact.contactName} at ${contact.contactPhone}`);
        }
      }
      if (userId === ride.driverId) {
        const bookings2 = await storage.listRideBookings(rideId);
        for (const booking of bookings2) {
          if (booking.status === "confirmed") {
            await storage.createMessage({
              senderId: userId,
              receiverId: booking.userId,
              content: `SAFETY ALERT: ${safetyServices.getAlertMessage({ alertType })}`,
              rideId,
              isRead: false
            });
          }
        }
      } else {
        await storage.createMessage({
          senderId: userId,
          receiverId: ride.driverId,
          content: `SAFETY ALERT: ${safetyServices.getAlertMessage({ alertType })}`,
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
  app2.get("/api/safety/alerts/user", async (req, res) => {
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
  app2.post("/api/safety/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user.id;
    const { contactName, contactPhone, contactEmail, relationship, isEmergencyContact } = req.body;
    if (!contactName || !contactPhone || !relationship) {
      return res.status(400).json({ error: "Name, phone, and relationship are required" });
    }
    try {
      if (isEmergencyContact) {
        const existingContacts = await storage.listUserTrustedContacts(userId);
        const existingEmergencyContact = existingContacts.find((c) => c.isEmergencyContact);
        if (existingEmergencyContact) {
          await storage.updateTrustedContact(existingEmergencyContact.id, {
            isEmergencyContact: false
          });
        }
      }
      const contact = await storage.createTrustedContact({
        userId,
        contactName,
        contactPhone,
        contactEmail: contactEmail || null,
        relationship,
        isEmergencyContact: isEmergencyContact || false
      });
      if (isEmergencyContact) {
        await storage.updateUserEmergencyContact(userId, contact.id);
      }
      res.json(contact);
    } catch (error) {
      console.error("Error creating trusted contact:", error);
      res.status(500).json({ error: "Failed to create trusted contact" });
    }
  });
  app2.get("/api/safety/contacts", async (req, res) => {
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
  app2.get("/api/rides/recommended", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user.id;
    try {
      const userBookings = await storage.listUserBookings(userId);
      const rideTakenIds = userBookings.map((booking) => booking.rideId);
      const takenRides = await storage.getRidesByIds(
        rideTakenIds.filter((id) => typeof id === "number")
      );
      const allRides = await storage.listRides({ limit: 200, offset: 0 });
      const availableRides = allRides.filter(
        (ride) => ride.driverId !== userId && ride.status === "pending" && new Date(ride.departureTime) > /* @__PURE__ */ new Date() && !userBookings.some((b) => b.rideId === ride.id && b.status !== "cancelled")
      );
      let recommendedRides = [];
      if (takenRides.length > 0) {
        const destinationCounts = {};
        const originCounts = {};
        takenRides.forEach((ride) => {
          const destination = ride.destination;
          const origin = ride.origin;
          destinationCounts[destination] = (destinationCounts[destination] || 0) + 1;
          originCounts[origin] = (originCounts[origin] || 0) + 1;
        });
        const popularDestinations = Object.entries(destinationCounts).sort((a, b) => b[1] - a[1]).map((entry) => entry[0]);
        const popularOrigins = Object.entries(originCounts).sort((a, b) => b[1] - a[1]).map((entry) => entry[0]);
        recommendedRides = availableRides.filter(
          (ride) => popularOrigins.includes(ride.origin) && popularDestinations.includes(ride.destination)
        );
        if (recommendedRides.length < 5) {
          const originMatches = availableRides.filter(
            (ride) => popularOrigins.includes(ride.origin) && !recommendedRides.some((r) => r.id === ride.id)
          );
          recommendedRides = [...recommendedRides, ...originMatches].slice(0, 5);
        }
        if (recommendedRides.length < 5) {
          const destMatches = availableRides.filter(
            (ride) => popularDestinations.includes(ride.destination) && !recommendedRides.some((r) => r.id === ride.id)
          );
          recommendedRides = [...recommendedRides, ...destMatches].slice(0, 5);
        }
      }
      if (recommendedRides.length < 5) {
        const recentRides = availableRides.filter((ride) => !recommendedRides.some((r) => r.id === ride.id)).sort((a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime()).slice(0, 5 - recommendedRides.length);
        recommendedRides = [...recommendedRides, ...recentRides];
      }
      res.json(recommendedRides);
    } catch (error) {
      console.error("Error generating ride recommendations:", error);
      res.status(500).json({ error: "Failed to generate ride recommendations" });
    }
  });
  app2.get("/api/user/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user.id;
    try {
      const user = await storage.getUser(userId);
      const userBookings = await storage.listUserBookings(userId);
      const completedBookings = userBookings.filter((b) => b.status === "completed");
      const userDrivingRides = await storage.listUserDrivingRides(userId);
      const completedDrivingRides = userDrivingRides.filter((r) => r.status === "completed");
      const bookedRideIds = completedBookings.map((booking) => booking.rideId).filter((id) => typeof id === "number");
      const bookedRides = await storage.getRidesByIds(bookedRideIds);
      const rideById = new Map(bookedRides.map((ride) => [ride.id, ride]));
      const seatsSoldByRide = await storage.countConfirmedSeatsByRide(
        completedDrivingRides.map((ride) => ride.id)
      );
      const emissions = calculateEmissions(
        completedBookings.map((booking) => {
          const ride = booking.rideId === null ? void 0 : rideById.get(booking.rideId);
          return { distanceKm: toKm(ride?.distanceKm), seats: booking.seats };
        }),
        completedDrivingRides.map((ride) => ({
          distanceKm: toKm(ride.distanceKm),
          passengerSeats: seatsSoldByRide.get(ride.id) ?? 0
        })),
        resolveEmissionFactor(process.env.EMISSION_FACTOR_KG_PER_KM)
      );
      const userReviews = await storage.listUserReviews(userId);
      const avgRating = userReviews.length > 0 ? userReviews.reduce((sum, review) => sum + Number(review.rating), 0) / userReviews.length : 5;
      const userRewards = await storage.listUserRewards(userId);
      const totalRewardPoints = userRewards.reduce((sum, reward) => sum + reward.points, 0);
      const stats = {
        totalRides: completedBookings.length + completedDrivingRides.length,
        ridesAsPassenger: completedBookings.length,
        ridesAsDriver: completedDrivingRides.length,
        // Emissions this user personally avoided by not driving.
        co2SavedKg: emissions.savedKg,
        // Emissions their passengers avoided on rides this user drove. Kept
        // separate so the two are never summed into a double-counted total.
        co2EnabledKg: emissions.enabledKg,
        co2ImpactKg: emissions.totalImpactKg,
        distanceTraveledKm: emissions.distanceKm,
        // Completed journeys with no recorded distance, excluded above.
        ridesWithoutDistance: emissions.ridesWithoutDistance,
        emissionFactorKgPerKm: resolveEmissionFactor(process.env.EMISSION_FACTOR_KG_PER_KM),
        avgRating,
        totalRewardPoints,
        safetyVerificationsCompleted: userRewards.filter((r) => r.type === "safety_verification").length
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ error: "Failed to fetch user statistics" });
    }
  });
  wss.on("connection", (ws2, req) => {
    console.log("WebSocket client connected");
    ws2.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "subscribe") {
          console.log(`Client subscribing to ${data.channel}`);
          ws2.channel = data.channel;
          ws2.userId = data.userId;
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });
    ws2.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });
  return httpServer;
}

// server/serverless.ts
var app = express2();
applyHardening(app);
app.set("trust proxy", 1);
var initialised = null;
function ensureInitialised() {
  if (!initialised) {
    initialised = registerRoutes(app).then(() => {
      app.get("/health", (_req, res) => {
        db.execute(sql2`SELECT 1`).then(() => {
          res.status(200).json({
            status: "healthy",
            database: "connected",
            environment: process.env.NODE_ENV || "development"
          });
        }).catch((err) => {
          console.error("Health check database error:", err);
          res.status(500).json({
            status: "unhealthy",
            database: "disconnected",
            error: "Database connection failed"
          });
        });
      });
      app.use(
        (err, _req, res, _next) => {
          console.error("Unhandled error:", err);
          res.status(500).json({
            error: "Server error",
            message: process.env.NODE_ENV === "production" ? "An unexpected error occurred" : err.message
          });
        }
      );
    });
  }
  return initialised;
}
async function handler(req, res) {
  await ensureInitialised();
  return app(req, res);
}
export {
  handler as default
};
