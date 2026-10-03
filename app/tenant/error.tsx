"use client";

import { ErrorMessage } from "@/components/app/error-message";
import { DashboardLink } from "@/components/app/section-link";

/** Errors in tenant pages. The shell (navigation) stays usable. */
export default function TenantError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorMessage error={error} retry={retry}>
      <DashboardLink variant="tenant" secondary />
    </ErrorMessage>
  );
}
