import { z } from "zod";

const email = z.email("Enter a valid email address.").trim().toLowerCase();

// bcrypt (used by Supabase Auth) ignores bytes past 72.
const newPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use 72 characters or fewer.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    role: z.enum(["landlord", "tenant"], "Choose how you'll use Bari_bhara."),
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(120, "Use 120 characters or fewer."),
    organizationName: z.string().trim().max(120, "Use 120 characters or fewer."),
    email,
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const updatePasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
