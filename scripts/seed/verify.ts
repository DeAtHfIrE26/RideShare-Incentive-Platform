import { sql, type SQL } from "drizzle-orm";
import { bookings, rides, users } from "../../shared/schema";

type Db = ReturnType<typeof import("./db").connect>["db"];

export interface Invariant {
  name: string;
  detail: string;
  ok: boolean;
}

/**
 * Post-seed assertions.
 *
 * The seed writes directly to the database, bypassing the API and therefore
 * the atomic seat reservation in the booking route. These checks are what
 * stands in for that logic: if the generated data is internally inconsistent
 * the run fails here rather than surfacing as nonsense during a demo.
 */
/** node-postgres returns a QueryResult; this unwraps the single count row. */
async function count(db: Db, statement: SQL): Promise<number> {
  const result = await db.execute(statement);
  const rows = (result as unknown as { rows: Array<{ count: number }> }).rows;
  return Number(rows[0]?.count ?? 0);
}

export async function verify(db: Db, prefix: string): Promise<Invariant[]> {
  const results: Invariant[] = [];
  const like = `${prefix}%`;

  const seatMismatch = await count(db, sql`
    SELECT count(*)::int AS count
    FROM ${rides} r
    JOIN ${users} u ON u.id = r.driver_id
    WHERE u.username LIKE ${like}
      AND r.seats_available < 0
  `);
  results.push({
    name: "No ride has negative seats remaining",
    detail: `rides with seats_available < 0: ${seatMismatch}`,
    ok: seatMismatch === 0,
  });

  const selfBooking = await count(db, sql`
    SELECT count(*)::int AS count
    FROM ${bookings} b
    JOIN ${rides} r ON r.id = b.ride_id
    WHERE b.user_id = r.driver_id
  `);
  results.push({
    name: "No user has booked their own ride",
    detail: `self-bookings: ${selfBooking}`,
    ok: selfBooking === 0,
  });

  const duplicate = await count(db, sql`
    SELECT count(*)::int AS count FROM (
      SELECT ride_id, user_id FROM ${bookings}
      GROUP BY ride_id, user_id HAVING count(*) > 1
    ) d
  `);
  results.push({
    name: "No user has booked the same ride twice",
    detail: `duplicate ride/user pairs: ${duplicate}`,
    ok: duplicate === 0,
  });

  const overbooked = await count(db, sql`
    SELECT count(*)::int AS count FROM (
      SELECT r.id
      FROM ${rides} r
      JOIN ${bookings} b ON b.ride_id = r.id
      GROUP BY r.id, r.seats_available
      HAVING sum(b.seats) + r.seats_available > 8
    ) o
  `);
  results.push({
    name: "Booked seats plus remaining never exceed the maximum capacity",
    detail: `rides exceeding capacity: ${overbooked}`,
    ok: overbooked === 0,
  });

  const orphanBookings = await count(db, sql`
    SELECT count(*)::int AS count FROM ${bookings}
    WHERE ride_id IS NULL OR user_id IS NULL
  `);
  results.push({
    name: "No orphaned bookings",
    detail: `bookings with a null ride or user: ${orphanBookings}`,
    ok: orphanBookings === 0,
  });

  const statsReady = await count(db, sql`
    SELECT count(*)::int AS count
    FROM ${bookings} b
    JOIN ${users} u ON u.id = b.user_id
    WHERE u.username LIKE ${like} AND b.status = 'completed'
  `);
  results.push({
    name: "Completed bookings exist so dashboard statistics are non-zero",
    detail: `completed demo bookings: ${statsReady}`,
    ok: statsReady > 0,
  });

  const futureRides = await count(db, sql`
    SELECT count(*)::int AS count
    FROM ${rides} r
    JOIN ${users} u ON u.id = r.driver_id
    WHERE u.username LIKE ${like}
      AND r.departure_time > now()
      AND r.seats_available > 0
  `);
  results.push({
    name: "Bookable rides remain so a booking can be demonstrated live",
    detail: `future rides with seats free: ${futureRides}`,
    ok: futureRides > 0,
  });

  return results;
}
