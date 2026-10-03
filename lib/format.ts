/**
 * Display formatting for money and dates. Bangladesh uses lakh grouping
 * (15,00,000), which the en-IN locale provides; the UI is English for now.
 */

const LOCALE = "en-IN";
export const DEFAULT_TIME_ZONE = "Asia/Dhaka";

const moneyFormatters = new Map<string, Intl.NumberFormat>();

/** `formatMoney(15000, "BDT")` → "৳15,000". Shows paisa only when present. */
export function formatMoney(amount: number, currency = "BDT") {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    moneyFormatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

/** `formatDate("2026-10-03T…")` → "3 Oct 2026", in the organization's time zone. */
export function formatDate(value: string | Date, timeZone = DEFAULT_TIME_ZONE) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(typeof value === "string" ? new Date(value) : value);
}

/** 1 → "1st", 22 → "22nd". Used for rent due days. */
export function ordinal(n: number) {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** Today's date as "YYYY-MM-DD" in `timeZone`, for date inputs and comparisons. */
export function todayIn(timeZone = DEFAULT_TIME_ZONE) {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

/** Formats a plain "YYYY-MM-DD" date (no time zone shift). */
export function formatDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return formatDate(new Date(Date.UTC(year, month - 1, date)), "UTC");
}
