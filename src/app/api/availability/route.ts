import { NextResponse } from "next/server";
import { checkTableAvailability } from "@/lib/availability";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get("tableId") ?? "";
    const startTimeISO = searchParams.get("startTimeISO") ?? "";
    const endTimeISO = searchParams.get("endTimeISO") ?? "";

    if (!tableId || !startTimeISO || !endTimeISO) {
      return NextResponse.json({ error: "Missing required query parameters." }, { status: 400 });
    }

    const availability = await checkTableAvailability({ tableId, startTimeISO, endTimeISO });
    return NextResponse.json(availability);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check availability." },
      { status: 500 },
    );
  }
}
