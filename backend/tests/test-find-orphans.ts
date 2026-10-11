import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function listOrphans() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      SELECT p.id, p.email, p.created_at
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.id
      WHERE u.id IS NULL;
    `);
    
    console.log("Orphans in public.profiles:");
    console.table(res.rows);

    const res2 = await pool.query(`
      SELECT id, email, created_at
      FROM auth.users
      ORDER BY created_at DESC NULLS FIRST
      LIMIT 10;
    `);
    console.log("Recent auth.users:");
    console.table(res2.rows);

  } catch (error) {
    console.error("Query Error:", error);
  } finally {
    await pool.end();
  }
}

listOrphans();
