import { drizzle } from 'drizzle-orm/postgres-js';
import postgres = require('postgres');
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString);
const db = drizzle(sql);

async function runMigration() {
  try {
    const migrationPath = join(__dirname, '../drizzle/0005_watery_patriot.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('Running migration...');
    await sql.unsafe(migrationSQL);
    console.log('Migration completed successfully!');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await sql.end();
    process.exit(1);
  }
}

runMigration();
