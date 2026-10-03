import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { JoinForm } from "@/features/tenant-portal/components/join-form";
import { getMyTenancies } from "@/features/tenant-portal/queries";

export const metadata: Metadata = { title: "Connect to your home" };

export default async function JoinPage() {
  const tenancies = await getMyTenancies();
  const linked = tenancies.length > 0;

  return (
    <>
      <PageHeader
        title="Connect to your home"
        description="Enter the invite code from your landlord to see your rent, payments and notices."
        back={linked ? { href: "/tenant/dashboard", label: "Dashboard" } : undefined}
      />
      <Card className="max-w-lg">
        <CardContent className="grid gap-4 pt-6">
          {linked && (
            <p className="text-sm text-muted-foreground">
              You&apos;re already connected. Renting from another landlord too? Enter their code
              below, or{" "}
              <Link href="/tenant/dashboard" className="font-medium text-foreground underline underline-offset-4">
                go to your dashboard
              </Link>
              .
            </p>
          )}
          <JoinForm />
        </CardContent>
      </Card>
    </>
  );
}
