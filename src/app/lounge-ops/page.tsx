import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatPHP } from "@/lib/pricing";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import { markDueNoShowsAndLog } from "@/lib/admin-reservations";
import { getTableDisplayLabel } from "@/lib/tables";
import { getAdminCsrfCookieName } from "@/lib/admin-security";

async function enforceAdminAccess() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.role !== "admin") redirect("/");
  return user;
}

type SearchParams = {
  date?: string;
  bookingType?: "all" | "web" | "walkin";
};

type DashboardReservationRow = {
  id: string;
  total_price: number;
  is_web_booking: boolean;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  start_time: string;
  end_time: string;
  created_at: string;
  tables: { table_number: number; model_name: string } | null;
  customers: { full_name: string; phone: string; email: string } | null;
};

type DashboardTableRow = {
  id: string;
  table_number: number;
  model_name: string;
  status: "AVAILABLE" | "RESERVED" | "IN_USE" | "MAINTENANCE";
  is_premium: boolean;
};

async function getDashboardData(searchParams: SearchParams) {
  const supabaseAdmin = getSupabaseAdminClient();
  const targetDate = searchParams.date ? new Date(searchParams.date) : new Date();
  targetDate.setHours(0, 0, 0, 0);
  const startOfDay = targetDate;
  const endOfDay = new Date(targetDate);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [reservationsRes, tablesRes] = await Promise.all([
    supabaseAdmin
      .from("reservations")
      .select(
        `
        id,
        total_price,
        is_web_booking,
        status,
        start_time,
        end_time,
        created_at,
        tables:table_id (table_number, model_name),
        customers:customer_id (full_name, phone, email)
      `,
      )
      .lt("start_time", endOfDay.toISOString())
      .gt("end_time", startOfDay.toISOString())
      .order("start_time", { ascending: true }),
    supabaseAdmin.from("tables").select("id, table_number, model_name, status, is_premium").order("table_number"),
  ]);

  if (reservationsRes.error) throw reservationsRes.error;
  if (tablesRes.error) throw tablesRes.error;

  const typeFilter = searchParams.bookingType ?? "all";
  const filteredReservations = ((reservationsRes.data ?? []) as DashboardReservationRow[]).filter((r) => {
    if (typeFilter === "web") return r.is_web_booking;
    if (typeFilter === "walkin") return !r.is_web_booking;
    return true;
  });

  const confirmed = filteredReservations.filter((r) =>
    ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(r.status),
  );
  const webRevenue = confirmed
    .filter((r) => r.is_web_booking)
    .reduce((sum, r) => sum + Number(r.total_price), 0);
  const walkInRevenue = confirmed
    .filter((r) => !r.is_web_booking)
    .reduce((sum, r) => sum + Number(r.total_price), 0);

  return {
    reservations: filteredReservations,
    tables: (tablesRes.data ?? []) as DashboardTableRow[],
    revenue: {
      total: webRevenue + walkInRevenue,
      web: webRevenue,
      walkIn: walkInRevenue,
    },
  };
}

function formatBookingTimeRange(startISO: string, endISO: string) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  return `${start.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })} - ${end.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; bookingType?: "all" | "web" | "walkin" }>;
}) {
  const adminUser = await enforceAdminAccess();
  await markDueNoShowsAndLog(adminUser.id);
  const resolvedParams = await searchParams;
  const data = await getDashboardData(resolvedParams);
  const dateValue = resolvedParams.date ?? new Date().toISOString().split("T")[0];
  const bookingType = resolvedParams.bookingType ?? "all";
  const timelineHours = [...Array.from({ length: 9 }, (_, i) => i + 15), 0];
  const csrfToken = (await cookies()).get(getAdminCsrfCookieName())?.value ?? "";

  return (
    <main className="min-h-screen bg-[#111315] p-4 text-white md:p-8">
      <section className="mx-auto max-w-6xl space-y-6">
        <header>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-cyan-300">Mezza9 Admin Control Center</h1>
              <p className="text-sm text-zinc-300">Daily reservations, table overrides, and revenue insights.</p>
            </div>
            <AdminLogoutButton />
          </div>
        </header>

        <form method="get" className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-700 bg-zinc-900/70 p-4 md:grid-cols-4">
          <input
            type="date"
            name="date"
            defaultValue={dateValue}
            className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm"
          />
          <select
            name="bookingType"
            defaultValue={bookingType}
            className="rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm"
          >
            <option value="all">All Bookings</option>
            <option value="web">Web Only</option>
            <option value="walkin">Walk-ins Only</option>
          </select>
          <button className="rounded-md bg-cyan-500 px-3 py-2 text-sm font-semibold text-black" type="submit">
            Apply Filters
          </button>
          <a
            className="rounded-md border border-lime-500/40 px-3 py-2 text-center text-sm font-semibold text-lime-300"
            href={`/api/admin/export?date=${encodeURIComponent(dateValue)}&bookingType=${encodeURIComponent(bookingType)}`}
          >
            Export CSV
          </a>
        </form>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-cyan-500/30 bg-zinc-900/70 p-4">
            <p className="text-sm text-zinc-400">Total Daily Revenue</p>
            <p className="text-2xl font-semibold text-cyan-300">{formatPHP(data.revenue.total)}</p>
          </div>
          <div className="rounded-xl border border-lime-500/30 bg-zinc-900/70 p-4">
            <p className="text-sm text-zinc-400">Web Bookings</p>
            <p className="text-2xl font-semibold text-lime-300">{formatPHP(data.revenue.web)}</p>
          </div>
          <div className="rounded-xl border border-yellow-500/30 bg-zinc-900/70 p-4">
            <p className="text-sm text-zinc-400">Walk-ins</p>
            <p className="text-2xl font-semibold text-yellow-300">{formatPHP(data.revenue.walkIn)}</p>
          </div>
        </div>

        <section className="rounded-xl border border-zinc-700 bg-zinc-900/70 p-4">
          <h2 className="mb-4 text-lg font-semibold">Manual Table Override</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {data.tables.map((table) => (
              <form key={table.id} action="/api/admin/table-status" method="post" className="rounded-lg border border-zinc-700 p-3">
                <input type="hidden" name="tableId" value={table.id} />
                <input type="hidden" name="csrfToken" value={csrfToken} />
                <label className="block text-sm font-medium">
                  {getTableDisplayLabel(table)}
                  {table.is_premium ? (
                    <span className="ml-2 rounded-full border border-yellow-500/50 bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-300">
                      PREMIUM
                    </span>
                  ) : null}
                </label>
                <select
                  className="mt-2 w-full rounded-md border border-zinc-600 bg-zinc-800 px-2 py-2 text-sm"
                  name="status"
                  defaultValue={table.status}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="RESERVED">RESERVED</option>
                  <option value="IN_USE">IN_USE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
                <button className="mt-2 w-full rounded-md bg-cyan-500 px-3 py-2 text-sm font-semibold text-black" type="submit">
                  Update
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/70">
          <h2 className="border-b border-zinc-700 px-4 py-3 text-lg font-semibold">Table Timeline (15:00-01:00)</h2>
          <div className="space-y-3 p-4">
            {data.tables.map((table) => {
              const tableBookings = data.reservations.filter((booking) => booking.tables?.table_number === table.table_number);
              return (
                <div key={`timeline-${table.id}`} className="space-y-1">
                  <p className="text-sm font-semibold">
                    {getTableDisplayLabel(table)}
                  </p>
                  <div className="grid grid-cols-5 gap-1 md:grid-cols-10">
                    {timelineHours.map((hour) => {
                      const overlaps = tableBookings.some((booking) => {
                        const start = new Date(booking.start_time);
                        const end = new Date(booking.end_time);
                        const slotStart = new Date(`${dateValue}T00:00:00`);
                        if (hour === 0) {
                          slotStart.setDate(slotStart.getDate() + 1);
                        } else {
                          slotStart.setHours(hour, 0, 0, 0);
                        }
                        const slotEnd = new Date(slotStart);
                        slotEnd.setHours(slotEnd.getHours() + 1);
                        return start < slotEnd && end > slotStart && ["CONFIRMED", "CHECKED_IN"].includes(booking.status);
                      });
                      return (
                        <div
                          key={`${table.id}-${hour}`}
                          className={`rounded px-1 py-2 text-center text-[10px] ${overlaps ? "bg-cyan-500/80 text-black" : "bg-zinc-800 text-zinc-300"}`}
                        >
                          {hour === 0 ? "00:00" : `${String(hour).padStart(2, "0")}:00`}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {tableBookings
                      .filter((booking) => ["CONFIRMED", "CHECKED_IN"].includes(booking.status))
                      .map((booking) => (
                        <div key={booking.id} className="rounded border border-zinc-700 bg-zinc-800/80 px-2 py-1 text-[11px] text-zinc-300">
                          <span className="font-semibold text-cyan-200">{booking.customers?.full_name}</span>
                          <span className="mx-1 text-zinc-500">|</span>
                          <span>{formatBookingTimeRange(booking.start_time, booking.end_time)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/70">
          <h2 className="border-b border-zinc-700 px-4 py-3 text-lg font-semibold">Today&apos;s Bookings</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-800/80 text-left text-zinc-300">
                <tr>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2">Contact</th>
                  <th className="px-4 py-2">Table</th>
                  <th className="px-4 py-2">Reservation Details</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Actions</th>
                  <th className="px-4 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.reservations.map((booking) => (
                  <tr key={booking.id} className="border-t border-zinc-800">
                    <td className="px-4 py-2">{booking.customers?.full_name}</td>
                    <td className="px-4 py-2">
                      <p>{booking.customers?.phone}</p>
                      <p className="text-xs text-zinc-400">{booking.customers?.email}</p>
                    </td>
                    <td className="px-4 py-2">
                      {booking.tables ? getTableDisplayLabel(booking.tables) : "-"}
                    </td>
                    <td className="px-4 py-2">
                      <p className="font-medium text-cyan-200">{formatBookingTimeRange(booking.start_time, booking.end_time)}</p>
                      <p className="text-xs text-zinc-400">
                        Date: {new Date(booking.start_time).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </p>
                    </td>
                    <td className="px-4 py-2">{booking.is_web_booking ? "Web" : "Walk-in"}</td>
                    <td className="px-4 py-2">{booking.status}</td>
                    <td className="px-4 py-2">
                      <form action="/api/admin/reservation-status" method="post" className="flex flex-wrap gap-1">
                        <input type="hidden" name="reservationId" value={booking.id} />
                        <input type="hidden" name="csrfToken" value={csrfToken} />
                        {booking.status === "CONFIRMED" ? (
                          <button className="rounded bg-lime-500 px-2 py-1 text-xs font-semibold text-black" name="status" value="CHECKED_IN" type="submit">
                            Check In
                          </button>
                        ) : null}
                        {booking.status === "CHECKED_IN" ? (
                          <button className="rounded bg-cyan-500 px-2 py-1 text-xs font-semibold text-black" name="status" value="COMPLETED" type="submit">
                            Complete
                          </button>
                        ) : null}
                        {["PENDING", "CONFIRMED"].includes(booking.status) ? (
                          <>
                            <button className="rounded bg-zinc-600 px-2 py-1 text-xs" name="status" value="CANCELLED" type="submit">
                              Cancel
                            </button>
                            <button className="rounded bg-yellow-500 px-2 py-1 text-xs text-black" name="status" value="NO_SHOW" type="submit">
                              No-show
                            </button>
                          </>
                        ) : null}
                      </form>
                    </td>
                    <td className="px-4 py-2">{formatPHP(Number(booking.total_price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
