import { z } from "zod";
import { optionalPhone, requiredText } from "@/lib/zod-fields";

export const accountSchema = z.object({
  fullName: requiredText(120, "Enter your name."),
  phone: optionalPhone,
});
export type AccountInput = z.infer<typeof accountSchema>;

export const businessSchema = z.object({
  name: requiredText(120, "Enter your business name."),
});
export type BusinessInput = z.infer<typeof businessSchema>;
