import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function checkProfileTriggers() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      SELECT
        t.tgname as trigger_name,
        p.proname as function_name,
        p.prosrc as function_body
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE n.nspname = 'public' AND c.relname = 'profiles'
        AND t.tgisinternal = false;
    `);
    
    console.log("Found profile triggers:", res.rows.length);
    for (const row of res.rows) {
      console.log("Trigger Name:", row.trigger_name);
      console.log("Function Name:", row.function_name);
      console.log("Function Body:");
      console.log(row.function_body);
      console.log("------------------------");
    }
  } catch (error) {
    console.error("Query Error:", error);
  } finally {
    await pool.end();
  }
}

checkProfileTriggers();
