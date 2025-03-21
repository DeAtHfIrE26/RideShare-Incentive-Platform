import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

// Load environment variables from .env file
dotenv.config();

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Maximum number of connection retries
const MAX_RETRIES = 5;
// Initial delay in ms (will be multiplied by 2^retryCount for exponential backoff)
const INITIAL_RETRY_DELAY = 1000;

// Function to create a pool with retry logic
async function createPoolWithRetry(retryCount = 0): Promise<Pool> {
  try {
    const newPool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined 
    });
    
    // Validate connection by making a test query
    const client = await newPool.connect();
    try {
      await client.query('SELECT 1');
      console.log('Database connection established successfully');
      return newPool;
    } finally {
      client.release();
    }
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      console.error(`Database connection failed. Retrying in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return createPoolWithRetry(retryCount + 1);
    }
    
    console.error('Failed to connect to database after maximum retry attempts', error);
    // Create an in-memory mock pool for development fallback
    if (process.env.NODE_ENV === 'development') {
      console.warn('Running with limited functionality in development mode');
      return {
        connect: () => Promise.resolve({
          query: () => Promise.resolve({ rows: [] }),
          release: () => {}
        }),
        query: () => Promise.resolve({ rows: [] }),
        end: () => Promise.resolve()
      } as unknown as Pool;
    }
    
    // In production, we should not continue with a broken DB connection
    throw error;
  }
}

// Create pool with retry logic
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Optional: Expose method to test the database connection
export async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection test failed', error);
    return false;
  }
}