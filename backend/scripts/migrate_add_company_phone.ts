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

    console.log("Executing migration: Add phone column to companies...");
    await client.query(`
      ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "phone" varchar(50);
    `);
    
    console.log("Migration executed successfully.");

    // Verify column
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'companies'
        AND column_name = 'phone';
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
