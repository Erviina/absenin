import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function checkCompanies() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      SELECT column_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'companies' AND table_schema = 'public';
    `);
    console.table(res.rows);
    
    // Test the exact insert
    await pool.query(`
      INSERT INTO companies (id, name, address, join_code, created_by)
      VALUES (gen_random_uuid(), 'GCC', 'jl menuju kesuksesan', '32LWB1', '2cd58086-e794-4a4e-8f57-66a7539402be')
      RETURNING *
    `);
    
  } catch (error: any) {
    console.error("Postgres Error:");
    console.error(error.message);
  } finally {
    // Clean up if somehow it succeeded
    await pool.query(`DELETE FROM companies WHERE name = 'GCC'`);
    await pool.end();
  }
}

checkCompanies();
