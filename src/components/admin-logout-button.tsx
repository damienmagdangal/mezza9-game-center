"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AdminLogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function onLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={onLogout} className="rounded-md border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300">
      Sign Out
    </button>
  );
}
