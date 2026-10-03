import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { BillForm } from "@/features/charges/components/bill-form";
import { listBillableTenancies, listUtilityTypes } from "@/features/charges/queries";
import { isMonth } from "@/features/charges/schema";
import { getCurrentOrganization } from "@/lib/dal";
import { todayIn } from "@/lib/format";

export const metadata: Metadata = { title: "Add bill" };

export default async function NewBillPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const [{ month }, tenancies, types, organization] = await Promise.all([
    searchParams,
    listBillableTenancies(),
    listUtilityTypes(),
    getCurrentOrganization(),
  ]);
  const today = todayIn(organization?.timezone);
  const back = { href: isMonth(month) ? `/bills?month=${month}` : "/bills", label: "Utility bills" };

  return (
    <>
      <PageHeader title="Add bill" description="Bill a current tenant for a utility." back={back} />
      {tenancies.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No current tenants"
          description="Bills go to a tenant living in one of your units."
          action={
            <Button asChild>
              <Link href="/tenants/new">Add tenant</Link>
            </Button>
          }
        />
      ) : (
        <BillForm
          tenancies={tenancies}
          types={types}
          currency={organization?.currency ?? "BDT"}
          defaultValues={{
            tenancyId: tenancies.length === 1 ? tenancies[0].id : "",
            chargeTypeId: "",
            billingMonth: isMonth(month) ? month : today.slice(0, 7),
            amount: "",
            dueDate: today,
            description: "",
          }}
        />
      )}
    </>
  );
}
