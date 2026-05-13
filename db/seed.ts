import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function seed(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env['DATABASE_URL'],
  });

  try {
    console.log('Seeding database...');

    // Insert sample documents
    await pool.query(`
      INSERT INTO documents (filename, source, status, metadata)
      VALUES
        ('annual-report-2024.pdf', 'upload', 'ready', '{"company": "Acme Corp", "year": 2024}'),
        ('bank-statement-jan.pdf', 'upload', 'ready', '{"bank": "Chase", "month": "2024-01"}'),
        ('invoice-1042.pdf', 'upload', 'pending', '{"vendor": "CloudCo", "amount": 4500}')
      ON CONFLICT DO NOTHING;
    `);

    console.log('Seed complete.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void seed();
