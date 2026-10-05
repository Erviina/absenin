import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function testAuthRead() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      SELECT id, email, created_at
      FROM auth.users
      WHERE email = 'dumpme1105@gmail.com';
    `);
    
    console.table(res.rows);
  } catch (error: any) {
    console.error("Query Error:", error);
  } finally {
    await pool.end();
  }
}

testAuthRead();
