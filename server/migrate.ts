import dotenv from "dotenv";
import fs from "fs";
import path, { dirname } from "path";
import pg from "pg";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    console.log("Connected to database");

    const migrationPath = path.join(__dirname, "..", "migrations", "0001_add_safety_fields.sql");
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found: ${migrationPath}`);
      console.log("Creating migrations directory...");
      
      const migrationsDir = path.join(__dirname, "..", "migrations");
      if (!fs.existsSync(migrationsDir)) {
        fs.mkdirSync(migrationsDir, { recursive: true });
      }
      
      // Create the migration file
      fs.writeFileSync(migrationPath, `-- Add safety fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS safety_preferences JSONB,
ADD COLUMN IF NOT EXISTS emergency_contact_id INTEGER;`);
      
      console.log(`Created migration file: ${migrationPath}`);
    }
    
    const migrationSql = fs.readFileSync(migrationPath, "utf-8");

    console.log("Running migration:", migrationPath);
    await client.query(migrationSql);
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration(); 