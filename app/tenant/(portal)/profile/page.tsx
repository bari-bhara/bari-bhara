import type { Metadata } from "next";
import { DetailList } from "@/components/app/detail-list";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/dal";

export const metadata: Metadata = { title: "Profile" };

export default async function TenantProfilePage() {
  const user = await requireRole("tenant");

  return (
    <>
      <PageHeader title="Profile" description="Your account details." />
      <Card className="max-w-2xl">
        <CardContent className="pt-2">
          <DetailList
            items={[
              { label: "Name", value: user.fullName || "—" },
              { label: "Email", value: user.email },
            ]}
          />
        </CardContent>
      </Card>
    </>
  );
}
