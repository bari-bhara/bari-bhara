import { MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/app/auth-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage() {
  return (
    <AuthCard title="Check your email">
      <div className="grid gap-4 text-center">
        <MailCheck className="mx-auto h-10 w-10 text-primary" aria-hidden />
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent you a confirmation link. Open it to activate your
          account, then log in.
        </p>
        <Button asChild variant="outline" className="h-11">
          <Link href="/login">Go to log in</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
