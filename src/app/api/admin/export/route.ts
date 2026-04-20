import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTableDisplayName } from "@/lib/tables";
import { extractRequestIp, isRateLimited } from "@/lib/admin-security";

export async function GET(request: Request) {
  const ip = extractRequestIp(request);
  if (isRateLimited(`admin-export:${ip}`)) {
    return NextResponse.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const bookingType = searchParams.get("bookingType") ?? "all";

  const startDate = dateParam ? new Date(dateParam) : new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  const { data, error } = await supabaseAdmin
    .from("reservations")
    .select(
      `
      id,
      created_at,
      status,
      total_price,
      is_web_booking,
      start_time,
      end_time,
      tables:table_id (table_number, model_name),
      customers:customer_id (full_name, phone, email)
    `,
    )
    .gte("created_at", startDate.toISOString())
    .lt("created_at", endDate.toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type ExportReservationRow = {
    id: string;
    created_at: string;
    status: string;
    total_price: number;
    is_web_booking: boolean;
    start_time: string;
    end_time: string;
    tables: { table_number: number; model_name: string } | null;
    customers: { full_name: string; phone: string; email: string } | null;
  };

  const rows = ((data ?? []) as ExportReservationRow[]).filter((row) => {
    if (bookingType === "web") return row.is_web_booking;
    if (bookingType === "walkin") return !row.is_web_booking;
    return true;
  });

  const header = [
    "reservation_id",
    "created_at",
    "status",
    "booking_type",
    "full_name",
    "phone",
    "email",
    "table_number",
    "table_model",
    "start_time",
    "end_time",
    "total_price",
  ];

  const csv = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.id,
        row.created_at,
        row.status,
        row.is_web_booking ? "web" : "walkin",
        row.customers?.full_name ?? "",
        row.customers?.phone ?? "",
        row.customers?.email ?? "",
        row.tables?.table_number ?? "",
        row.tables ? getTableDisplayName(row.tables) : "",
        row.start_time,
        row.end_time,
        row.total_price,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mezza9-bookings-${startDate.toISOString().slice(0, 10)}.csv"`,
    },
  });
}
