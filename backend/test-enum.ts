import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function checkEnum() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      SELECT unnest(enum_range(NULL::public.user_role_enum)) AS role;
    `);
    
    console.table(res.rows);
  } catch (error) {
    console.error("Query Error:", error);
  } finally {
    await pool.end();
  }
}

checkEnum();
