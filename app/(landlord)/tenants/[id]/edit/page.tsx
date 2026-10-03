import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { EditTenantForm } from "@/features/tenants/components/edit-tenant-form";
import { getTenant } from "@/features/tenants/queries";

export const metadata: Metadata = { title: "Edit tenant" };

export default async function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await getTenant(id);
  if (!tenant) notFound();

  return (
    <>
      <PageHeader
        title="Edit tenant"
        back={{ href: `/tenants/${tenant.id}`, label: tenant.full_name }}
      />
      <EditTenantForm
        tenantId={tenant.id}
        defaultValues={{
          fullName: tenant.full_name,
          phone: tenant.phone,
          email: tenant.email,
          notes: tenant.notes,
        }}
      />
    </>
  );
}
