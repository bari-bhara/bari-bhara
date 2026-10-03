import type { Metadata } from "next";
import { AuthCard } from "@/components/app/auth-card";
import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";

export const metadata: Metadata = { title: "Set new password" };

// Requires a session (the reset link signs the user in); proxy.ts enforces it
// and the updatePassword action re-verifies.
export default function UpdatePasswordPage() {
  return (
    <AuthCard title="Set a new password">
      <UpdatePasswordForm />
    </AuthCard>
  );
}
