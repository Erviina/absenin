import { db } from './src/db/index';
import { sql } from 'drizzle-orm';

async function run() {
  try {
    console.log("--- Checking columns ---");
    const cols = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications'
      ORDER BY ordinal_position;
    `);
    console.log(cols.rows);

    console.log("\n--- Checking Primary Keys ---");
    const pks = await db.execute(sql`
      SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type
      FROM   pg_index i
      JOIN   pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE  i.indrelid = 'public.notifications'::regclass AND i.indisprimary;
    `);
    console.log(pks.rows);

    console.log("\n--- Checking Foreign Keys ---");
    const fks = await db.execute(sql`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'notifications';
    `);
    console.log(fks.rows);

    console.log("\n--- Checking Indexes ---");
    const idxs = await db.execute(sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'notifications' AND schemaname = 'public';
    `);
    console.log(idxs.rows);

    console.log("\n--- Checking RLS & Policies ---");
    const rls = await db.execute(sql`
      SELECT relrowsecurity FROM pg_class WHERE oid = 'public.notifications'::regclass;
    `);
    console.log("Row Level Security Enabled:", rls.rows[0]?.relrowsecurity);

    const policies = await db.execute(sql`
      SELECT polname, polcmd, polroles, polqual, polwithcheck
      FROM pg_policy
      WHERE polrelid = 'public.notifications'::regclass;
    `);
    console.log(policies.rows);

    console.log("\n--- Checking Triggers ---");
    const triggers = await db.execute(sql`
      SELECT trigger_name, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'notifications';
    `);
    console.log(triggers.rows);

  } catch (err) {
    console.error("Check failed:", err);
  } finally {
    process.exit(0);
  }
}
run();
