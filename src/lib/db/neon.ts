import pg from 'pg';

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

export function getPostgresPool(): pg.Pool {
  if (poolInstance) {
    return poolInstance;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined for Neon PostgreSQL.');
  }

  poolInstance = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  poolInstance.on('error', (err) => {
    console.error('Unexpected error on idle Neon PostgreSQL client:', err);
  });

  return poolInstance;
}

export async function queryPostgres<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const pool = getPostgresPool();
  return pool.query<T>(text, params);
}
