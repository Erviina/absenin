import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("SUPABASE_URL available:", !!url);
console.log("SUPABASE_URL value starts with http:", url?.startsWith("http"));
console.log("SUPABASE_SERVICE_ROLE_KEY available:", !!key);
console.log("Key length:", key?.length);

async function testConnection() {
  if (!url || !key) {
    console.error("Missing credentials");
    return;
  }
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    console.log("Attempting to list users (limit 1)...");
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      console.log("Supabase Admin error:", error.message);
    } else {
      console.log("Supabase Admin success, users found:", data.users.length);
    }
  } catch (err: any) {
    console.log("Caught Exception:", err.message);
    if (err.cause) {
      console.log("Cause:", err.cause.message);
    }
  }

  // Also test basic fetch
  try {
    console.log(`Attempting basic fetch to ${url}/auth/v1/health...`);
    const res = await fetch(`${url}/auth/v1/health`);
    console.log("Basic fetch status:", res.status);
    console.log("Basic fetch ok:", res.ok);
  } catch (err: any) {
    console.log("Basic fetch caught Exception:", err.message);
    if (err.cause) {
      console.log("Basic fetch Cause:", err.cause.message);
    }
  }
}

testConnection();
