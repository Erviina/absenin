import { supabaseAdmin as supabase } from './src/lib/supabase';

async function listBuckets() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Error fetching buckets:", error);
  } else {
    console.log("Buckets:", data.map(b => b.name));
  }
}

listBuckets();
