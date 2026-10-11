import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function checkTriggerTypes() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      SELECT tgname, tgenabled, tgtype, event_manipulation
      FROM pg_trigger t
      JOIN information_schema.triggers i ON i.trigger_name = t.tgname
      WHERE t.tgname IN ('set_updated_at_profiles', 'assign_default_profile_role_after_insert', 'on_auth_user_created')
    `);
    
    console.table(res.rows);
  } catch (error) {
    console.error("Query Error:", error);
  } finally {
    await pool.end();
  }
}

checkTriggerTypes();
