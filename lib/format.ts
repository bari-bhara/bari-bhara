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

/** "2026-10" or "2026-10-01" → "October 2026". */
export function formatMonth(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, m - 1, 1)),
  );
}

/** "2026-10" moved by `delta` months, e.g. shiftMonth("2026-01", -1) → "2025-12". */
export function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** "3 Oct 2026, 9:30 am" in the organization's time zone. */
export function formatDateTime(value: string | Date, timeZone = DEFAULT_TIME_ZONE) {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(typeof value === "string" ? new Date(value) : value);
}

/** Minutes `timeZone` is ahead of UTC at `date`. */
function zoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/**
 * A <input type="datetime-local"> value ("2026-10-05T09:00"), read as wall-clock
 * time in `timeZone`, to an ISO instant. Second pass handles DST edges.
 */
export function zonedDateTimeToIso(local: string, timeZone = DEFAULT_TIME_ZONE) {
  const naiveUtc = new Date(`${local}:00Z`).getTime();
  let instant = naiveUtc - zoneOffsetMinutes(new Date(naiveUtc), timeZone) * 60_000;
  instant = naiveUtc - zoneOffsetMinutes(new Date(instant), timeZone) * 60_000;
  return new Date(instant).toISOString();
}
