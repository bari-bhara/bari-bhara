import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { NoticeForm } from "@/features/notices/components/notice-form";
import { listTargets } from "@/features/notices/queries";
import { getCurrentOrganization } from "@/lib/dal";

export const metadata: Metadata = { title: "New notice" };

export default async function NewNoticePage() {
  const [targets, organization] = await Promise.all([listTargets(), getCurrentOrganization()]);
  return (
    <>
      <PageHeader
        title="New notice"
        description="Tenants see it in their Notices inbox while it's live."
        back={{ href: "/notices", label: "Notices" }}
      />
      <NoticeForm targets={targets} timeZone={organization?.timezone ?? "Asia/Dhaka"} />
    </>
  );
}
