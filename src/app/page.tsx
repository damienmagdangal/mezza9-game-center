import Link from "next/link";
import { BookingForm } from "@/components/booking-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getTableDisplayLabel } from "@/lib/tables";

type HomeTable = {
  id: string;
  table_number: number;
  model_name: string;
  base_price_per_hour: number;
  is_premium: boolean;
};

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: tables } = await supabase
    .from("tables")
    .select("id, table_number, model_name, base_price_per_hour, is_premium")
    .order("table_number");
  const tableRows = (tables ?? []) as HomeTable[];

  return (
    <main className="min-h-screen bg-[#0f1112] bg-[radial-gradient(circle_at_top,_rgba(0,255,255,0.14),_transparent_48%),radial-gradient(circle_at_bottom,_rgba(163,230,53,0.14),_transparent_45%)] px-4 py-8 text-white">
      <section className="mx-auto max-w-md space-y-4">
        <header className="space-y-3 rounded-2xl border border-cyan-400/30 bg-gradient-to-b from-[#132248]/70 to-[#111827]/75 p-5 shadow-[0_0_45px_rgba(0,170,255,0.15)]">
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Billiards Reservation</p>
          <h1 className="text-3xl font-bold text-yellow-300">Mezza9 Game Center</h1>
          <p className="text-sm text-zinc-300">Book online and get <strong className="text-cyan-300">10% off</strong> instantly. Premium feel, fast confirmation.</p>
        </header>


        <BookingForm tables={tableRows} />

        <div className="space-y-3 rounded-2xl border border-zinc-700 bg-zinc-900/60 p-4 text-sm">
        <h2 className="text-lg font-semibold text-cyan-300">Our Latest Price List</h2>
          {tableRows.map((table) => (
            (() => {
              const isPremiumTable = table.is_premium;
              return (
            <div
              key={table.id}
              className={`rounded-xl border p-3 ${
                isPremiumTable
                  ? "border-yellow-400/50 bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-zinc-900 shadow-[0_0_30px_rgba(250,204,21,0.18)]"
                  : "border-zinc-700 bg-zinc-900/70"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-100">{getTableDisplayLabel(table)}</p>
                  <p className="text-xs text-zinc-400">Rate per hour</p>
                </div>
                {isPremiumTable ? (
                  <span className="rounded-full border border-yellow-400/60 bg-yellow-400/20 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-yellow-200">
                    PREMIUM PICK
                  </span>
                ) : null}
              </div>
              <p className={`mt-2 text-base font-semibold ${isPremiumTable ? "text-yellow-200" : "text-cyan-200"}`}>
                PHP {table.base_price_per_hour}/hr
              </p>
            </div>
              );
            })()
          ))}
        </div>

        <section className="rounded-2xl border border-zinc-700 bg-zinc-900/60 p-4 text-sm">
          <p className="mb-2 text-xs uppercase tracking-widest text-zinc-400">Follow Mezza9</p>
          <div className="flex gap-2">
            <a
              href="https://www.instagram.com/mezza9.ph/?e=5a591574-b644-497f-a5f1-f8ea53f6a522&g=5"
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10 px-3 py-2 text-center font-semibold text-fuchsia-300"
            >
              Instagram
            </a>
            <a
              href="https://www.facebook.com/p/Mezza9-Game-Center-61578166713824/"
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-center font-semibold text-blue-300"
            >
              Facebook
            </a>
          </div>
        </section>

        <p className="text-center text-xs text-zinc-400">
          By booking, you agree to our{" "}
          <Link href="/terms" className="text-cyan-300 underline">
            Terms & Rules
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
