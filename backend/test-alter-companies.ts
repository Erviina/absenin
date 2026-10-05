import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function alterCompanies() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    // Add the column
    await pool.query(`
      ALTER TABLE public.companies 
      ADD COLUMN IF NOT EXISTS join_code VARCHAR UNIQUE;
    `);
    
    console.log("Migration successful: Added join_code column.");

    // Verify
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'companies' AND table_schema = 'public' AND column_name = 'join_code';
    `);
    
    console.log("=== COLUMN INFO ===");
    console.table(res.rows);

    const conRes = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) 
      FROM pg_constraint 
      WHERE conrelid = 'public.companies'::regclass
      AND contype = 'u' AND pg_get_constraintdef(oid) LIKE '%join_code%';
    `);
    
    console.log("=== UNIQUE CONSTRAINTS ===");
    console.table(conRes.rows);

  } catch (error: any) {
    console.error("Postgres Error:");
    console.error(error.message);
  } finally {
    await pool.end();
  }
}

alterCompanies();
