import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    console.log("Creating user_consents table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_consents" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "profile_id" uuid NOT NULL,
        "policy_version" varchar(50) NOT NULL,
        "consent_type" varchar(100) NOT NULL DEFAULT 'data_processing_and_privacy',
        "is_accepted" boolean NOT NULL DEFAULT true,
        "ip_address" varchar(100),
        "user_agent" text,
        "consented_at" timestamp with time zone NOT NULL DEFAULT now(),
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("Table user_consents created successfully.");

    console.log("Adding foreign keys...");
    await db.execute(sql`
      DO $$ BEGIN
       ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_profile_id_profiles_id_fk" 
       FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("Foreign keys added.");

    console.log("Adding indexes...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "user_consents_profile_idx" ON "user_consents" ("profile_id");
      CREATE INDEX IF NOT EXISTS "user_consents_profile_version_idx" ON "user_consents" ("profile_id", "policy_version");
      CREATE INDEX IF NOT EXISTS "user_consents_created_idx" ON "user_consents" ("created_at" DESC);
    `);
    console.log("Indexes added.");

    console.log("Enabling Row Level Security...");
    await db.execute(sql`
      ALTER TABLE "user_consents" ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        CREATE POLICY "Users can view their own consents"
        ON "user_consents"
        FOR SELECT
        USING (profile_id = auth.uid());
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE POLICY "Users can insert their own consent"
        ON "user_consents"
        FOR INSERT
        WITH CHECK (profile_id = auth.uid());
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("RLS policies added.");

    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

run();
