import { z } from "zod";
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

export const billSchema = z.object({
  tenancyId: z.string().min(1, "Choose who to bill.").pipe(id),
  chargeTypeId: z.string().min(1, "Choose a bill type.").pipe(id),
  billingMonth: z.string().regex(MONTH_PATTERN, "Choose the month this bill is for."),
  amount: positiveMoney,
  dueDate: isoDate("Enter the due date."),
  description: optionalText(200),
});
export type BillFormValues = z.input<typeof billSchema>;
export type BillInput = z.output<typeof billSchema>;
