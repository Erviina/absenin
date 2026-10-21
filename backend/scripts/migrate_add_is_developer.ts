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

    console.log("Executing migration: Add is_developer column to profiles...");
    await client.query(`
      ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_developer" boolean DEFAULT false NOT NULL;
    `);

    console.log("Setting is_developer = true for platform owner / developer accounts...");
    const devEmails = [
      "shakilaaulia@upi.edu",
      "nihaaprill@upi.edu",
      "ervinakusnanda@upi.edu",
      "nalifah@upi.edu"
    ];

    await client.query(`
      UPDATE "profiles" 
      SET "is_developer" = true 
      WHERE LOWER("email") = ANY($1::text[]);
    `, [devEmails]);

    console.log("Migration executed successfully.");

    // Verify column
    const res = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'profiles'
        AND column_name = 'is_developer';
    `);
    console.table(res.rows);

    // List developers
    const devRes = await client.query(`
      SELECT id, full_name, email, is_developer 
      FROM profiles 
      ORDER BY is_developer DESC, created_at DESC 
      LIMIT 10;
    `);
    console.table(devRes.rows);

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
