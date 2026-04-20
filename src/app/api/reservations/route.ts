import { NextResponse } from "next/server";
import { createReservationWithCustomerLookup } from "@/lib/booking";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await createReservationWithCustomerLookup({
      fullName: body.fullName,
      phone: body.phone,
      email: body.email,
      tableId: body.tableId,
      startTimeISO: body.startTimeISO,
      endTimeISO: body.endTimeISO,
      agreedToTerms: body.agreedToTerms,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create reservation.",
      },
      { status: 400 },
    );
  }
}
