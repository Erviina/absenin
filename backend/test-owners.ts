import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function checkOwners() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      SELECT p.proname, p.prosecdef, pg_get_userbyid(p.proowner) as owner, u.rolsuper, u.rolbypassrls
      FROM pg_proc p
      JOIN pg_roles u ON p.proowner = u.oid
      WHERE p.proname IN ('handle_new_user', 'assign_default_profile_role');
    `);
    
    console.table(res.rows);
  } catch (error) {
    console.error("Query Error:", error);
  } finally {
    await pool.end();
  }
}

checkOwners();
