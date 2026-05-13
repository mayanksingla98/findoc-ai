import 'dotenv/config';
import pg from 'pg';
import { execSync } from 'node:child_process';

const { Pool } = pg;

async function reset(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set. Check your .env file.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('Dropping and recreating public schema...');
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    console.log('  ✓ Schema reset');
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }

  console.log('Running migrations...');
  execSync('npm run db:migrate', { stdio: 'inherit' });
}

void reset();
