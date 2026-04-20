import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateReservationStatusWithLog } from "@/lib/admin-reservations";
import type { Database } from "@/types/database";
import { extractRequestIp, isRateLimited, verifyCsrfFromForm } from "@/lib/admin-security";
import { getAdminPath } from "@/lib/admin-path";

type ReservationStatus = Database["public"]["Tables"]["reservations"]["Row"]["status"];

const allowedStatuses = new Set<ReservationStatus>([
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
]);

export async function POST(request: Request) {
  const ip = extractRequestIp(request);
  if (isRateLimited(`reservation-status:${ip}`)) {
    return NextResponse.json({ error: "Too many requests. Please try again in a minute." }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  if (!verifyCsrfFromForm(request, formData)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const reservationId = String(formData.get("reservationId") ?? "");
  const nextStatus = String(formData.get("status") ?? "") as ReservationStatus;

  if (!reservationId || !allowedStatuses.has(nextStatus)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  try {
    await updateReservationStatusWithLog({
      reservationId,
      nextStatus,
      adminId: user.id,
    });
    return NextResponse.redirect(new URL(getAdminPath(), request.url));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update reservation status." },
      { status: 400 },
    );
  }
}
