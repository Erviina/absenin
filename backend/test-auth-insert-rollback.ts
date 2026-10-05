import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function testAuthInsert() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      BEGIN;
      
      -- Insert into auth.users just like GoTrue does
      INSERT INTO auth.users (
        id, 
        instance_id, 
        email, 
        aud, 
        role, 
        raw_app_meta_data, 
        raw_user_meta_data, 
        created_at, 
        updated_at, 
        email_confirmed_at
      )
      VALUES (
        '11111111-2222-3333-4444-555555555555',
        '00000000-0000-0000-0000-000000000000',
        'dumpme1105@gmail.com',
        'authenticated',
        'authenticated',
        '{}'::jsonb,
        '{"full_name": "Test User", "avatar_url": "http"}'::jsonb,
        now(),
        now(),
        now()
      )
      RETURNING id, email;
      
    `);
    
    console.log("Insert successful, rolling back...");
    console.log(res.rows);
  } catch (error: any) {
    console.error("Postgres Error Caught!");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Detail:", error.detail);
    console.error("Hint:", error.hint);
    console.error("Where:", error.where);
  } finally {
    await pool.query('ROLLBACK;');
    await pool.end();
  }
}

testAuthInsert();
