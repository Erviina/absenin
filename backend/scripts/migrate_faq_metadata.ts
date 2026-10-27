import { Client } from "pg";
import dotenv from "dotenv";
dotenv.config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log("=== STARTING FAQ METADATA MIGRATION ===");
    console.log("Connected to PostgreSQL database.");

    // 1. Tambah kolom baru jika belum ada
    console.log("1. Adding columns (content_scope, target_roles, content_type, display_context, needs_review)...");
    await client.query(`
      ALTER TABLE "faqs" 
        ADD COLUMN IF NOT EXISTS "content_scope" varchar(50) NOT NULL DEFAULT 'company',
        ADD COLUMN IF NOT EXISTS "target_roles" text[] NOT NULL DEFAULT '{}'::text[],
        ADD COLUMN IF NOT EXISTS "content_type" varchar(50) NOT NULL DEFAULT 'faq',
        ADD COLUMN IF NOT EXISTS "display_context" varchar(50) NOT NULL DEFAULT 'help_center',
        ADD COLUMN IF NOT EXISTS "needs_review" boolean NOT NULL DEFAULT false;
    `);
    console.log("✓ Columns added successfully.");

    // 2. Tambah index
    console.log("2. Adding indexes...");
    await client.query(`
      CREATE INDEX IF NOT EXISTS "faqs_content_scope_idx" ON "faqs" ("content_scope");
      CREATE INDEX IF NOT EXISTS "faqs_content_type_idx" ON "faqs" ("content_type");
      CREATE INDEX IF NOT EXISTS "faqs_display_context_idx" ON "faqs" ("display_context");
      CREATE INDEX IF NOT EXISTS "faqs_needs_review_idx" ON "faqs" ("needs_review");
      CREATE INDEX IF NOT EXISTS "faqs_target_roles_gin_idx" ON "faqs" USING GIN ("target_roles");
    `);
    console.log("✓ Indexes created successfully.");

    // 3. Backfill data lama secara konservatif
    // Kebijakan:
    // - scope = 'platform_admin' -> content_scope = 'platform', target_roles = ['platform_admin']
    // - scope = 'company' -> content_scope = 'company', target_roles = ['company_owner_admin', 'manager', 'employee']
    // - scope = 'global' -> content_scope = 'company', target_roles = ['company_owner_admin', 'manager', 'employee']
    // - jika sop_title atau sop_url ada -> content_type = 'sop_guide', selain itu 'faq'
    // - display_context = 'help_center' (konservatif, jangan mengarang login)
    // - needs_review = true (karena klasifikasi otomatis belum ditinjau manual oleh admin)
    console.log("3. Backfilling legacy FAQ data with conservative defaults and marking needs_review = true...");
    
    // Update platform admin faqs
    await client.query(`
      UPDATE "faqs"
      SET 
        "content_scope" = 'platform',
        "target_roles" = ARRAY['platform_admin']::text[],
        "content_type" = CASE 
          WHEN "sop_title" IS NOT NULL OR "sop_url" IS NOT NULL THEN 'sop_guide'
          ELSE 'faq'
        END,
        "display_context" = 'help_center',
        "needs_review" = true
      WHERE "scope" = 'platform_admin';
    `);

    // Update company and global faqs
    await client.query(`
      UPDATE "faqs"
      SET 
        "content_scope" = CASE 
          WHEN "scope" = 'company' THEN 'company'
          ELSE 'company'
        END,
        "target_roles" = ARRAY['company_owner_admin', 'manager', 'employee']::text[],
        "content_type" = CASE 
          WHEN "sop_title" IS NOT NULL OR "sop_url" IS NOT NULL THEN 'sop_guide'
          ELSE 'faq'
        END,
        "display_context" = 'help_center',
        "needs_review" = true
      WHERE "scope" IN ('company', 'global');
    `);

    console.log("✓ Backfill completed.");

    // 4. Verifikasi schema dan data hasil migrasi
    const colRes = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'faqs'
      ORDER BY ordinal_position;
    `);
    console.log("\n--- Updated Columns in faqs table ---");
    console.table(colRes.rows);

    const sampleRes = await client.query(`
      SELECT id, question, scope, content_scope, target_roles, content_type, display_context, needs_review
      FROM "faqs"
      LIMIT 8;
    `);
    console.log("\n--- Sample Migrated Records ---");
    console.table(sampleRes.rows);

    console.log("\n=== FAQ METADATA MIGRATION FINISHED SUCCESSFULLY ===");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
