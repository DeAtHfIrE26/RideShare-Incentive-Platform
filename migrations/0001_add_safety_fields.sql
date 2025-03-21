-- Add safety fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS identity_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS safety_preferences JSONB,
ADD COLUMN IF NOT EXISTS emergency_contact_id INTEGER; 