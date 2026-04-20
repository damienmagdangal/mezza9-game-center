import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local.");
  if (!publishableKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Set it in .env.local.");

  return createBrowserClient<Database>(supabaseUrl, publishableKey);
}
