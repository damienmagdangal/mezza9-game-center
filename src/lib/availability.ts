import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type AvailabilityArgs = {
  tableId: string;
  startTimeISO: string;
  endTimeISO: string;
};

type TableStatus = Database["public"]["Tables"]["tables"]["Row"]["status"];
type AvailabilityTableRow = { id: string; status: TableStatus };

export async function checkTableAvailability({ tableId, startTimeISO, endTimeISO }: AvailabilityArgs) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data: tableData, error: tableError } = await (supabaseAdmin as any)
    .from("tables")
    .select("id, status")
    .eq("id", tableId)
    .single();
  const table = tableData as AvailabilityTableRow | null;

  if (tableError) throw tableError;
  if (!table || table.status !== "AVAILABLE") {
    return { isAvailable: false, reason: "Table is not available right now." };
  }

  const { data, error } = await (supabaseAdmin as any)
    .from("reservations")
    .select("id")
    .eq("table_id", tableId)
    .in("status", ["PENDING", "CONFIRMED", "CHECKED_IN"])
    .lt("start_time", endTimeISO)
    .gt("end_time", startTimeISO)
    .limit(1);

  if (error) throw error;

  if ((data ?? []).length > 0) {
    return { isAvailable: false, reason: "Time slot already booked." };
  }

  return { isAvailable: true, reason: "Available" };
}
