import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function checkFunc() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      SELECT prosrc 
      FROM pg_proc 
      WHERE proname = 'is_company_admin';
    `);
    
    console.log(res.rows[0]?.prosrc);
  } catch (error) {
    console.error("Query Error:", error);
  } finally {
    await pool.end();
  }
}

checkFunc();
