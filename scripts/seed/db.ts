import { neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import dotenv from "dotenv";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import pg from "pg";
import ws from "ws";
import * as schema from "../../shared/schema";

dotenv.config();

/**
 * Connection for the seed scripts, with the driver chosen from the host.
 *
 * Neon endpoints go over the WebSocket driver on 443, the same transport the
 * deployed app uses. That means the pooled connection string already in
 * DATABASE_URL works unchanged, with no separate direct endpoint to fetch, and
 * it works from networks that block the Postgres port.
 *
 * Anything else (a local Postgres in development or CI) uses the standard
 * driver over TCP.
 */
export function connect() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
  }

  const isNeon = connectionString.includes("neon.tech");

  if (isNeon) {
    neonConfig.webSocketConstructor = ws;
    const pool = new NeonPool({ connectionString });
    return { pool, db: drizzleNeon({ client: pool, schema }), driver: "neon-serverless" as const };
  }

  const isLocal =
    connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

  const pool = new pg.Pool({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });

  return { pool, db: drizzleNode(pool, { schema }), driver: "node-postgres" as const };
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
