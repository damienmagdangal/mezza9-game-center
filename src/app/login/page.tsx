"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const adminPath = process.env.NEXT_PUBLIC_ADMIN_PATH || "/lounge-ops";
    window.location.assign(adminPath);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f1112] p-4 text-white">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-700 bg-zinc-900/70 p-5">
        <h1 className="text-xl font-bold text-cyan-300">Login</h1>

        <input
          required
          type="email"
          name="email"
          placeholder="Email"
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
        />
        <input
          required
          type="password"
          name="password"
          placeholder="Password"
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-cyan-400 px-3 py-2 font-semibold text-black disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </form>
    </main>
  );
}
