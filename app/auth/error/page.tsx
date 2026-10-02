import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/app/auth-card";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Link problem" };

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-svh flex-col items-center bg-muted/40 px-4 py-10 sm:justify-center">
      <Logo className="mb-8 text-lg" />
      <div className="w-full max-w-md">
        <AuthCard title="This link didn't work">
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              The link may have expired or already been used. Request a new one
              and try again.
            </p>
            <Button asChild className="h-11">
              <Link href="/login">Go to log in</Link>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <Link href="/forgot-password">Reset password</Link>
            </Button>
          </div>
        </AuthCard>
      </div>
    </main>
  );
}
