import { Pool } from "pg";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function checkJoinRequests() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'company_join_requests'
      ORDER BY ordinal_position;
    `);

    const enums = await pool.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'join_request_status_enum' OR t.typname = 'request_status_enum';
    `);

    const rls = await pool.query(`
      SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as USING, pg_get_expr(polwithcheck, polrelid) as WITH_CHECK
      FROM pg_policy
      WHERE polrelid = 'public.company_join_requests'::regclass;
    `);

    const out = {
      cols: cols.rows,
      enums: enums.rows,
      rls: rls.rows,
    };
    
    fs.writeFileSync("output.json", JSON.stringify(out, null, 2));
    console.log("Written to output.json");

  } catch (error) {
    console.error("Query Error:", error);
  } finally {
    await pool.end();
  }
}

checkJoinRequests();
