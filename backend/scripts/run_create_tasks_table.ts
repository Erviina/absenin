import { db } from './src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    console.log("Creating tasks table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "tasks" (
        "id" uuid PRIMARY KEY NOT NULL,
        "profile_id" uuid,
        "company_id" uuid,
        "title" varchar,
        "date" date,
        "time" varchar,
        "note" text,
        "completed" boolean DEFAULT false,
        "type" varchar,
        "created_at" timestamp with time zone,
        "updated_at" timestamp with time zone,
        "deleted_at" timestamp with time zone,
        "created_by" uuid,
        "updated_by" uuid,
        "deleted_by" uuid
      );
    `);
    console.log("Table tasks created.");

    console.log("Adding foreign keys...");
    await db.execute(sql`
      DO $$ BEGIN
       ALTER TABLE "tasks" ADD CONSTRAINT "tasks_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
       ALTER TABLE "tasks" ADD CONSTRAINT "tasks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("Foreign keys added.");

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}
run();
