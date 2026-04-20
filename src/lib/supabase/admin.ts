import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local.");
  }

  if (!secretKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY. Set it in .env.local.");
  }

  return createClient<Database>(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
