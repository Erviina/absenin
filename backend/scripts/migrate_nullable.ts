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

    await client.query(`
      ALTER TABLE "companies" ALTER COLUMN "latitude" DROP NOT NULL;
      ALTER TABLE "companies" ALTER COLUMN "longitude" DROP NOT NULL;
      ALTER TABLE "companies" ALTER COLUMN "work_days" DROP NOT NULL;
      ALTER TABLE "companies" ALTER COLUMN "work_start_time" DROP NOT NULL;
      ALTER TABLE "companies" ALTER COLUMN "work_end_time" DROP NOT NULL;
    `);
    
    console.log("Migration executed successfully.");

    // Verify columns
    const res = await client.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'companies'
      AND column_name IN ('latitude', 'longitude', 'work_days', 'work_start_time', 'work_end_time');
    `);
    console.table(res.rows);

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.end();
  }
}

runMigration();
