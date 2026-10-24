import { HandCoins } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import {
  ChargesMonthView,
  type ChargesMonthParams,
} from "@/features/charges/components/charges-month-view";
import { GenerateRentButton } from "@/features/charges/components/generate-rent-button";
import { RemindOverdueButton } from "@/features/notifications/components/remind-overdue-button";
import { SectionTabs } from "@/features/charges/components/section-tabs";
import { isMonth } from "@/features/charges/schema";
import { getPendingClaimCount } from "@/features/claims/queries";
import { getCurrentOrganization } from "@/lib/dal";
import { formatMonth, todayIn } from "@/lib/format";

export const metadata: Metadata = { title: "Rent" };

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<ChargesMonthParams>;
}) {
  const [params, organization, claims] = await Promise.all([
    searchParams,
    getCurrentOrganization(),
    getPendingClaimCount(),
  ]);
  const month = isMonth(params.month) ? params.month : todayIn(organization?.timezone).slice(0, 7);
  const generate = (m: string) => <GenerateRentButton month={m} monthLabel={formatMonth(m)} />;

  return (
    <>
      <PageHeader
        title="Rent"
        description="Monthly rent for every current tenant."
        actions={
          <>
            <RemindOverdueButton />
            {generate(month)}
          </>
        }
      />
      <SectionTabs current="rent" />
      {claims > 0 && (
        <Link
          href="/rent/claims"
          className="mb-4 flex items-center gap-3 surface-interactive border-primary/40 p-4 text-sm font-medium"
        >
          <HandCoins className="h-5 w-5 shrink-0" aria-hidden />
          {claims === 1 ? "1 tenant says they've paid." : `${claims} tenants say they've paid.`} Review
        </Link>
      )}
      <ChargesMonthView category="rent" params={params} emptyAction={generate} />
    </>
  );
}
