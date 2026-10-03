import { z } from "zod";

export const joinSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Enter the code from your landlord.")
    .max(20, "That code is too long. Codes have 10 characters, like ABCDE-12345."),
});
export type JoinInput = z.infer<typeof joinSchema>;
