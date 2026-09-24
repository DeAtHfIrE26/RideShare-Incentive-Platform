import { relations } from "drizzle-orm";
import { boolean, decimal, index, integer, json, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enhanced user table with more profile fields
export const users = pgTable("users", {
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
  emergencyContactId: integer("emergency_contact_id"),
});

export const rides = pgTable("rides", {
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
  preferences: text("preferences"), // e.g., "no smoking", "music", etc.
  routeDetails: text("route_details"),
  estimatedDuration: text("estimated_duration"),
  /**
   * Route length in kilometres. Required for any honest emissions or distance
   * figure: the dashboard previously multiplied ride counts by invented
   * constants because the real distance was not stored anywhere.
   */
  distanceKm: decimal("distance_km"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Browsing open rides orders by departure and filters on status.
  statusDepartureIdx: index("rides_status_departure_idx").on(table.status, table.departureTime),
  driverIdx: index("rides_driver_id_idx").on(table.driverId),
}));

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").references(() => rides.id),
  userId: integer("user_id").references(() => users.id),
  seats: integer("seats").notNull(),
  status: text("status").default("pending"),
  specialRequests: text("special_requests"),
  pickupLocation: text("pickup_location"),
  dropoffLocation: text("dropoff_location"),
  paymentStatus: text("payment_status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  rideIdx: index("bookings_ride_id_idx").on(table.rideId),
  userIdx: index("bookings_user_id_idx").on(table.userId),
  // "has this user already booked this ride" is checked on every booking.
  rideUserIdx: index("bookings_ride_user_idx").on(table.rideId, table.userId),
}));

export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  type: text("type").notNull(),
  points: integer("points").notNull(),
  description: text("description").notNull(),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("rewards_user_id_idx").on(table.userId),
}));

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id),
  content: text("content").notNull(),
  rideId: integer("ride_id").references(() => rides.id),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  senderIdx: index("messages_sender_id_idx").on(table.senderId),
  // Unread counts poll this pair every 30 seconds from the sidebar.
  receiverReadIdx: index("messages_receiver_read_idx").on(table.receiverId, table.isRead),
  rideIdx: index("messages_ride_id_idx").on(table.rideId),
}));

// Reviews for both drivers and passengers
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  reviewerId: integer("reviewer_id").references(() => users.id),
  reviewedId: integer("reviewed_id").references(() => users.id),
  rideId: integer("ride_id").references(() => rides.id),
  rating: decimal("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  reviewedIdx: index("reviews_reviewed_id_idx").on(table.reviewedId),
  reviewerIdx: index("reviews_reviewer_id_idx").on(table.reviewerId),
}));

// New safety-related tables

export const safetyAlerts = pgTable("safety_alerts", {
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
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("safety_alerts_user_id_idx").on(table.userId),
  rideIdx: index("safety_alerts_ride_id_idx").on(table.rideId),
  statusIdx: index("safety_alerts_status_idx").on(table.status),
}));

export const trustedContacts = pgTable("trusted_contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  contactName: text("contact_name").notNull(),
  contactPhone: text("contact_phone").notNull(),
  contactEmail: text("contact_email"),
  relationship: text("relationship").notNull(),
  isEmergencyContact: boolean("is_emergency_contact").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userIdx: index("trusted_contacts_user_id_idx").on(table.userId),
}));

export const safetyZones = pgTable("safety_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  latitude: decimal("latitude").notNull(),
  longitude: decimal("longitude").notNull(),
  radiusMeters: integer("radius_meters").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rideVerifications = pgTable("ride_verifications", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").references(() => rides.id),
  passengerId: integer("passenger_id").references(() => users.id),
  verificationCode: text("verification_code").notNull(),
  verified: boolean("verified").default(false),
  generatedAt: timestamp("generated_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
});

// New relations for safety features
export const usersRelations = relations(users, ({ many, one }) => ({
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
  }),
}));

export const ridesRelations = relations(rides, ({ one, many }) => ({
  driver: one(users, { fields: [rides.driverId], references: [users.id] }),
  bookings: many(bookings),
  messages: many(messages),
  reviews: many(reviews),
  safetyAlerts: many(safetyAlerts),
  verifications: many(rideVerifications),
}));

// Additional relations for safety tables
export const safetyAlertsRelations = relations(safetyAlerts, ({ one }) => ({
  user: one(users, { fields: [safetyAlerts.userId], references: [users.id] }),
  ride: one(rides, { fields: [safetyAlerts.rideId], references: [rides.id] }),
  resolver: one(users, { fields: [safetyAlerts.resolvedBy], references: [users.id] }),
}));

export const trustedContactsRelations = relations(trustedContacts, ({ one }) => ({
  user: one(users, { fields: [trustedContacts.userId], references: [users.id] }),
}));

export const safetyZonesRelations = relations(safetyZones, ({ one }) => ({
  creator: one(users, { fields: [safetyZones.createdBy], references: [users.id] }),
}));

export const rideVerificationsRelations = relations(rideVerifications, ({ one }) => ({
  ride: one(rides, { fields: [rideVerifications.rideId], references: [rides.id] }),
  passenger: one(users, { fields: [rideVerifications.passengerId], references: [users.id] }),
}));

// Schema for safety alerts creation
export const insertSafetyAlertSchema = createInsertSchema(safetyAlerts)
  .pick({
    userId: true,
    rideId: true,
    alertType: true,
    details: true,
    latitude: true,
    longitude: true,
  })
  .extend({
    alertType: z.enum([
      "emergency", 
      "safety_check", 
      "location_deviation", 
      "delayed_arrival", 
      "behavioral_concern"
    ]),
    details: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  });

// Schema for trusted contacts
export const insertTrustedContactSchema = createInsertSchema(trustedContacts)
  .pick({
    userId: true,
    contactName: true,
    contactPhone: true,
    contactEmail: true,
    relationship: true,
    isEmergencyContact: true,
  })
  .extend({
    contactName: z.string().min(1, "Contact name is required"),
    contactPhone: z.string().min(10, "Valid phone number is required"),
    contactEmail: z.string().email("Invalid email format").optional(),
    relationship: z.string().min(1, "Relationship is required"),
    isEmergencyContact: z.boolean().optional(),
  });

// Schema for safety zones
export const insertSafetyZoneSchema = createInsertSchema(safetyZones)
  .pick({
    name: true,
    description: true,
    latitude: true,
    longitude: true,
    radiusMeters: true,
    createdBy: true,
  })
  .extend({
    name: z.string().min(1, "Zone name is required"),
    description: z.string().optional(),
    latitude: z.number(),
    longitude: z.number(),
    radiusMeters: z.number().int().min(10, "Radius must be at least 10 meters"),
  });

// Schema for user registration with enhanced validation
export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    email: true,
    fullName: true,
    phoneNumber: true,
  })
  .extend({
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    phoneNumber: z.string().optional(),
    fullName: z.string().optional(),
  });

// Enhanced ride creation schema
export const insertRideSchema = createInsertSchema(rides)
  .pick({
    origin: true,
    destination: true,
    departureTime: true,
    seatsAvailable: true,
    price: true,
    carModel: true,
    carColor: true,
    licensePlate: true,
    preferences: true,
    distanceKm: true,
  })
  .extend({
    // Optional: a ride without a known distance is excluded from emissions and
    // distance statistics rather than having a value invented for it.
    distanceKm: z
      .number()
      .positive("Distance must be greater than zero")
      .max(5000, "Distance looks implausible")
      .optional(),
    origin: z.string().min(1, "Origin is required").max(100),
    destination: z.string().min(1, "Destination is required").max(100),
    departureTime: z.string().refine((val) => {
      const date = new Date(val);
      return date > new Date();
    }, "Departure time must be in the future"),
    seatsAvailable: z.number().int().min(1, "At least 1 seat required").max(8, "Maximum 8 seats allowed"),
    price: z.number().min(0, "Price cannot be negative").multipleOf(0.01, "Price must be in valid currency format"),
    carModel: z.string().optional(),
    carColor: z.string().optional(),
    licensePlate: z.string().optional(),
    preferences: z.string().optional(),
  });

export const insertBookingSchema = createInsertSchema(bookings)
  .pick({
    rideId: true,
    seats: true,
    specialRequests: true,
    pickupLocation: true,
    dropoffLocation: true,
  })
  .extend({
    // drizzle-zod infers a bare integer here, which accepted 0 and created a
    // confirmed booking for no seats. Bounded to match the per-ride maximum.
    seats: z
      .number()
      .int()
      .min(1, "At least 1 seat is required")
      .max(8, "Maximum 8 seats allowed"),
    specialRequests: z.string().optional(),
    pickupLocation: z.string().optional(),
    dropoffLocation: z.string().optional(),
  });

export const insertReviewSchema = createInsertSchema(reviews)
  .pick({
    rating: true,
    comment: true,
  })
  .extend({
    rating: z.number().min(1).max(5),
    comment: z.string().optional(),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Ride = typeof rides.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Reward = typeof rewards.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type SafetyAlert = typeof safetyAlerts.$inferSelect;
export type TrustedContact = typeof trustedContacts.$inferSelect;
export type SafetyZone = typeof safetyZones.$inferSelect;
export type RideVerification = typeof rideVerifications.$inferSelect;