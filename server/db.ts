import { neonConfig, Pool as NeonPool } from "@neondatabase/serverless";
import * as schema from "@shared/schema";
import dotenv from "dotenv";
import { drizzle as drizzleNeon, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import pg from "pg";
import ws from "ws";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Copy .env.example to .env and fill it in.",
  );
}

/**
 * The driver is chosen from the host, matching scripts/seed/db.ts.
 *
 * Neon is reached over its WebSocket driver on 443, the transport the deployed
 * app uses, so the pooled connection string works unchanged and from networks
 * that block the Postgres port. Anything else — a local Postgres in
 * development, or CI — uses the standard driver over TCP. Without this, the
 * app could only ever talk to Neon: pointing it at localhost produced
 * "Database connection failed" from an attempt to open wss://127.0.0.1/v2.
 */
const isNeon = connectionString.includes("neon.tech");

function createNeon() {
  neonConfig.webSocketConstructor = ws;
  const pool = new NeonPool({ connectionString });
  return { pool, db: drizzleNeon({ client: pool, schema }) };
}

function createNodePostgres() {
  const isLocal =
    connectionString!.includes("localhost") || connectionString!.includes("127.0.0.1");
  const pool = new pg.Pool({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  // The two drivers expose the same drizzle query builder; only the transport
  // and the shape of a raw db.execute() result differ, and nothing in server/
  // reads that shape. Deployments run the Neon branch, so that is the type the
  // rest of the server is checked against.
  return {
    pool,
    db: drizzleNode(pool, { schema }) as unknown as NeonDatabase<typeof schema>,
  };
}

const connection = isNeon ? createNeon() : createNodePostgres();

export const pool = connection.pool;
export const db = connection.db;

/** Used by the health check and by server startup to confirm the database answers. */
export async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query("SELECT 1");
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Database connection test failed", error);
    return false;
  }
}
