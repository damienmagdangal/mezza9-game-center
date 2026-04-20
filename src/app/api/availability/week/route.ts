import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type WeekReservationRow = {
  id: string;
  table_id: string;
  start_time: string;
  end_time: string;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  tables: { table_number: number; model_name: string } | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStartISO = searchParams.get("weekStartISO");

    if (!weekStartISO) {
      return NextResponse.json({ error: "Missing weekStartISO query parameter." }, { status: 400 });
    }

    const weekStart = new Date(weekStartISO);
    if (Number.isNaN(weekStart.getTime())) {
      return NextResponse.json({ error: "Invalid weekStartISO value." }, { status: 400 });
    }

    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const supabaseAdmin = getSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from("reservations")
      .select("id, start_time, end_time, status, table_id, tables:table_id(table_number, model_name)")
      .in("status", ["PENDING", "CONFIRMED", "CHECKED_IN"])
      .lt("start_time", weekEnd.toISOString())
      .gt("end_time", weekStart.toISOString())
      .order("start_time", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      weekStartISO: weekStart.toISOString(),
      weekEndISO: weekEnd.toISOString(),
      reservations: ((data ?? []) as WeekReservationRow[]).map((reservation) => ({
        id: reservation.id,
        tableId: reservation.table_id,
        tableNumber: reservation.tables?.table_number ?? 0,
        modelName: reservation.tables?.model_name ?? "",
        startTimeISO: reservation.start_time,
        endTimeISO: reservation.end_time,
        status: reservation.status,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load weekly reservations." },
      { status: 500 },
    );
  }
}
