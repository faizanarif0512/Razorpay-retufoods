import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

console.log('Testing Supabase PostgreSQL Connection...');

if (!connectionString || !connectionString.startsWith('postgres')) {
  console.error('❌ DATABASE_URL is not set or not a postgres URL in .env or .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  const client = await pool.connect();
  console.log('✅ Connected to Supabase PostgreSQL successfully!');

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  const tables = tablesRes.rows.map(r => r.table_name);
  console.log(`📊 Found ${tables.length} tables in Supabase:`, tables.join(', '));

  if (tables.includes('products')) {
    const prodCount = await client.query('SELECT COUNT(*) FROM products;');
    console.log(`📦 Seeded Products in Supabase: ${prodCount.rows[0].count}`);
  } else {
    console.warn('⚠️ "products" table not found yet. Run supabase/migrations/supabase_ready_migration.sql in the Supabase SQL editor.');
  }

  client.release();
  await pool.end();
  console.log('🎉 Supabase verification complete!');
} catch (err) {
  console.error('❌ Connection to Supabase failed:', err.message);
  process.exit(1);
}
