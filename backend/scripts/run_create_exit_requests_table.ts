import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    console.log("Creating company_exit_requests table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "company_exit_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "profile_id" uuid NOT NULL,
        "reason" text,
        "status" text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
        "created_by" uuid,
        "reviewed_by" uuid,
        "reviewed_at" timestamp with time zone,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        "deleted_at" timestamp with time zone
      );
    `);
    console.log("Table company_exit_requests created.");

    console.log("Adding foreign keys...");
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "company_exit_requests" 
        ADD CONSTRAINT "company_exit_requests_company_id_fk" 
        FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "company_exit_requests" 
        ADD CONSTRAINT "company_exit_requests_profile_id_fk" 
        FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log("Adding indexes...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "company_exit_requests_company_status_idx" 
      ON "company_exit_requests" ("company_id", "status");
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "company_exit_requests_profile_idx" 
      ON "company_exit_requests" ("profile_id");
    `);

    console.log("company_exit_requests setup complete!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
