import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function checkOrphans() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      SELECT p.email, p.id as profile_id, u.id as auth_id
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.id
      WHERE u.id IS NULL;
    `);
    
    console.table(res.rows);
  } catch (error) {
    console.error("Query Error:", error);
  } finally {
    await pool.end();
  }
}

checkOrphans();
