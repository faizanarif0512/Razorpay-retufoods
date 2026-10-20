import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

// Read .env.local if DATABASE_URL is not already in process.env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString || connectionString.includes('YOUR_PASSWORD') || connectionString.includes('[YOUR-PASSWORD]')) {
  console.error('\n❌ ERROR: No valid Neon PostgreSQL connection string found.');
  console.error('Please either pass it as an argument:');
  console.error('  node scripts/setup-neon.mjs "postgresql://..."');
  console.error('Or set DATABASE_URL in .env.local\n');
  process.exit(1);
}

console.log('🔄 Connecting to Neon PostgreSQL...');

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('✅ Connected successfully to Neon PostgreSQL!');

    const schemaPath = path.resolve(process.cwd(), 'supabase', 'migrations', 'neon_initial_schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Executing initial schema and seed data...');
    await client.query(sql);

    console.log('🔍 Verifying seeded tables and records:');

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(`- Created tables (${tablesRes.rowCount}):`, tablesRes.rows.map(r => r.table_name).join(', '));

    const prodsRes = await client.query('SELECT count(*) as count FROM products;');
    const variantsRes = await client.query('SELECT count(*) as count FROM product_variants;');
    const adminsRes = await client.query('SELECT count(*) as count FROM admin_users;');

    console.log(`- Active Products: ${prodsRes.rows[0].count}`);
    console.log(`- Product Variants: ${variantsRes.rows[0].count}`);
    console.log(`- Admin Users: ${adminsRes.rows[0].count}`);

    console.log('\n🎉 Neon PostgreSQL Database Setup Completed Successfully!\n');
  } catch (err) {
    console.error('\n❌ Database setup error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
