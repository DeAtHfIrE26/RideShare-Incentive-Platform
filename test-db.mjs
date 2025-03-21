// Simple database connection test
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

async function testDB() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection successful:', result.rows[0]);
    
    // Test tables with the new columns
    const userResult = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'users\' AND column_name = \'total_co2_saved\'');
    console.log('total_co2_saved column exists:', userResult.rows.length > 0);
    
    const ridesResult = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'rides\' AND column_name = \'uuid\'');
    console.log('uuid column in rides exists:', ridesResult.rows.length > 0);
    
    const bookingsResult = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'bookings\' AND column_name = \'uuid\'');
    console.log('uuid column in bookings exists:', bookingsResult.rows.length > 0);
    
    const messagesResult = await pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'messages\' AND column_name = \'uuid\'');
    console.log('uuid column in messages exists:', messagesResult.rows.length > 0);
    
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await pool.end();
  }
}

testDB(); 