import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

// Buat client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function deleteUsers() {
  const targetEmails = [
    "dumpme1105@gmail.com",
    "ervinaksnnda@gmail.com",
    "secondtu1105@gmail.com",
    "ervinaanakbaik@gmail.com",
  ];

  try {
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      throw listError;
    }

    const deletedEmails: string[] = [];

    for (const user of users) {
      if (user.email && targetEmails.includes(user.email)) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error(`Gagal menghapus user ${user.email} (ID: ${user.id}):`, deleteError.message);
        } else {
          console.log(`Berhasil menghapus user: ${user.email} (ID: ${user.id})`);
          deletedEmails.push(user.email);
        }
      }
    }

    console.log("\nRingkasan email yang dihapus:");
    console.log(deletedEmails.length > 0 ? deletedEmails.join(", ") : "Tidak ada user target yang ditemukan/dihapus.");

  } catch (error: any) {
    console.error("Terjadi kesalahan:", error.message);
  }
}

deleteUsers();
