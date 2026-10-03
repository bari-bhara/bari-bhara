import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import {
  ChargesMonthView,
  type ChargesMonthParams,
} from "@/features/charges/components/charges-month-view";
import { SectionTabs } from "@/features/charges/components/section-tabs";

export const metadata: Metadata = { title: "Utility bills" };

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<ChargesMonthParams>;
}) {
  const params = await searchParams;
  const addBill = (month?: string) => (
    <Button asChild>
      <Link href={month ? `/bills/new?month=${month}` : "/bills/new"}>
        <Plus aria-hidden /> Add bill
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Utility bills"
        description="Electricity, gas, water, internet and other bills."
        actions={addBill(params.month)}
      />
      <SectionTabs current="bills" />
      <ChargesMonthView category="utility" params={params} emptyAction={addBill} />
    </>
  );
}
