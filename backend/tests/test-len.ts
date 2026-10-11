import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function checkMaxLen() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      SELECT column_name, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles';
    `);
    
    console.table(res.rows);
  } catch (error) {
    console.error("Query Error:", error);
  } finally {
    await pool.end();
  }
}

checkMaxLen();
