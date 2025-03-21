import dotenv from 'dotenv';
import { testDatabaseConnection } from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function performHealthCheck() {
  console.log('🔍 Starting system health check...');
  
  // Track overall health status
  const healthReport = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    components: {
      environment: checkEnvironmentVariables(),
      migrations: await checkMigrations(),
      database: await checkDatabase(),
    }
  };
  
  // Set overall status based on component results
  if (Object.values(healthReport.components).some(comp => comp.status !== 'healthy')) {
    healthReport.status = 'unhealthy';
  }
  
  // Output the report
  console.log('\n📋 Health Check Report:');
  console.log(JSON.stringify(healthReport, null, 2));
  
  // Return status code based on health check result
  if (healthReport.status === 'healthy') {
    console.log('\n✅ System is healthy');
    process.exit(0);
  } else {
    console.error('\n❌ System is unhealthy - please check the report for details');
    process.exit(1);
  }
}

function checkEnvironmentVariables() {
  const result = {
    status: 'healthy',
    details: {}
  };
  
  // Check required environment variables
  const requiredVars = ['DATABASE_URL', 'SESSION_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    result.status = 'unhealthy';
    result.details = {
      missing: missingVars,
      message: 'Missing required environment variables'
    };
  } else {
    result.details = {
      environment: process.env.NODE_ENV || 'development'
    };
  }
  
  return result;
}

async function checkDatabase() {
  const result = {
    status: 'unknown',
    details: {}
  };
  
  try {
    const connected = await testDatabaseConnection();
    
    if (connected) {
      result.status = 'healthy';
      result.details = {
        message: 'Successfully connected to database'
      };
    } else {
      result.status = 'unhealthy';
      result.details = {
        message: 'Could not establish database connection'
      };
    }
  } catch (error) {
    result.status = 'unhealthy';
    result.details = {
      message: 'Database connection error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
  
  return result;
}

async function checkMigrations() {
  const result = {
    status: 'healthy',
    details: {}
  };
  
  try {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      result.status = 'warning';
      result.details = {
        message: 'Migrations directory not found'
      };
      return result;
    }
    
    // Check if we have at least one migration file
    const migrationFiles = fs.readdirSync(migrationsDir);
    
    if (migrationFiles.length === 0) {
      result.status = 'warning';
      result.details = {
        message: 'No migration files found'
      };
    } else {
      result.details = {
        count: migrationFiles.length,
        files: migrationFiles
      };
    }
  } catch (error) {
    result.status = 'warning';
    result.details = {
      message: 'Error checking migrations',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
  
  return result;
}

// Run the health check
performHealthCheck(); 