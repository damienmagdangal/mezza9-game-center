import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local.");
  if (!publishableKey) throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Set it in .env.local.");

  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseUrl,
    publishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookieList: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          cookieList.forEach(({ name, value, options }) => {
            // In Server Components, cookie writes can throw because they are read-only.
            // Allow auth reads to work and let Route Handlers/Server Actions handle writes.
            try {
              cookieStore.set(name, value, options);
            } catch {
              // no-op
            }
          });
        },
      },
    },
  );
}
