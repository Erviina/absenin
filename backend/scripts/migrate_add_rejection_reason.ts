import { Client } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("Connected to DB.");

    console.log("Executing migration: Add rejection_reason column to leave_requests...");
    await client.query(`
      ALTER TABLE "leave_requests" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
    `);
    
    console.log("Migration executed successfully.");

    // Verify column
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'leave_requests'
        AND column_name = 'rejection_reason';
    `);
    console.table(res.rows);

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
