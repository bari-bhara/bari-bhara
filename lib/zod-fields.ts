import { z } from "zod";

/**
 * Reusable form fields. Form inputs hold strings; these parse them into the
 * values the database expects, so `z.input` is what a form edits and
 * `z.output` is what an action writes.
 */

export const requiredText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(max, `Use ${max} characters or fewer.`);

export const optionalText = (max: number) =>
  z.string().trim().max(max, `Use ${max} characters or fewer.`);

/** A whole number typed into a text input, e.g. "5" → 5. */
export const wholeNumber = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, message)
    .transform(Number)
    .pipe(z.number().min(min, message).max(max, message));

/** Like wholeNumber, but "" → null. */
export const optionalWholeNumber = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(/^\d*$/, message)
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number().min(min, message).max(max, message).nullable());

/** A non-negative amount with at most 2 decimals, fitting numeric(12,2). */
export const money = (message = "Enter an amount like 15000 or 15000.50.") =>
  z
    .string()
    .trim()
    .regex(/^\d{1,10}(\.\d{1,2})?$/, message)
    .transform(Number);

/**
 * Any Postgres uuid. z.uuid() also checks RFC 9562 version bits, which
 * rejects valid ids such as the fixed ones in seed.sql.
 */
export const id = z.guid("Invalid id.");

/** A "YYYY-MM-DD" date from <input type="date">. */
export const isoDate = (message = "Enter a valid date.") =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), message);

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Use 254 characters or fewer.")
  .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address.");

export const optionalPhone = z
  .string()
  .trim()
  .max(30, "Use 30 characters or fewer.")
  .regex(/^(\+?[\d\s-]{6,})?$/, "Enter a phone number like +8801711000000.");
