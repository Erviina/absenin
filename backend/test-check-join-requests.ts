import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function checkJoinRequests() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    console.log("=== COLUMNS ===");
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'company_join_requests'
      ORDER BY ordinal_position;
    `);
    console.table(cols.rows);

    console.log("=== ENUM VALUES (if any) ===");
    const enums = await pool.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'join_request_status_enum' OR t.typname = 'request_status_enum';
    `);
    console.table(enums.rows);

    console.log("=== FOREIGN KEYS ===");
    const fks = await pool.query(`
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
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'company_join_requests';
    `);
    console.table(fks.rows);

    console.log("=== UNIQUE/CHECK CONSTRAINTS ===");
    const cons = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'public.company_join_requests'::regclass
      AND contype IN ('u', 'c');
    `);
    console.table(cons.rows);

    console.log("=== INDEXES ===");
    const idxs = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'company_join_requests' AND schemaname = 'public';
    `);
    console.table(idxs.rows);

    console.log("=== RLS POLICIES ===");
    const rls = await pool.query(`
      SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as USING, pg_get_expr(polwithcheck, polrelid) as WITH_CHECK
      FROM pg_policy
      WHERE polrelid = 'public.company_join_requests'::regclass;
    `);
    console.table(rls.rows);

  } catch (error) {
    console.error("Query Error:", error);
  } finally {
    await pool.end();
  }
}

checkJoinRequests();
