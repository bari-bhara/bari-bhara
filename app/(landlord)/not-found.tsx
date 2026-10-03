import { SearchX } from "lucide-react";
import { Suspense } from "react";
import { DashboardLink, SectionLink } from "@/components/app/section-link";
import { StatusMessage } from "@/components/app/status-message";

/** notFound() from a landlord page: a missing record, or one from another account. */
export default function LandlordNotFound() {
  return (
    <StatusMessage
      icon={SearchX}
      title="Page not found"
      description="This page doesn't exist, or you don't have access to it."
    >
      <Suspense fallback={<DashboardLink variant="landlord" />}>
        <SectionLink variant="landlord" />
      </Suspense>
    </StatusMessage>
  );
}
