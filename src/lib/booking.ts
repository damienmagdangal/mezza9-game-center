import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeHours, computeWebDiscountedPrice } from "@/lib/pricing";
import type { Database } from "@/types/database";

type ReservationInsert = Database["public"]["Tables"]["reservations"]["Insert"];
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type TableRow = Database["public"]["Tables"]["tables"]["Row"];
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

export type BookingRequest = {
  fullName: string;
  phone: string;
  email: string;
  tableId: string;
  startTimeISO: string;
  endTimeISO: string;
  agreedToTerms: boolean;
};

function assertBookingPayload(input: BookingRequest) {
  if (!input.fullName.trim()) throw new Error("Full name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error("Invalid email format.");
  if (!/^\+?[0-9]{10,15}$/.test(input.phone.replace(/\s|-/g, ""))) throw new Error("Invalid phone format.");
  if (!input.agreedToTerms) throw new Error("You must agree to the terms and conditions.");
}

function assertBusinessHoursAndDuration(startTimeISO: string, endTimeISO: string) {
  const hours = computeHours(startTimeISO, endTimeISO);
  if (hours > 8) {
    throw new Error("Maximum reservation length is 8 hours.");
  }

  const startManila = new Date(new Date(startTimeISO).getTime() + MANILA_OFFSET_MS);
  const endManila = new Date(new Date(endTimeISO).getTime() + MANILA_OFFSET_MS);

  const startHour = startManila.getUTCHours();
  if (startHour < 15 || startHour > 23) {
    throw new Error("Reservation start time must be between 3:00 PM and 11:59 PM (PHT).");
  }

  const cutoff = new Date(startManila);
  cutoff.setUTCDate(cutoff.getUTCDate() + 1);
  cutoff.setUTCHours(1, 0, 0, 0);
  if (endManila > cutoff) {
    throw new Error("Reservation must end by 1:00 AM (PHT).");
  }
}

async function getExistingCustomer(email: string, phone: string): Promise<CustomerRow | null> {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await (supabaseAdmin as any)
    .from("customers")
    .select("*")
    .or(`email.eq.${email},phone.eq.${phone}`)
    .maybeSingle();

  if (error) throw error;
  return (data as CustomerRow | null) ?? null;
}

async function createCustomer(input: Pick<BookingRequest, "fullName" | "email" | "phone">) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await (supabaseAdmin as any)
    .from("customers")
    .insert({
      full_name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      type: "REGULAR",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as CustomerRow;
}

async function getTable(tableId: string): Promise<TableRow> {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await (supabaseAdmin as any).from("tables").select("*").eq("id", tableId).single();
  if (error) throw error;
  return data as TableRow;
}

async function assertNoOverlappingReservation(tableId: string, startTimeISO: string, endTimeISO: string) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await (supabaseAdmin as any)
    .from("reservations")
    .select("id, start_time, end_time, status")
    .eq("table_id", tableId)
    .in("status", ["PENDING", "CONFIRMED", "CHECKED_IN"])
    .lt("start_time", endTimeISO)
    .gt("end_time", startTimeISO)
    .limit(1);

  if (error) throw error;
  if ((data ?? []).length > 0) {
    throw new Error("Selected schedule is no longer available for this table.");
  }
}

export async function createReservationWithCustomerLookup(input: BookingRequest) {
  const supabaseAdmin = getSupabaseAdminClient();
  assertBookingPayload(input);
  assertBusinessHoursAndDuration(input.startTimeISO, input.endTimeISO);

  const table = await getTable(input.tableId);
  if (table.status !== "AVAILABLE") {
    throw new Error("This table is currently unavailable.");
  }

  await assertNoOverlappingReservation(input.tableId, input.startTimeISO, input.endTimeISO);

  const hours = computeHours(input.startTimeISO, input.endTimeISO);
  const { originalPrice, discountedPrice } = computeWebDiscountedPrice(table.base_price_per_hour, hours);

  let customer = await getExistingCustomer(input.email.trim().toLowerCase(), input.phone.trim());
  if (!customer) {
    customer = await createCustomer(input);
  }

  const payload: ReservationInsert = {
    table_id: input.tableId,
    customer_id: customer.id,
    start_time: input.startTimeISO,
    end_time: input.endTimeISO,
    total_price: discountedPrice,
    is_web_booking: true,
    status: "CONFIRMED",
    agreed_to_terms: input.agreedToTerms,
  };

  const { data: reservation, error } = await (supabaseAdmin as any)
    .from("reservations")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;

  return {
    customer,
    reservation,
    pricing: {
      baseRatePerHour: table.base_price_per_hour,
      hours,
      originalPrice,
      discountedPrice,
    },
  };
}
