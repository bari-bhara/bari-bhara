import { z } from "zod";
import { PAYMENT_METHODS, recordPaymentSchema } from "@/features/charges/schema";
import { optionalText } from "@/lib/zod-fields";
import type { PaymentMethod } from "@/types/domain";

/** A tenant's "I've already paid" claim: the same details a landlord records, plus a note. */
export const claimSchema = recordPaymentSchema.extend({
  method: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]], "Choose how you paid."),
  note: optionalText(500),
});
export type ClaimFormValues = z.input<typeof claimSchema>;
export type ClaimInput = z.output<typeof claimSchema>;

export const rejectSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "Tell the tenant why, so they can sort it out.")
    .max(500, "Use 500 characters or fewer."),
});
export type RejectInput = z.infer<typeof rejectSchema>;
