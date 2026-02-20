import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config';
import * as schema from './schema';

const client = postgres(config.databaseUrl, {
  ssl: config.databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});
export const db = drizzle(client, { schema });
export { client };
