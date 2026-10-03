import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import {
  ChargesMonthView,
  type ChargesMonthParams,
} from "@/features/charges/components/charges-month-view";
import { GenerateRentButton } from "@/features/charges/components/generate-rent-button";
import { SectionTabs } from "@/features/charges/components/section-tabs";
import { isMonth } from "@/features/charges/schema";
import { getCurrentOrganization } from "@/lib/dal";
import { formatMonth, todayIn } from "@/lib/format";

export const metadata: Metadata = { title: "Rent" };

export default async function RentPage({
  searchParams,
}: {
  searchParams: Promise<ChargesMonthParams>;
}) {
  const [params, organization] = await Promise.all([searchParams, getCurrentOrganization()]);
  const month = isMonth(params.month) ? params.month : todayIn(organization?.timezone).slice(0, 7);
  const generate = (m: string) => <GenerateRentButton month={m} monthLabel={formatMonth(m)} />;

  return (
    <>
      <PageHeader
        title="Rent"
        description="Monthly rent for every current tenant."
        actions={generate(month)}
      />
      <SectionTabs current="rent" />
      <ChargesMonthView category="rent" params={params} emptyAction={generate} />
    </>
  );
}
