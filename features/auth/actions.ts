"use server";

import { redirect } from "next/navigation";
import {
  GENERIC_ERROR,
  fail,
  invalid,
  ok,
  type ActionResult,
} from "@/lib/action-result";
import { verifySession } from "@/lib/dal";
import { homeForRole, postLoginPath } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import {
  forgotPasswordSchema,
  loginSchema,
  signupSchema,
  updatePasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type SignupInput,
  type UpdatePasswordInput,
} from "./schema";

export async function login(
  input: LoginInput,
  next?: string,
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "invalid_credentials") {
      return fail("Incorrect email or password.");
    }
    if (error.code === "email_not_confirmed") {
      return fail("Please confirm your email address first. Check your inbox.");
    }
    console.error("Login failed", error);
    return fail(GENERIC_ERROR);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    console.error("Profile missing after login", profileError);
    await supabase.auth.signOut();
    return fail(GENERIC_ERROR);
  }

  redirect(postLoginPath(profile.role, next));
}

export async function signup(input: SignupInput): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const { role, fullName, organizationName, email, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=${homeForRole(role)}`,
      // Read once by the on_auth_user_created trigger; never used for authorization.
      data: {
        role,
        full_name: fullName,
        organization_name: role === "landlord" ? organizationName : "",
      },
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return fail("An account with this email already exists. Try logging in.");
    }
    if (error.code === "weak_password") {
      return fail("Please choose a stronger password.");
    }
    console.error("Signup failed", error);
    return fail(GENERIC_ERROR);
  }

  // No session means email confirmation is required.
  redirect(data.session ? homeForRole(role) : "/signup/check-email");
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${getSiteUrl()}/auth/confirm?next=/update-password` },
  );

  // Don't reveal whether the email has an account.
  if (error) console.error("Password reset request failed", error);
  return ok();
}

export async function updatePassword(
  input: UpdatePasswordInput,
): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const user = await verifySession();
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    if (error.code === "same_password") {
      return fail("Choose a password you haven't used before.");
    }
    if (error.code === "weak_password") {
      return fail("Please choose a stronger password.");
    }
    console.error("Password update failed", error);
    return fail(GENERIC_ERROR);
  }

  redirect(homeForRole(user.role));
}

export async function logout() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) console.error("Logout failed", error);
  redirect("/login");
}
