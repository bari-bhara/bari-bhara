import { z } from "zod";
import { optionalText, requiredText, wholeNumber } from "@/lib/zod-fields";

export const propertySchema = z.object({
  name: requiredText(120, "Enter a property name."),
  address: optionalText(300),
  city: optionalText(80),
  rentDueDay: wholeNumber(1, 28, "Choose a day between 1 and 28."),
  notes: optionalText(1000),
});
/** What the form edits (strings). */
export type PropertyFormValues = z.input<typeof propertySchema>;
/** What the action writes. */
export type PropertyInput = z.output<typeof propertySchema>;

export const EMPTY_PROPERTY: PropertyFormValues = {
  name: "",
  address: "",
  city: "",
  rentDueDay: "5",
  notes: "",
};
