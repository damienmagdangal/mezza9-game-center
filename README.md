# Mezza9.ph Billiards Management & Reservation System

## Supabase Setup

1. Create a new Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Run `supabase/step2_security_and_integrity.sql`.
4. Run `supabase/step4_status_timeline_and_logs.sql`.
5. Copy `.env.example` to `.env.local` and fill in values from Supabase API settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`

## Project Folder Structure

```text
mezza9-ph/
  supabase/
    schema.sql
    step2_security_and_integrity.sql
    step4_status_timeline_and_logs.sql
  src/
    app/
      admin/page.tsx
      login/page.tsx
      api/
        availability/route.ts
        admin/table-status/route.ts
        admin/export/route.ts
        admin/reservation-status/route.ts
        reservations/route.ts
      terms/page.tsx
      globals.css
      layout.tsx
      page.tsx
    components/
      admin-logout-button.tsx
      booking-form.tsx
    lib/
      availability.ts
      admin-reservations.ts
      booking.ts
      pricing.ts
      supabase/
        admin.ts
        client.ts
        server.ts
    types/
      database.ts
  .env.example
  package.json
  tailwind.config.ts
  tsconfig.json
```

## Notes

- Booking flow reuses existing customer by `email` or `phone` before reservation insert.
- Booking flow blocks overlapping active reservations for the same table.
- Booking UI performs live table-slot availability checks before submission.
- Web discount formula: `(base_rate * hours) * 0.9`.
- `/admin` is role-guarded via `user_metadata.role === "admin"`.
- Admin dashboard supports date/type filters and CSV export endpoint.
- Admin dashboard includes a timeline view and reservation lifecycle controls.
- Auto no-show is enforced after 15 minutes and written to `activity_logs`.
- `activity_logs` now captures manual table overrides, reservation status changes, and auto no-show actions.
