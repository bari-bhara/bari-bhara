import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/app/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthCard title="Welcome back" description="Log in to manage your rentals.">
      {/* LoginForm reads ?next= from the URL, which is request-time data. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
