import { db } from './src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    console.log("Creating notifications table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" uuid NOT NULL,
        "recipient_id" uuid NOT NULL,
        "type" varchar NOT NULL,
        "title" varchar NOT NULL,
        "message" text NOT NULL,
        "reference_id" uuid,
        "is_read" boolean NOT NULL DEFAULT false,
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    console.log("Table notifications created.");

    console.log("Adding foreign keys...");
    await db.execute(sql`
      DO $$ BEGIN
       ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
       ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_profiles_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("Foreign keys added.");

    console.log("Adding indexes...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "notifications_recipient_idx" ON "notifications" ("recipient_id");
      CREATE INDEX IF NOT EXISTS "notifications_unread_idx" ON "notifications" ("recipient_id", "is_read");
      CREATE INDEX IF NOT EXISTS "notifications_created_idx" ON "notifications" ("created_at" DESC);
    `);
    console.log("Indexes added.");

    console.log("Setting up RLS and Policies...");
    await db.execute(sql`
      ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        CREATE POLICY "Users can view their own notifications"
        ON "notifications"
        FOR SELECT
        USING (recipient_id = auth.uid());
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE POLICY "Users can update their own notifications is_read"
        ON "notifications"
        FOR UPDATE
        USING (recipient_id = auth.uid())
        WITH CHECK (recipient_id = auth.uid());
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    console.log("Setting up column update restrictions...");
    // We use a trigger to strictly enforce that ONLY is_read can be updated by non-superusers.
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION restrict_notifications_update()
      RETURNS TRIGGER AS $func$
      BEGIN
        IF current_setting('role') = 'authenticated' THEN
          IF NEW.id IS DISTINCT FROM OLD.id OR 
             NEW.company_id IS DISTINCT FROM OLD.company_id OR 
             NEW.recipient_id IS DISTINCT FROM OLD.recipient_id OR 
             NEW.type IS DISTINCT FROM OLD.type OR 
             NEW.title IS DISTINCT FROM OLD.title OR 
             NEW.message IS DISTINCT FROM OLD.message OR 
             NEW.reference_id IS DISTINCT FROM OLD.reference_id OR 
             NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'User is only allowed to update the is_read column';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $func$ LANGUAGE plpgsql;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TRIGGER trg_restrict_notifications_update
        BEFORE UPDATE ON "notifications"
        FOR EACH ROW
        EXECUTE FUNCTION restrict_notifications_update();
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    console.log("Migration successful.");

  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit(0);
  }
}
run();
