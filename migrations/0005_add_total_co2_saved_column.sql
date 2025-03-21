-- Add total_co2_saved column to users table
DO $$ 
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'total_co2_saved'
    ) THEN
        -- Add the total_co2_saved column with default value
        ALTER TABLE users ADD COLUMN total_co2_saved DECIMAL DEFAULT 0;
    END IF;
END $$; 