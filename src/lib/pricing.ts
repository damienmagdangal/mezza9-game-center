const WEB_DISCOUNT_RATE = 0.1;

export function computeHours(startISO: string, endISO: string): number {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  const diffHours = (end - start) / (1000 * 60 * 60);

  if (diffHours <= 0) throw new Error("End time must be later than start time.");
  return Number(diffHours.toFixed(2));
}

export function computeWebDiscountedPrice(baseRatePerHour: number, hours: number) {
  const original = baseRatePerHour * hours;
  const discounted = original * (1 - WEB_DISCOUNT_RATE);

  return {
    originalPrice: Number(original.toFixed(2)),
    discountedPrice: Number(discounted.toFixed(2)),
  };
}

export function formatPHP(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value);
}
