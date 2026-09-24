import { z } from "zod";

/**
 * Seed configuration.
 *
 * Every quantity the generators use lives here rather than in the generator
 * bodies, so the dataset can be reshaped without touching generation logic.
 * Values are overridable by environment variable for CI or a larger demo.
 */
export const seedConfigSchema = z.object({
  /**
   * Fixed faker seed. The same value produces the same dataset on every run,
   * so a demo can be rehearsed and a bug in generated data reproduced.
   */
  randomSeed: z.number().int(),

  /** Usernames are prefixed with this, which is how reset.ts finds them. */
  usernamePrefix: z.string().min(1),

  /** Shared across all demo accounts; printed at the end of a run. */
  demoPassword: z.string().min(8),

  users: z.object({
    total: z.number().int().min(4),
    /** Share of users who also publish rides. */
    driverRatio: z.number().min(0).max(1),
  }),

  rides: z.object({
    completed: z.number().int().min(0),
    inProgress: z.number().int().min(0),
    upcoming: z.number().int().min(0),
    /** Departure times are drawn from these windows, in days from now. */
    historyWindowDays: z.number().int().min(1),
    upcomingWindowDays: z.number().int().min(1),
    seatsMin: z.number().int().min(1).max(8),
    seatsMax: z.number().int().min(1).max(8),
  }),

  bookings: z.object({
    /** Fraction of a completed ride's seats that ended up booked. */
    pastFillMin: z.number().min(0).max(1),
    pastFillMax: z.number().min(0).max(1),
    /** Fraction of upcoming rides that already have at least one booking. */
    upcomingBookedRatio: z.number().min(0).max(1),
  }),

  engagement: z.object({
    /** Probability a completed booking produces a review in each direction. */
    reviewRatio: z.number().min(0).max(1),
    /** Messages exchanged per booking thread. */
    messagesPerThreadMin: z.number().int().min(0),
    messagesPerThreadMax: z.number().int().min(0),
    /** Users who register trusted contacts. */
    trustedContactRatio: z.number().min(0).max(1),
    safetyZones: z.number().int().min(0),
    resolvedAlerts: z.number().int().min(0),
  }),

  /** Points awarded per completed booking, mirroring the booking route. */
  pointsPerBooking: z.number().int().min(0),
});

export type SeedConfig = z.infer<typeof seedConfigSchema>;

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function loadConfig(): SeedConfig {
  return seedConfigSchema.parse({
    randomSeed: num("SEED_RANDOM_SEED", 20260924),
    usernamePrefix: process.env.SEED_USERNAME_PREFIX ?? "demo_",
    demoPassword: process.env.DEMO_PASSWORD ?? "RideShareDemo2026!",
    users: {
      total: num("SEED_USERS", 40),
      driverRatio: num("SEED_DRIVER_RATIO", 0.55),
    },
    rides: {
      completed: num("SEED_RIDES_COMPLETED", 70),
      inProgress: num("SEED_RIDES_IN_PROGRESS", 4),
      upcoming: num("SEED_RIDES_UPCOMING", 46),
      historyWindowDays: num("SEED_HISTORY_DAYS", 60),
      upcomingWindowDays: num("SEED_UPCOMING_DAYS", 14),
      seatsMin: num("SEED_SEATS_MIN", 2),
      seatsMax: num("SEED_SEATS_MAX", 6),
    },
    bookings: {
      pastFillMin: num("SEED_PAST_FILL_MIN", 0.4),
      pastFillMax: num("SEED_PAST_FILL_MAX", 1),
      upcomingBookedRatio: num("SEED_UPCOMING_BOOKED_RATIO", 0.45),
    },
    engagement: {
      reviewRatio: num("SEED_REVIEW_RATIO", 0.7),
      messagesPerThreadMin: num("SEED_MSG_MIN", 2),
      messagesPerThreadMax: num("SEED_MSG_MAX", 6),
      trustedContactRatio: num("SEED_TRUSTED_CONTACT_RATIO", 0.5),
      safetyZones: num("SEED_SAFETY_ZONES", 6),
      resolvedAlerts: num("SEED_RESOLVED_ALERTS", 3),
    },
    pointsPerBooking: num("SEED_POINTS_PER_BOOKING", 10),
  });
}
