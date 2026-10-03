import type { Metadata } from "next";
import { AuthCard } from "@/components/app/auth-card";
import { SignupForm } from "@/features/auth/components/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthCard title="Create your account" description="It only takes a minute.">
      <SignupForm />
    </AuthCard>
  );
}
