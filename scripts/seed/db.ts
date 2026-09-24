import { drizzle } from "drizzle-orm/node-postgres";
import dotenv from "dotenv";
import pg from "pg";
import * as schema from "../../shared/schema";

dotenv.config();

/**
 * Connection for the seed scripts.
 *
 * These run from a developer machine or CI, not inside a serverless function,
 * so they use the standard Postgres wire protocol rather than the WebSocket
 * driver the app uses. Neon accepts both; this also lets the scripts run
 * against a local Postgres unchanged.
 */
export function connect() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false },
  });

  return { pool, db: drizzle(pool, { schema }) };
}

/** Host shown in logs so it is obvious which database is being written to. */
export function describeTarget(): string {
  const raw = process.env.DATABASE_URL ?? "";
  try {
    const url = new URL(raw);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}
