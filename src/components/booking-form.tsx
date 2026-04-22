"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { computeWebDiscountedPrice, formatPHP } from "@/lib/pricing";
import { getTableDisplayLabel } from "@/lib/tables";

type LoungeTable = {
  id: string;
  table_number: number;
  model_name: string;
  base_price_per_hour: number;
  is_premium: boolean;
};

const MAX_HOURS = 8;
const CALENDAR_START_HOUR = 15;
const CALENDAR_END_HOUR = 23;
const TIME_SLOTS = Array.from({ length: 18 }, (_, idx) => {
  const hour = 15 + Math.floor(idx / 2);
  const minute = idx % 2 === 0 ? 0 : 30;
  const label = new Date(2020, 0, 1, hour, minute).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
  return {
    value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    label,
  };
});
const DATE_OPTIONS = Array.from({ length: 7 }, (_, idx) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + idx);
  const value = date.toISOString().split("T")[0];
  const label = date.toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return { value, label };
});

function getStartOfLocalDay(date: Date) {
  const localDay = new Date(date);
  localDay.setHours(0, 0, 0, 0);
  return localDay;
}

function buildWeekDays(anchorDate: Date) {
  const start = getStartOfLocalDay(anchorDate);
  return Array.from({ length: 7 }, (_, idx) => {
    const day = new Date(start);
    day.setDate(start.getDate() + idx);
    return day;
  });
}

type WeeklyReservation = {
  id: string;
  tableId: string;
  tableNumber: number;
  modelName: string;
  startTimeISO: string;
  endTimeISO: string;
  status: "PENDING" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
};

export function BookingForm({ tables }: { tables: LoungeTable[] }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedTableId, setSelectedTableId] = useState(tables[0]?.id ?? "");
  const [hours, setHours] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [availability, setAvailability] = useState<{ ok: boolean; text: string }>({
    ok: true,
    text: "Pick a reservation date and time to check availability.",
  });
  const [weeklyReservations, setWeeklyReservations] = useState<WeeklyReservation[]>([]);
  const [calendarError, setCalendarError] = useState("");
  const [calendarLoading, setCalendarLoading] = useState(false);

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) ?? tables[0],
    [selectedTableId, tables],
  );

  const phoneIsValid = /^\+?[0-9]{10,15}$/.test(phone.replace(/\s|-/g, ""));
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const fullNameIsValid = fullName.trim().length > 1;
  const hoursIsValid = Number.isInteger(hours) && hours >= 1 && hours <= MAX_HOURS;

  useEffect(() => {
    if (!selectedDate || !selectedTime) {
      setStartLocal("");
      return;
    }
    setStartLocal(`${selectedDate}T${selectedTime}`);
  }, [selectedDate, selectedTime]);

  function getBusinessRuleError() {
    if (!startLocal) return "Pick a reservation date and time to check availability.";
    if (!hoursIsValid) return `Reservation duration must be 1 to ${MAX_HOURS} hours only.`;

    const start = new Date(startLocal);
    if (Number.isNaN(start.getTime())) return "Invalid start time.";
    const startHour = start.getHours();
    if (startHour < 15 || startHour > 23) return "Start time must be between 3:00 PM and 11:59 PM.";

    const end = new Date(start);
    end.setHours(end.getHours() + hours);

    const cutoff = new Date(start);
    cutoff.setDate(cutoff.getDate() + 1);
    cutoff.setHours(1, 0, 0, 0);
    if (end > cutoff) return "Reservation must end on or before 1:00 AM.";

    return null;
  }

  const businessRuleError = getBusinessRuleError();
  const pricing = selectedTable ? computeWebDiscountedPrice(selectedTable.base_price_per_hour, hours) : null;
  const calendarAnchorDate = useMemo(() => {
    const parsed = startLocal ? new Date(startLocal) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [startLocal]);
  const calendarWeekDays = useMemo(() => buildWeekDays(calendarAnchorDate), [calendarAnchorDate]);
  const calendarHours = useMemo(
    () => Array.from({ length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 }, (_, idx) => idx + CALENDAR_START_HOUR),
    [],
  );
  const canSubmit =
    fullNameIsValid && phoneIsValid && emailIsValid && agreedToTerms && !businessRuleError && availability.ok && !loading;
  const canProceedToPlayerDetails = Boolean(startLocal) && availability.ok && !businessRuleError;

  useEffect(() => {
    async function checkAvailability() {
      if (!selectedTable) return;
      if (businessRuleError) {
        setAvailability({ ok: false, text: businessRuleError });
        return;
      }

      const start = new Date(startLocal);
      if (Number.isNaN(start.getTime())) return;
      const end = new Date(start);
      end.setHours(end.getHours() + hours);

      const params = new URLSearchParams({
        tableId: selectedTable.id,
        startTimeISO: start.toISOString(),
        endTimeISO: end.toISOString(),
      });

      const response = await fetch(`/api/availability?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        setAvailability({ ok: false, text: data.error ?? "Availability check failed." });
        return;
      }

      setAvailability({
        ok: Boolean(data.isAvailable),
        text: String(data.reason ?? (data.isAvailable ? "Available" : "Unavailable")),
      });
    }

    void checkAvailability();
  }, [selectedTable, startLocal, hours, businessRuleError]);

  useEffect(() => {
    async function fetchWeeklyReservations() {
      const weekStart = getStartOfLocalDay(calendarAnchorDate);
      const params = new URLSearchParams({
        weekStartISO: weekStart.toISOString(),
      });

      setCalendarLoading(true);
      setCalendarError("");
      const response = await fetch(`/api/availability/week?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        setWeeklyReservations([]);
        setCalendarError(String(data.error ?? "Unable to load weekly reservation timeline."));
        setCalendarLoading(false);
        return;
      }

      setWeeklyReservations(Array.isArray(data.reservations) ? (data.reservations as WeeklyReservation[]) : []);
      setCalendarLoading(false);
    }

    void fetchWeeklyReservations();
  }, [calendarAnchorDate]);

  const calendarReservationsByCell = useMemo(() => {
    const parsed = weeklyReservations.map((item) => ({
      ...item,
      start: new Date(item.startTimeISO),
      end: new Date(item.endTimeISO),
    }));

    return new Map(
      calendarWeekDays.flatMap((day) =>
        calendarHours.map((hour) => {
          const slotStart = new Date(day);
          slotStart.setHours(hour, 0, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setHours(slotEnd.getHours() + 1);

          const key = `${day.toISOString()}-${hour}`;
          const overlaps = parsed.filter((reservation) => reservation.start < slotEnd && reservation.end > slotStart);
          return [key, overlaps] as const;
        }),
      ),
    );
  }, [weeklyReservations, calendarWeekDays, calendarHours]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!canSubmit || !selectedTable) {
      return;
    }

    setLoading(true);
    setMessage("");

    const start = new Date(startLocal);
    const end = new Date(start);
    end.setHours(end.getHours() + hours);

    const payload = {
      fullName,
      phone,
      email,
      tableId: selectedTable.id,
      startTimeISO: start.toISOString(),
      endTimeISO: end.toISOString(),
      agreedToTerms,
    };

    const params = new URLSearchParams({
      tableId: String(payload.tableId),
      startTimeISO: payload.startTimeISO,
      endTimeISO: payload.endTimeISO,
    });
    const availabilityResponse = await fetch(`/api/availability?${params.toString()}`);
    const availabilityData = await availabilityResponse.json();
    if (!availabilityResponse.ok || !availabilityData.isAvailable) {
      setMessage(availabilityData.reason ?? availabilityData.error ?? "Selected slot is unavailable.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Reservation failed.");
      setLoading(false);
      return;
    }

    setMessage("Reservation confirmed. We will contact you shortly.");
    setLoading(false);
    setFullName("");
    setPhone("");
    setEmail("");
    setAgreedToTerms(false);
    setSelectedDate("");
    setSelectedTime("");
    setStartLocal("");
    setHours(1);
    setAvailability({ ok: true, text: "Pick a reservation date and time to check availability." });
    form.reset();
  }

  if (!selectedTable) return null;

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-cyan-500/20 bg-zinc-900/70 p-4 shadow-[0_0_30px_rgba(0,255,255,0.05)]">
      <h2 className="text-lg font-semibold text-cyan-300">Book Your Table</h2>
      <p className="text-xs text-zinc-400">Choose your schedule first, then enter your reservation details.</p>

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-700 bg-zinc-950/60 p-2 text-xs">
        <div className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2 py-2 text-center text-cyan-200">
          1) Schedule
        </div>
        <div
          className={`rounded-lg px-2 py-2 text-center ${
            canProceedToPlayerDetails
              ? "border border-lime-400/40 bg-lime-500/10 text-lime-200"
              : "border border-zinc-700 bg-zinc-900 text-zinc-400"
          }`}
        >
          2) Guest Details
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-cyan-500/20 bg-zinc-950/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Step 1 - Check Table Availability</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <select
            required
            name="tableId"
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
            value={selectedTableId}
            onChange={(event) => setSelectedTableId(event.target.value)}
          >
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                {getTableDisplayLabel(table)}
              </option>
            ))}
          </select>
          <select
            required
            name="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          >
            <option value="">Select reservation date</option>
            {DATE_OPTIONS.map((dateOption) => (
              <option key={dateOption.value} value={dateOption.value}>
                {dateOption.label}
              </option>
            ))}
          </select>
          <select
            required
            name="time"
            value={selectedTime}
            onChange={(event) => setSelectedTime(event.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          >
            <option value="">Select start time</option>
            {TIME_SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
          <select
            name="hours"
            value={hours}
            onChange={(event) => setHours(Number(event.target.value))}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          >
            {Array.from({ length: MAX_HOURS }, (_, idx) => idx + 1).map((h) => (
              <option key={h} value={h}>
                {h} hour{h > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-zinc-400">Business hours: 3:00 PM - 1:00 AM | Max reservation: {MAX_HOURS} hours</p>
      </div>

      <div className="space-y-1 text-xs">
        {!hoursIsValid ? <p className="text-red-300">Maximum reservation time is {MAX_HOURS} hours.</p> : null}
        {businessRuleError && startLocal ? <p className="text-red-300">{businessRuleError}</p> : null}
      </div>

      <p className={`text-xs ${availability.ok ? "text-lime-300" : "text-red-300"}`}>Availability: {availability.text}</p>

      <div className="space-y-2 rounded-lg border border-zinc-700 bg-zinc-950/70 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Weekly Reservation Calendar (7 days)</p>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-8 gap-1 text-[11px]">
              <div className="rounded bg-zinc-900 px-2 py-1 text-zinc-400">Time</div>
              {calendarWeekDays.map((day) => (
                <div key={day.toISOString()} className="rounded bg-zinc-900 px-2 py-1 text-center text-zinc-300">
                  {day.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })}
                </div>
              ))}
            </div>
            <div className="mt-1 space-y-1">
              {calendarHours.map((hour) => (
                <div key={`hour-row-${hour}`} className="grid grid-cols-8 gap-1">
                  <div className="rounded bg-zinc-900/80 px-2 py-2 text-[11px] text-zinc-400">
                    {String(hour).padStart(2, "0")}:00
                  </div>
                  {calendarWeekDays.map((day) => {
                    const key = `${day.toISOString()}-${hour}`;
                    const overlaps = (calendarReservationsByCell.get(key) ?? []).filter((item) => item.tableId === selectedTableId);
                    return (
                      <div key={key} className="min-h-10 rounded border border-zinc-800 bg-zinc-900/60 p-1">
                        {overlaps.length === 0 ? (
                          <p className="text-center text-[10px] text-zinc-600">-</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {overlaps.map((reservation) => (
                              <span
                                key={reservation.id}
                                className="rounded bg-red-500/80 px-1.5 py-0.5 text-[10px] text-white"
                                title={`${new Date(reservation.startTimeISO).toLocaleTimeString("en-PH", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                })} - ${new Date(reservation.endTimeISO).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}`}
                              >
                                Reserved
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        {calendarLoading ? <p className="text-xs text-zinc-400">Loading weekly reservations...</p> : null}
        {calendarError ? <p className="text-xs text-red-300">{calendarError}</p> : null}
      </div>

      {canProceedToPlayerDetails ? (
        <div className="space-y-3 rounded-xl border border-lime-500/30 bg-lime-500/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-lime-300">Step 2 - Guest Details</p>
          <input
            required
            name="fullName"
            placeholder="Guest Full Name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          />
          <input
            required
            name="phone"
            placeholder="Mobile Number"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          />
          <input
            required
            type="email"
            name="email"
            placeholder="Email Address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
          />
          <div className="space-y-1 text-xs">
            {!phoneIsValid && phone ? <p className="text-red-300">Enter a valid mobile number (10-15 digits).</p> : null}
            {!emailIsValid && email ? <p className="text-red-300">Enter a valid email address.</p> : null}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-400">
          Reservation details will appear once your selected schedule is available.
        </div>
      )}

      <label className="flex items-start gap-2 text-xs text-zinc-300">
        <input
          required
          name="agreedToTerms"
          type="checkbox"
          checked={agreedToTerms}
          onChange={(event) => setAgreedToTerms(event.target.checked)}
          className="mt-0.5"
        />
        <span>I agree to the 15-minute grace period and forfeiture rule. I also accept the equipment care policy under the terms.</span>
      </label>

      <div className="rounded-lg border border-cyan-500/20 bg-zinc-800/70 p-3 text-sm">
        <p className="text-zinc-300">
          Original: <span className="line-through">{formatPHP(pricing?.originalPrice ?? 0)}</span>
        </p>
        <p className="font-semibold text-lime-300">Web Price (10% off): {formatPHP(pricing?.discountedPrice ?? 0)}</p>
      </div>

      <button
        disabled={!canSubmit}
        className="w-full rounded-md bg-cyan-400 px-3 py-2 font-semibold text-black disabled:opacity-60"
        type="submit"
      >
        {loading ? "Processing..." : "Confirm Booking"}
      </button>

      {message ? <p className="text-sm text-lime-300">{message}</p> : null}
    </form>
  );
}
