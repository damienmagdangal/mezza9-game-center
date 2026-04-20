import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { extractRequestIp, isRateLimited, verifyCsrfFromForm } from "@/lib/admin-security";
import { getAdminPath } from "@/lib/admin-path";

type TableStatus = Database["public"]["Tables"]["tables"]["Row"]["status"];
const allowedStatuses = new Set<TableStatus>(["AVAILABLE", "RESERVED", "IN_USE", "MAINTENANCE"]);

function isTableStatus(value: string): value is TableStatus {
  return allowedStatuses.has(value as TableStatus);
}

export async function POST(request: Request) {
  const ip = extractRequestIp(request);
  if (isRateLimited(`table-status:${ip}`)) {
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

  const formData = await request.formData();
  if (!verifyCsrfFromForm(request, formData)) {
    return NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 });
  }

  const tableId = String(formData.get("tableId") ?? "");
  const statusRaw = String(formData.get("status") ?? "");

  if (!tableId || !isTableStatus(statusRaw)) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const status: TableStatus = statusRaw;

  const { error } = await (supabaseAdmin as any).from("tables").update({ status }).eq("id", tableId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: logError } = await (supabaseAdmin as any).from("activity_logs").insert({
    admin_id: user.id,
    action_type: "MANUAL_OVERRIDE",
    table_id: tableId,
    details: {
      updated_table_status: status,
      source: "admin_override",
    },
  });
  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL(getAdminPath(), request.url));
}
