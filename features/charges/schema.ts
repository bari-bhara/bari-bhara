import { z } from "zod";
import { formatMoney } from "@/lib/format";
import { id, isoDate, money, optionalText } from "@/lib/zod-fields";
import type { EffectiveStatus, PaymentMethod } from "@/types/domain";

export const EFFECTIVE_STATUS_LABELS: Record<EffectiveStatus, string> = {
  unpaid: "Unpaid",
  partially_paid: "Partly paid",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

/** Status filters offered on the rent and bills lists, in display order. */
export const CHARGE_FILTER_STATUSES = ["overdue", "unpaid", "partially_paid", "paid"] as const;
export type ChargeFilterStatus = (typeof CHARGE_FILTER_STATUSES)[number];

export function isChargeFilterStatus(value: unknown): value is ChargeFilterStatus {
  return typeof value === "string" && (CHARGE_FILTER_STATUSES as readonly string[]).includes(value);
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  bkash: "bKash",
  nagad: "Nagad",
  card: "Card",
  other: "Other",
};

export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && (PAYMENT_METHODS as string[]).includes(value);
}

/** "YYYY-MM" from <input type="month"> or the URL. */
export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: unknown): value is string {
  return typeof value === "string" && MONTH_PATTERN.test(value);
}

const positiveMoney = money().refine((value) => value > 0, "Enter an amount above zero.");

export const recordPaymentSchema = z.object({
  amount: positiveMoney,
  paidOn: isoDate("Enter the date it was paid."),
  method: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]], "Choose how it was paid."),
  reference: optionalText(100),
});
export type RecordPaymentFormValues = z.input<typeof recordPaymentSchema>;
export type RecordPaymentInput = z.output<typeof recordPaymentSchema>;

export const voidSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Say why, so the history makes sense later.")
    .max(200, "Use 200 characters or fewer."),
});
export type VoidInput = z.infer<typeof voidSchema>;

/** "" → null; otherwise a non-negative number with up to `decimals` places. */
const optionalReading = (decimals: number, message: string) =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^(\\d{1,10}(\\.\\d{1,${decimals}})?)?$`), message)
    .transform((value) => (value === "" ? null : Number(value)));

export const billSchema = z
  .object({
    tenancyId: z.string().min(1, "Choose who to bill.").pipe(id),
    chargeTypeId: z.string().min(1, "Choose a bill type.").pipe(id),
    billingMonth: z.string().regex(MONTH_PATTERN, "Choose the month this bill is for."),
    amount: positiveMoney,
    dueDate: isoDate("Enter the due date."),
    description: optionalText(200),
    // Metered bills (ADR 0010): all three or none; the amount is computed from them.
    meterPrevious: optionalReading(2, "Enter a reading like 10452."),
    meterCurrent: optionalReading(2, "Enter a reading like 10603."),
    unitRate: optionalReading(4, "Enter a rate like 8.5."),
  })
  .superRefine((bill, ctx) => {
    const readings = [bill.meterPrevious, bill.meterCurrent, bill.unitRate];
    if (readings.every((r) => r === null)) return;
    if (bill.meterPrevious === null) {
      ctx.addIssue({ code: "custom", path: ["meterPrevious"], message: "Enter the previous reading." });
    }
    if (bill.meterCurrent === null) {
      ctx.addIssue({ code: "custom", path: ["meterCurrent"], message: "Enter the current reading." });
    }
    if (bill.unitRate === null) {
      ctx.addIssue({ code: "custom", path: ["unitRate"], message: "Enter the rate per unit." });
    }
    if (bill.meterPrevious !== null && bill.meterCurrent !== null && bill.meterCurrent < bill.meterPrevious) {
      ctx.addIssue({
        code: "custom",
        path: ["meterCurrent"],
        message: "The current reading can't be below the previous one.",
      });
    }
  });

/** "10452 → 10603: 151 units × ৳8.50", or "" for a bill without readings. */
export function meterSummary(
  charge: { meter_previous: number | null; meter_current: number | null; unit_rate: number | null },
  currency: string,
) {
  if (charge.meter_previous === null || charge.meter_current === null || charge.unit_rate === null) return "";
  const used = Math.round((charge.meter_current - charge.meter_previous) * 100) / 100;
  return `${charge.meter_previous} → ${charge.meter_current}: ${used} units × ${formatMoney(charge.unit_rate, currency)}`;
}

/** The amount for a metered bill: units used × rate, to the paisa. */
export function meteredAmount(previous: number, current: number, rate: number) {
  return Math.round((current - previous) * rate * 100) / 100;
}
export type BillFormValues = z.input<typeof billSchema>;
export type BillInput = z.output<typeof billSchema>;
