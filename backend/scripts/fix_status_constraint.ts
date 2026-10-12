import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    console.log("Updating company_members_status_check constraint...");
    await db.execute(sql`
      ALTER TABLE company_members DROP CONSTRAINT IF EXISTS company_members_status_check;
    `);
    await db.execute(sql`
      ALTER TABLE company_members ADD CONSTRAINT company_members_status_check 
        CHECK (status = ANY (ARRAY['invited'::text, 'active'::text, 'suspended'::text, 'inactive'::text]));
    `);
    console.log("company_members_status_check updated successfully!");

    const cmRes = await db.execute(sql`
      SELECT conname, contype, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'company_members'::regclass;
    `);
    console.log("Current company_members constraints:", cmRes.rows);

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
