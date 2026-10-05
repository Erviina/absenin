import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function testInsertProfile() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  try {
    const res = await pool.query(`
      INSERT INTO public.profiles (id, email, full_name, avatar_url)
      VALUES (
        '11111111-1111-1111-1111-111111111111',
        'test-profile-trigger@example.com',
        'Test Name',
        'https://example.com/avatar.png'
      )
      RETURNING *;
    `);
    
    console.log("Success:", res.rows);

    await pool.query(`
      DELETE FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111';
    `);
  } catch (error: any) {
    console.error("Insert Error:", error.message);
  } finally {
    await pool.end();
  }
}

testInsertProfile();
