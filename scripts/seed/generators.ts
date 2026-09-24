import type { Faker } from "@faker-js/faker";
import type { SeedConfig } from "./config";
import {
  CAR_COLOURS, CAR_MODELS, CONTACT_RELATIONSHIPS, CORRIDORS, DRIVER_REPLIES,
  FOLLOW_UPS, MIXED_REVIEWS, PASSENGER_OPENERS, PICKUP_LANDMARKS,
  POSITIVE_REVIEWS, REWARD_KINDS, RIDE_PREFERENCES, SAFETY_ZONE_KINDS,
} from "./reference";

/**
 * Pure generators. Nothing here touches the database or the clock directly:
 * every call takes a seeded Faker and a `now`, so output is deterministic and
 * each function can be exercised in isolation.
 *
 * Ids are assigned after insertion, so generated rows carry array indices and
 * the orchestrator maps them to real ids.
 */

export interface PlannedUser {
  username: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  bio: string | null;
  isDriver: boolean;
  verifiedDriver: boolean;
  identityVerified: boolean;
  rating: string;
}

export interface PlannedRide {
  driverIndex: number;
  origin: string;
  destination: string;
  departureTime: Date;
  /** Seats the driver originally offered. seatsAvailable is derived later. */
  capacity: number;
  price: string;
  status: "completed" | "in_progress" | "pending";
  carModel: string;
  carColor: string;
  licensePlate: string;
  preferences: string;
  routeDetails: string;
  estimatedDuration: string;
  createdAt: Date;
}

export interface PlannedBooking {
  rideIndex: number;
  userIndex: number;
  seats: number;
  status: "completed" | "confirmed";
  paymentStatus: "paid" | "pending";
  specialRequests: string | null;
  pickupLocation: string;
  dropoffLocation: string;
  createdAt: Date;
}

const pick = <T>(faker: Faker, items: readonly T[]): T =>
  items[faker.number.int({ min: 0, max: items.length - 1 })];

/** Indian plates: two letter state, two digit district, two letters, four digits. */
function licensePlate(faker: Faker): string {
  const states = ["MH", "DL", "KA", "GJ", "TN", "TS", "WB", "RJ", "UP", "HR"];
  const letters = faker.string.alpha({ length: 2, casing: "upper" });
  const district = String(faker.number.int({ min: 1, max: 48 })).padStart(2, "0");
  const digits = String(faker.number.int({ min: 1, max: 9999 })).padStart(4, "0");
  return `${pick(faker, states)}${district}${letters}${digits}`;
}

function slugify(name: string, faker: Faker): string {
  const base = name.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
  return `${base}_${faker.string.alphanumeric({ length: 3, casing: "lower" })}`;
}

export function generateUsers(faker: Faker, config: SeedConfig): PlannedUser[] {
  const users: PlannedUser[] = [];

  for (let i = 0; i < config.users.total; i++) {
    const fullName = faker.person.fullName();
    // The first two accounts are the ones demoed from, so they are always
    // drivers and always verified: their dashboards need to look complete.
    const isHero = i < 2;
    const isDriver = isHero || faker.number.float() < config.users.driverRatio;

    // The two demo accounts get stable, typeable usernames: they are entered
    // by hand in front of an audience. Everyone else is generated.
    const HERO_HANDLES = ["driver", "rider"];

    users.push({
      username: isHero
        ? `${config.usernamePrefix}${HERO_HANDLES[i]}`
        : `${config.usernamePrefix}${slugify(fullName, faker)}`,
      email: faker.internet.email({ firstName: fullName.split(" ")[0] }).toLowerCase(),
      fullName,
      phoneNumber: faker.phone.number({ style: "international" }),
      bio: faker.datatype.boolean({ probability: 0.6 })
        ? faker.helpers.arrayElement([
            "Commutes this route most weeks. Happy to share the drive.",
            "Weekend traveller. Prefer an early start.",
            "Regular intercity commuter, flexible on pickup points.",
            "Student travelling home on holidays.",
          ])
        : null,
      isDriver,
      verifiedDriver: isDriver && (isHero || faker.datatype.boolean({ probability: 0.7 })),
      identityVerified: isHero || faker.datatype.boolean({ probability: 0.6 }),
      rating: (isHero ? 4.8 : faker.number.float({ min: 4, max: 5, fractionDigits: 1 })).toFixed(1),
    });
  }

  return users;
}

export function generateRides(
  faker: Faker,
  config: SeedConfig,
  users: PlannedUser[],
  now: Date,
): PlannedRide[] {
  const driverIndices = users.map((u, i) => (u.isDriver ? i : -1)).filter((i) => i >= 0);
  const rides: PlannedRide[] = [];

  const build = (status: PlannedRide["status"], departureTime: Date): PlannedRide => {
    const corridor = pick(faker, CORRIDORS);
    // Heroes drive a disproportionate share so their history looks substantial.
    const driverIndex = faker.datatype.boolean({ probability: 0.25 })
      ? pick(faker, driverIndices.filter((i) => i < 2))
      : pick(faker, driverIndices);

    const capacity = faker.number.int({
      min: config.rides.seatsMin,
      max: config.rides.seatsMax,
    });

    // Fare tracks the corridor's base rate with a modest spread.
    const price = corridor.basePrice * faker.number.float({ min: 0.85, max: 1.2 });

    return {
      driverIndex,
      origin: corridor.origin,
      destination: corridor.destination,
      departureTime,
      capacity,
      price: (Math.round(price / 10) * 10).toFixed(2),
      status,
      carModel: pick(faker, CAR_MODELS),
      carColor: pick(faker, CAR_COLOURS),
      licensePlate: licensePlate(faker),
      preferences: faker.helpers
        .arrayElements(RIDE_PREFERENCES, faker.number.int({ min: 1, max: 3 }))
        .join(", "),
      routeDetails: `${corridor.distanceKm} km via the ${corridor.origin}-${corridor.destination} highway`,
      estimatedDuration: corridor.duration,
      // Rides are published somewhere between a day and three weeks ahead.
      createdAt: new Date(
        departureTime.getTime() - faker.number.int({ min: 1, max: 21 }) * 86_400_000,
      ),
    };
  };

  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
  const daysAhead = (d: number) => new Date(now.getTime() + d * 86_400_000);

  for (let i = 0; i < config.rides.completed; i++) {
    rides.push(build("completed", daysAgo(faker.number.float({ min: 1, max: config.rides.historyWindowDays }))));
  }
  for (let i = 0; i < config.rides.inProgress; i++) {
    // Departed within the last couple of hours, so tracking has something live.
    rides.push(build("in_progress", new Date(now.getTime() - faker.number.int({ min: 20, max: 120 }) * 60_000)));
  }
  for (let i = 0; i < config.rides.upcoming; i++) {
    rides.push(build("pending", daysAhead(faker.number.float({ min: 0.2, max: config.rides.upcomingWindowDays }))));
  }

  return rides;
}

export function generateBookings(
  faker: Faker,
  config: SeedConfig,
  users: PlannedUser[],
  rides: PlannedRide[],
): PlannedBooking[] {
  const bookings: PlannedBooking[] = [];
  const allIndices = users.map((_, i) => i);

  rides.forEach((ride, rideIndex) => {
    const isPast = ride.status === "completed" || ride.status === "in_progress";

    // Upcoming rides are only partly booked, so the demo has seats to take.
    if (!isPast && faker.number.float() > config.bookings.upcomingBookedRatio) return;

    const fill = isPast
      ? faker.number.float({ min: config.bookings.pastFillMin, max: config.bookings.pastFillMax })
      : faker.number.float({ min: 0.2, max: 0.6 });

    let seatsToFill = Math.min(ride.capacity, Math.max(1, Math.round(ride.capacity * fill)));

    // A driver cannot book their own ride, and a passenger books a ride once.
    const candidates = faker.helpers.shuffle(
      allIndices.filter((i) => i !== ride.driverIndex),
    );

    for (const userIndex of candidates) {
      if (seatsToFill <= 0) break;

      const seats = faker.number.int({ min: 1, max: Math.min(2, seatsToFill) });
      seatsToFill -= seats;

      bookings.push({
        rideIndex,
        userIndex,
        seats,
        status: isPast ? "completed" : "confirmed",
        paymentStatus: isPast ? "paid" : "pending",
        specialRequests: faker.datatype.boolean({ probability: 0.25 })
          ? faker.helpers.arrayElement([
              "Travelling with one suitcase.",
              "Please pick up from the highway exit if possible.",
              "I get motion sick, front seat preferred.",
            ])
          : null,
        pickupLocation: `${ride.origin} ${pick(faker, PICKUP_LANDMARKS)}`,
        dropoffLocation: `${ride.destination} ${pick(faker, PICKUP_LANDMARKS)}`,
        createdAt: new Date(
          ride.departureTime.getTime() - faker.number.int({ min: 1, max: 10 }) * 86_400_000,
        ),
      });
    }
  });

  return bookings;
}

export interface PlannedReview {
  reviewerIndex: number;
  reviewedIndex: number;
  rideIndex: number;
  rating: string;
  comment: string;
  createdAt: Date;
}

export function generateReviews(
  faker: Faker,
  config: SeedConfig,
  rides: PlannedRide[],
  bookings: PlannedBooking[],
): PlannedReview[] {
  const reviews: PlannedReview[] = [];

  for (const booking of bookings) {
    if (booking.status !== "completed") continue;
    if (faker.number.float() > config.engagement.reviewRatio) continue;

    const ride = rides[booking.rideIndex];
    const after = new Date(ride.departureTime.getTime() + 6 * 3_600_000);
    const generous = faker.datatype.boolean({ probability: 0.8 });

    // Passenger reviews the driver.
    reviews.push({
      reviewerIndex: booking.userIndex,
      reviewedIndex: ride.driverIndex,
      rideIndex: booking.rideIndex,
      rating: generous
        ? faker.number.float({ min: 4.5, max: 5, fractionDigits: 1 }).toFixed(1)
        : faker.number.float({ min: 3.5, max: 4.4, fractionDigits: 1 }).toFixed(1),
      comment: generous ? pick(faker, POSITIVE_REVIEWS) : pick(faker, MIXED_REVIEWS),
      createdAt: after,
    });

    // Driver reviews the passenger, less often.
    if (faker.datatype.boolean({ probability: 0.45 })) {
      reviews.push({
        reviewerIndex: ride.driverIndex,
        reviewedIndex: booking.userIndex,
        rideIndex: booking.rideIndex,
        rating: faker.number.float({ min: 4.2, max: 5, fractionDigits: 1 }).toFixed(1),
        comment: pick(faker, POSITIVE_REVIEWS),
        createdAt: new Date(after.getTime() + 3_600_000),
      });
    }
  }

  return reviews;
}

export interface PlannedReward {
  userIndex: number;
  type: string;
  points: number;
  description: string;
  createdAt: Date;
}

export function generateRewards(
  faker: Faker,
  config: SeedConfig,
  users: PlannedUser[],
  rides: PlannedRide[],
  bookings: PlannedBooking[],
): PlannedReward[] {
  const rewards: PlannedReward[] = [];

  // Mirrors the booking route, which grants points on every booking.
  for (const booking of bookings) {
    if (booking.status !== "completed") continue;
    rewards.push({
      userIndex: booking.userIndex,
      type: "booking",
      points: config.pointsPerBooking,
      description: "Booked a ride",
      createdAt: booking.createdAt,
    });
  }

  // Occasional non-booking rewards, including the safety verifications the
  // dashboard counts separately.
  users.forEach((user, userIndex) => {
    if (user.identityVerified) {
      const kind = REWARD_KINDS[0];
      rewards.push({
        userIndex,
        type: kind.type,
        points: kind.points,
        description: kind.description,
        createdAt: faker.date.recent({ days: 45 }),
      });
    }

    if (faker.datatype.boolean({ probability: 0.3 })) {
      const kind = pick(faker, REWARD_KINDS.slice(1));
      rewards.push({
        userIndex,
        type: kind.type,
        points: kind.points,
        description: kind.description,
        createdAt: faker.date.recent({ days: 45 }),
      });
    }
  });

  return rewards;
}

export interface PlannedMessage {
  senderIndex: number;
  receiverIndex: number;
  rideIndex: number;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export function generateMessages(
  faker: Faker,
  config: SeedConfig,
  rides: PlannedRide[],
  bookings: PlannedBooking[],
): PlannedMessage[] {
  const messages: PlannedMessage[] = [];

  for (const booking of bookings) {
    const ride = rides[booking.rideIndex];
    const count = faker.number.int({
      min: config.engagement.messagesPerThreadMin,
      max: config.engagement.messagesPerThreadMax,
    });
    if (count === 0) continue;

    let at = new Date(booking.createdAt.getTime() + 20 * 60_000);

    for (let i = 0; i < count; i++) {
      const fromPassenger = i % 2 === 0;
      const content =
        i === 0
          ? pick(faker, PASSENGER_OPENERS)
          : i === 1
            ? pick(faker, DRIVER_REPLIES)
            : pick(faker, FOLLOW_UPS);

      messages.push({
        senderIndex: fromPassenger ? booking.userIndex : ride.driverIndex,
        receiverIndex: fromPassenger ? ride.driverIndex : booking.userIndex,
        rideIndex: booking.rideIndex,
        content,
        // Leave the most recent message in an upcoming thread unread so the
        // sidebar badge has something to show.
        isRead: booking.status === "completed" || i < count - 1,
        createdAt: at,
      });

      at = new Date(at.getTime() + faker.number.int({ min: 3, max: 90 }) * 60_000);
    }
  }

  return messages;
}

export interface PlannedTrustedContact {
  userIndex: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  relationship: string;
  isEmergencyContact: boolean;
}

export function generateTrustedContacts(
  faker: Faker,
  config: SeedConfig,
  users: PlannedUser[],
): PlannedTrustedContact[] {
  const contacts: PlannedTrustedContact[] = [];

  users.forEach((_, userIndex) => {
    const isHero = userIndex < 2;
    if (!isHero && faker.number.float() > config.engagement.trustedContactRatio) return;

    const howMany = isHero ? 2 : 1;
    for (let i = 0; i < howMany; i++) {
      const name = faker.person.fullName();
      contacts.push({
        userIndex,
        contactName: name,
        contactPhone: faker.phone.number({ style: "international" }),
        contactEmail: faker.datatype.boolean({ probability: 0.6 })
          ? faker.internet.email({ firstName: name.split(" ")[0] }).toLowerCase()
          : null,
        relationship: pick(faker, CONTACT_RELATIONSHIPS),
        isEmergencyContact: i === 0,
      });
    }
  });

  return contacts;
}

export interface PlannedSafetyZone {
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  createdByIndex: number;
  isVerified: boolean;
}

export function generateSafetyZones(
  faker: Faker,
  config: SeedConfig,
): PlannedSafetyZone[] {
  const zones: PlannedSafetyZone[] = [];

  for (let i = 0; i < config.engagement.safetyZones; i++) {
    const corridor = pick(faker, CORRIDORS);
    const kind = pick(faker, SAFETY_ZONE_KINDS);

    zones.push({
      name: `${corridor.origin} ${kind}`,
      description: `Verified safe stop on the ${corridor.origin}-${corridor.destination} route.`,
      // Coordinates within mainland India.
      latitude: faker.location.latitude({ min: 8.4, max: 34, precision: 4 }).toString(),
      longitude: faker.location.longitude({ min: 68.7, max: 92, precision: 4 }).toString(),
      radiusMeters: faker.number.int({ min: 200, max: 1500 }),
      createdByIndex: faker.number.int({ min: 0, max: 1 }),
      isVerified: true,
    });
  }

  return zones;
}

export interface PlannedSafetyAlert {
  userIndex: number;
  rideIndex: number;
  alertType: string;
  details: string;
  latitude: string;
  longitude: string;
  status: "resolved";
  resolvedByIndex: number;
  timestamp: Date;
  resolvedAt: Date;
}

export function generateSafetyAlerts(
  faker: Faker,
  config: SeedConfig,
  rides: PlannedRide[],
): PlannedSafetyAlert[] {
  const alerts: PlannedSafetyAlert[] = [];
  const completed = rides
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.status === "completed");

  for (let i = 0; i < Math.min(config.engagement.resolvedAlerts, completed.length); i++) {
    const { r, i: rideIndex } = completed[i];
    const raised = new Date(r.departureTime.getTime() + 45 * 60_000);

    alerts.push({
      userIndex: r.driverIndex,
      rideIndex,
      alertType: pick(faker, ["route_deviation", "delay", "vehicle_issue"]),
      details: pick(faker, [
        "Diverted due to roadworks, passengers informed.",
        "Delayed by traffic near the toll plaza.",
        "Short stop for a tyre check, resolved without issue.",
      ]),
      latitude: faker.location.latitude({ min: 8.4, max: 34, precision: 4 }).toString(),
      longitude: faker.location.longitude({ min: 68.7, max: 92, precision: 4 }).toString(),
      status: "resolved",
      resolvedByIndex: r.driverIndex,
      timestamp: raised,
      resolvedAt: new Date(raised.getTime() + 25 * 60_000),
    });
  }

  return alerts;
}
