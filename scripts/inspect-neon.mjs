import fs from 'fs';
import path from 'path';
import pg from 'pg';

const envPath = path.resolve(process.cwd(), '.env.local');
const lines = fs.readFileSync(envPath, 'utf8').split('\n');
let dbUrl = '';
for (const line of lines) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
  }
}

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

await client.connect();
const tables = ['customers', 'products', 'orders', 'order_items', 'payments', 'subscriptions', 'webhook_events', 'invoices', 'invoice_deliveries'];

for (const t of tables) {
  try {
    const res = await client.query(`SELECT count(*) FROM "${t}"`);
    console.log(`${t}: ${res.rows[0].count} rows`);
  } catch (e) {
    console.log(`${t}: error ${e.message}`);
  }
}

const prods = await client.query('SELECT * FROM products LIMIT 5');
console.log('Sample products:', prods.rows);

await client.end();
