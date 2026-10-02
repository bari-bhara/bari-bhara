import type { Metadata } from "next";
import { DetailList } from "@/components/app/detail-list";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentOrganization, requireRole } from "@/lib/dal";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [user, organization] = await Promise.all([
    requireRole("landlord"),
    getCurrentOrganization(),
  ]);

  return (
    <>
      <PageHeader title="Settings" description="Your account and business details." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: "Name", value: user.fullName || "—" },
                { label: "Email", value: user.email },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Business</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailList
              items={[
                { label: "Name", value: organization?.name ?? "—" },
                { label: "Currency", value: organization?.currency ?? "—" },
                { label: "Time zone", value: organization?.timezone ?? "—" },
              ]}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
