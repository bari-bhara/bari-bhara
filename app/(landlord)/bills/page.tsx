import { Zap } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Utility bills" };

export default function BillsPage() {
  return (
    <>
      <PageHeader title="Utility bills" description="Electricity, gas, water, internet and other bills." />
      <EmptyState
        icon={Zap}
        title="No bills yet"
        description="Utility bills you create for tenants will appear here."
      />
    </>
  );
}
