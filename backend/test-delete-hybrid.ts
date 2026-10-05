import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function deleteUsersHybrid() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Missing DATABASE_URL");
    return;
  }
  
  const pool = new Pool({ connectionString });
  
  const targetEmails = [
    "dumpme1105@gmail.com",
    "ervinaksnnda@gmail.com",
    "secondtu1105@gmail.com",
    "ervinaanakbaik@gmail.com",
  ];

  try {
    const res = await pool.query(
      `SELECT id, email FROM auth.users WHERE email = ANY($1)`,
      [targetEmails]
    );
    
    console.log("Ditemukan di database:");
    console.table(res.rows);

    const deletedEmails: string[] = [];

    for (const user of res.rows) {
      console.log(`Mencoba deleteUser API untuk ${user.email} (ID: ${user.id})...`);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error(`Gagal menghapus user ${user.email} via API:`, deleteError.message);
        // Fallback SQL deletion if GoTrue fails because they are orphaned/invalid
        console.log(`Mencoba delete via SQL...`);
        await pool.query(`DELETE FROM auth.users WHERE id = $1`, [user.id]);
        console.log(`Berhasil menghapus via SQL: ${user.email}`);
        deletedEmails.push(user.email);
      } else {
        console.log(`Berhasil menghapus user via API: ${user.email}`);
        deletedEmails.push(user.email);
      }
    }

    console.log("\nRingkasan email yang dihapus:");
    console.log(deletedEmails.length > 0 ? deletedEmails.join(", ") : "Tidak ada.");

  } catch (error: any) {
    console.error("Terjadi kesalahan:", error.message);
  } finally {
    await pool.end();
  }
}

deleteUsersHybrid();
