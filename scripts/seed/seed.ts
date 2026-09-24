import { fakerEN_IN as faker } from "@faker-js/faker";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import {
  bookings, messages, reviews, rewards, rides, safetyAlerts, safetyZones,
  trustedContacts, users,
} from "../../shared/schema";
import { loadConfig } from "./config";
import { connect, describeTarget } from "./db";
import {
  generateBookings, generateMessages, generateReviews, generateRewards,
  generateRides, generateSafetyAlerts, generateSafetyZones,
  generateTrustedContacts, generateUsers,
} from "./generators";
import { verify } from "./verify";

const DRY_RUN = process.argv.includes("--dry-run");

function heading(text: string) {
  console.log(`\n${text}\n${"-".repeat(text.length)}`);
}

async function main() {
  const config = loadConfig();
  const now = new Date();

  // Deterministic: the same seed value yields the same dataset every run.
  faker.seed(config.randomSeed);

  heading("Planning");
  const plannedUsers = generateUsers(faker, config);
  const plannedRides = generateRides(faker, config, plannedUsers, now);
  const plannedBookings = generateBookings(faker, config, plannedUsers, plannedRides);
  const plannedReviews = generateReviews(faker, config, plannedRides, plannedBookings);
  const plannedRewards = generateRewards(faker, config, plannedUsers, plannedRides, plannedBookings);
  const plannedMessages = generateMessages(faker, config, plannedRides, plannedBookings);
  const plannedContacts = generateTrustedContacts(faker, config, plannedUsers);
  const plannedZones = generateSafetyZones(faker, config);
  const plannedAlerts = generateSafetyAlerts(faker, config, plannedRides);

  // seatsAvailable is derived, never generated, so it always agrees with the
  // bookings that reference the ride.
  const bookedSeats = new Map<number, number>();
  for (const b of plannedBookings) {
    bookedSeats.set(b.rideIndex, (bookedSeats.get(b.rideIndex) ?? 0) + b.seats);
  }

  console.log(`users              ${plannedUsers.length}`);
  console.log(`rides              ${plannedRides.length}`);
  console.log(`bookings           ${plannedBookings.length}`);
  console.log(`reviews            ${plannedReviews.length}`);
  console.log(`rewards            ${plannedRewards.length}`);
  console.log(`messages           ${plannedMessages.length}`);
  console.log(`trusted contacts   ${plannedContacts.length}`);
  console.log(`safety zones       ${plannedZones.length}`);
  console.log(`safety alerts      ${plannedAlerts.length}`);

  if (DRY_RUN) {
    console.log("\n--dry-run: nothing written.");
    return;
  }

  const { pool, db, driver } = connect();
  console.log(`\ntarget             ${describeTarget()}`);
  console.log(`driver             ${driver}`);

  // Hashing is the slowest part of the run and every demo account shares the
  // same password, so the hash is computed once rather than per user.
  const passwordHash = await bcrypt.hash(config.demoPassword, 10);

  try {
    await db.transaction(async (tx) => {
      heading("Writing");

      const userRows = await tx.insert(users).values(
        plannedUsers.map((u) => ({
          username: u.username,
          password: passwordHash,
          email: u.email,
          fullName: u.fullName,
          phoneNumber: u.phoneNumber,
          bio: u.bio,
          points: 0,
          rating: u.rating,
          verifiedDriver: u.verifiedDriver,
          totalRides: 0,
          identityVerified: u.identityVerified,
        })),
      ).returning({ id: users.id });
      const userId = (i: number) => userRows[i].id;
      console.log(`users              ${userRows.length}`);

      const rideRows = await tx.insert(rides).values(
        plannedRides.map((r, i) => ({
          driverId: userId(r.driverIndex),
          origin: r.origin,
          destination: r.destination,
          departureTime: r.departureTime,
          seatsAvailable: Math.max(0, r.capacity - (bookedSeats.get(i) ?? 0)),
          price: r.price,
          status:
            r.status === "pending" && r.capacity - (bookedSeats.get(i) ?? 0) <= 0
              ? "full"
              : r.status,
          carModel: r.carModel,
          carColor: r.carColor,
          licensePlate: r.licensePlate,
          preferences: r.preferences,
          routeDetails: r.routeDetails,
          estimatedDuration: r.estimatedDuration,
          createdAt: r.createdAt,
        })),
      ).returning({ id: rides.id });
      const rideId = (i: number) => rideRows[i].id;
      console.log(`rides              ${rideRows.length}`);

      if (plannedBookings.length) {
        await tx.insert(bookings).values(
          plannedBookings.map((b) => ({
            rideId: rideId(b.rideIndex),
            userId: userId(b.userIndex),
            seats: b.seats,
            status: b.status,
            specialRequests: b.specialRequests,
            pickupLocation: b.pickupLocation,
            dropoffLocation: b.dropoffLocation,
            paymentStatus: b.paymentStatus,
            createdAt: b.createdAt,
          })),
        );
      }
      console.log(`bookings           ${plannedBookings.length}`);

      if (plannedReviews.length) {
        await tx.insert(reviews).values(
          plannedReviews.map((r) => ({
            reviewerId: userId(r.reviewerIndex),
            reviewedId: userId(r.reviewedIndex),
            rideId: rideId(r.rideIndex),
            rating: r.rating,
            comment: r.comment,
            createdAt: r.createdAt,
          })),
        );
      }
      console.log(`reviews            ${plannedReviews.length}`);

      if (plannedRewards.length) {
        await tx.insert(rewards).values(
          plannedRewards.map((r) => ({
            userId: userId(r.userIndex),
            type: r.type,
            points: r.points,
            description: r.description,
            createdAt: r.createdAt,
          })),
        );
      }
      console.log(`rewards            ${plannedRewards.length}`);

      if (plannedMessages.length) {
        await tx.insert(messages).values(
          plannedMessages.map((m) => ({
            senderId: userId(m.senderIndex),
            receiverId: userId(m.receiverIndex),
            rideId: rideId(m.rideIndex),
            content: m.content,
            isRead: m.isRead,
            createdAt: m.createdAt,
          })),
        );
      }
      console.log(`messages           ${plannedMessages.length}`);

      if (plannedContacts.length) {
        await tx.insert(trustedContacts).values(
          plannedContacts.map((c) => ({
            userId: userId(c.userIndex),
            contactName: c.contactName,
            contactPhone: c.contactPhone,
            contactEmail: c.contactEmail,
            relationship: c.relationship,
            isEmergencyContact: c.isEmergencyContact,
          })),
        );
      }
      console.log(`trusted contacts   ${plannedContacts.length}`);

      if (plannedZones.length) {
        await tx.insert(safetyZones).values(
          plannedZones.map((z) => ({
            name: z.name,
            description: z.description,
            latitude: z.latitude,
            longitude: z.longitude,
            radiusMeters: z.radiusMeters,
            createdBy: userId(z.createdByIndex),
            isVerified: z.isVerified,
          })),
        );
      }
      console.log(`safety zones       ${plannedZones.length}`);

      if (plannedAlerts.length) {
        await tx.insert(safetyAlerts).values(
          plannedAlerts.map((a) => ({
            userId: userId(a.userIndex),
            rideId: rideId(a.rideIndex),
            alertType: a.alertType,
            details: a.details,
            latitude: a.latitude,
            longitude: a.longitude,
            status: a.status,
            resolvedBy: userId(a.resolvedByIndex),
            timestamp: a.timestamp,
            resolvedAt: a.resolvedAt,
          })),
        );
      }
      console.log(`safety alerts      ${plannedAlerts.length}`);

      // Denormalised counters on the user row are recomputed from what was
      // actually written rather than guessed while generating.
      await tx.execute(sql`
        UPDATE users u SET
          points = COALESCE((SELECT sum(points) FROM rewards WHERE user_id = u.id), 0),
          total_rides = COALESCE((SELECT count(*) FROM bookings WHERE user_id = u.id AND status = 'completed'), 0)
                      + COALESCE((SELECT count(*) FROM rides WHERE driver_id = u.id AND status = 'completed'), 0)
        WHERE u.username LIKE ${config.usernamePrefix + "%"}
      `);
    });

    heading("Verifying");
    const invariants = await verify(db, config.usernamePrefix);
    let failed = 0;
    for (const inv of invariants) {
      console.log(`${inv.ok ? "ok  " : "FAIL"}  ${inv.name}  (${inv.detail})`);
      if (!inv.ok) failed++;
    }

    if (failed > 0) {
      console.error(`\n${failed} invariant(s) failed. The data is inconsistent.`);
      console.error("Run 'npm run seed:reset' and investigate before demoing.");
      process.exitCode = 1;
      return;
    }

    heading("Demo accounts");
    console.log(`password           ${config.demoPassword}`);
    console.log("");
    plannedUsers.slice(0, 2).forEach((u, i) => {
      console.log(`${i === 0 ? "primary  " : "secondary"}          ${u.username}   (${u.fullName})`);
    });
    console.log(`\n${plannedUsers.length - 2} further accounts share the same password.`);
    console.log("Reset with: npm run seed:reset");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("\nSeed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
