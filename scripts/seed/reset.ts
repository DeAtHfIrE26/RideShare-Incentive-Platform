import { sql, type SQL } from "drizzle-orm";
import { loadConfig } from "./config";
import { connect, describeTarget } from "./db";

/**
 * Removes everything the seed created, and nothing else.
 *
 * Demo accounts are identified by their username prefix. Dependent rows are
 * deleted in foreign-key order because the schema declares ON DELETE NO ACTION,
 * so the parent rows cannot go first.
 *
 * Rows belonging to real accounts are untouched, including rides that a demo
 * user booked a seat on.
 */
/** node-postgres returns a QueryResult; this unwraps the single count row. */
async function countRows(
  db: ReturnType<typeof connect>["db"],
  statement: SQL,
): Promise<number> {
  const result = await db.execute(statement);
  const rows = (result as unknown as { rows: Array<{ count: number }> }).rows;
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  const config = loadConfig();
  const { pool, db } = connect();
  const like = `${config.usernamePrefix}%`;

  console.log(`target   ${describeTarget()}`);
  console.log(`matching users LIKE '${like}'\n`);

  try {
    const count = await countRows(
      db,
      sql`SELECT count(*)::int AS count FROM users WHERE username LIKE ${like}`,
    );

    if (count === 0) {
      console.log("No demo accounts found. Nothing to remove.");
      return;
    }

    console.log(`found ${count} demo account(s)`);

    await db.transaction(async (tx) => {
      const demoUsers = sql`(SELECT id FROM users WHERE username LIKE ${like})`;
      const demoRides = sql`(SELECT id FROM rides WHERE driver_id IN ${demoUsers})`;

      // Children first, then rides, then the accounts themselves.
      const steps: Array<[string, ReturnType<typeof sql>]> = [
        ["safety_alerts", sql`DELETE FROM safety_alerts WHERE user_id IN ${demoUsers} OR resolved_by IN ${demoUsers} OR ride_id IN ${demoRides}`],
        ["safety_zones", sql`DELETE FROM safety_zones WHERE created_by IN ${demoUsers}`],
        ["ride_verifications", sql`DELETE FROM ride_verifications WHERE passenger_id IN ${demoUsers} OR ride_id IN ${demoRides}`],
        ["trusted_contacts", sql`DELETE FROM trusted_contacts WHERE user_id IN ${demoUsers}`],
        ["messages", sql`DELETE FROM messages WHERE sender_id IN ${demoUsers} OR receiver_id IN ${demoUsers} OR ride_id IN ${demoRides}`],
        ["reviews", sql`DELETE FROM reviews WHERE reviewer_id IN ${demoUsers} OR reviewed_id IN ${demoUsers} OR ride_id IN ${demoRides}`],
        ["rewards", sql`DELETE FROM rewards WHERE user_id IN ${demoUsers}`],
        ["bookings", sql`DELETE FROM bookings WHERE user_id IN ${demoUsers} OR ride_id IN ${demoRides}`],
        ["rides", sql`DELETE FROM rides WHERE driver_id IN ${demoUsers}`],
        ["users", sql`DELETE FROM users WHERE username LIKE ${like}`],
      ];

      for (const [table, statement] of steps) {
        await tx.execute(statement);
        console.log(`cleared  ${table}`);
      }
    });

    const remaining = await countRows(
      db,
      sql`SELECT count(*)::int AS count FROM users WHERE username LIKE ${like}`,
    );

    console.log(`\nDone. Demo accounts remaining: ${remaining}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("\nReset failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
