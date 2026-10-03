import type { Metadata } from "next";
import { ChargeDetailView } from "@/features/charges/components/charge-detail-view";

export const metadata: Metadata = { title: "Rent" };

export default async function RentChargePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChargeDetailView id={id} category="rent" />;
}
