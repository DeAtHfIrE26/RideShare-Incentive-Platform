-- Add UUID column to rides, bookings, and messages tables
DO $$ 
BEGIN
    -- Check if the extension exists
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Add UUID column to rides table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'rides' AND column_name = 'uuid'
    ) THEN
        ALTER TABLE rides ADD COLUMN uuid UUID DEFAULT uuid_generate_v4();
        UPDATE rides SET uuid = uuid_generate_v4() WHERE uuid IS NULL;
        ALTER TABLE rides ALTER COLUMN uuid SET NOT NULL;
    END IF;
    
    -- Add UUID column to bookings table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'uuid'
    ) THEN
        ALTER TABLE bookings ADD COLUMN uuid UUID DEFAULT uuid_generate_v4();
        UPDATE bookings SET uuid = uuid_generate_v4() WHERE uuid IS NULL;
        ALTER TABLE bookings ALTER COLUMN uuid SET NOT NULL;
    END IF;
    
    -- Add UUID column to messages table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'uuid'
    ) THEN
        ALTER TABLE messages ADD COLUMN uuid UUID DEFAULT uuid_generate_v4();
        UPDATE messages SET uuid = uuid_generate_v4() WHERE uuid IS NULL;
        ALTER TABLE messages ALTER COLUMN uuid SET NOT NULL;
    END IF;
END $$; 