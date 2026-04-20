import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type ReservationStatus = Database["public"]["Tables"]["reservations"]["Row"]["status"];
type ReservationRow = {
  id: string;
  status: ReservationStatus;
  table_id: string;
  customer_id: string;
};
type DueReservationRow = {
  id: string;
  table_id: string;
  customer_id: string;
  start_time: string;
  status: ReservationStatus;
};

const allowedTransitions: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export async function updateReservationStatusWithLog(args: {
  reservationId: string;
  nextStatus: ReservationStatus;
  adminId: string;
}) {
  const supabaseAdmin = getSupabaseAdminClient();

  const { data: reservationData, error: reservationError } = await (supabaseAdmin as any)
    .from("reservations")
    .select("id, status, table_id, customer_id")
    .eq("id", args.reservationId)
    .single();
  if (reservationError) throw reservationError;
  const reservation = reservationData as ReservationRow;

  const currentStatus = reservation.status;
  if (!allowedTransitions[currentStatus].includes(args.nextStatus)) {
    throw new Error(`Invalid transition: ${currentStatus} -> ${args.nextStatus}`);
  }

  const { data: updatedData, error: updateError } = await (supabaseAdmin as any)
    .from("reservations")
    .update({ status: args.nextStatus })
    .eq("id", args.reservationId)
    .select("id, status")
    .single();
  if (updateError) throw updateError;
  const updated = updatedData as { id: string; status: ReservationStatus };

  const { error: logError } = await (supabaseAdmin as any).from("activity_logs").insert({
    admin_id: args.adminId,
    action_type: "RESERVATION_STATUS_CHANGE",
    table_id: reservation.table_id,
    details: {
      reservation_id: args.reservationId,
      customer_id: reservation.customer_id,
      previous_status: currentStatus,
      next_status: args.nextStatus,
    },
  });
  if (logError) throw logError;

  return updated;
}

export async function markDueNoShowsAndLog(adminId: string, referenceTimeISO = new Date().toISOString()) {
  const supabaseAdmin = getSupabaseAdminClient();
  const threshold = new Date(referenceTimeISO);
  threshold.setMinutes(threshold.getMinutes() - 15);

  const { data: dueReservationsData, error: findError } = await (supabaseAdmin as any)
    .from("reservations")
    .select("id, table_id, customer_id, start_time, status")
    .eq("status", "CONFIRMED")
    .lt("start_time", threshold.toISOString());
  if (findError) throw findError;
  const dueReservations = (dueReservationsData ?? []) as DueReservationRow[];

  if (dueReservations.length === 0) return 0;

  const ids = dueReservations.map((item) => item.id);
  const { error: updateError } = await (supabaseAdmin as any).from("reservations").update({ status: "NO_SHOW" }).in("id", ids);
  if (updateError) throw updateError;

  const logs = dueReservations.map((item) => ({
    admin_id: adminId,
    action_type: "AUTO_NO_SHOW" as const,
    table_id: item.table_id,
    details: {
      reservation_id: item.id,
      customer_id: item.customer_id,
      previous_status: item.status,
      next_status: "NO_SHOW",
      grace_period_minutes: 15,
    },
  }));

  const { error: logError } = await (supabaseAdmin as any).from("activity_logs").insert(logs);
  if (logError) throw logError;

  return ids.length;
}
