"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/app/form-error";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { applyFieldErrors } from "@/lib/forms";
import { addTenant } from "../actions";
import type { AvailableUnit } from "../queries";
import { addTenantSchema, type AddTenantFormValues, type AddTenantInput } from "../schema";
import { saveTenantDocument } from "./add-document-dialog";
import { DocumentFields, type PendingDocument } from "./document-fields";
import { FormActions } from "./form-actions";
import { TenancyTermsFields } from "./tenancy-terms-fields";
import { TenantDetailsFields } from "./tenant-details-fields";

/** Creates a tenant and moves them into a unit in one step. */
export function AddTenantForm({
  units,
  defaultValues,
  currency,
  cancelHref,
}: {
  units: AvailableUnit[];
  defaultValues: AddTenantFormValues;
  currency: string;
  cancelHref: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [document, setDocument] = useState<PendingDocument | null>(null);
  const form = useForm<AddTenantFormValues, unknown, AddTenantInput>({
    resolver: zodResolver(addTenantSchema),
    defaultValues,
  });

  // The action re-validates, so it gets the raw form values, not the parsed ones.
  async function onSubmit() {
    setFormError(null);
    // Without a document the action redirects to the new tenant's page.
    const result = await addTenant(form.getValues(), { stay: document !== null });
    if (!result) return;
    if (!result.ok) {
      setFormError(result.error);
      applyFieldErrors(form, result.fieldErrors);
      return;
    }
    if (document) {
      // The tenant exists now; a failed upload can be retried from their page.
      const saved = await saveTenantDocument(result.data.orgId, result.data.tenantId, document);
      if (!saved.ok) toast.error(`Tenant added, but the document wasn't saved: ${saved.error}`);
    }
    router.push(`/tenants/${result.data.tenantId}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-2xl gap-5" noValidate>
        <FormError message={formError} />
        <h2 className="text-base font-semibold">Tenant</h2>
        <TenantDetailsFields />
        <Separator />
        <h2 className="text-base font-semibold">Tenancy</h2>
        <TenancyTermsFields units={units} currency={currency} />
        <Separator />
        <h2 className="text-base font-semibold">ID document (optional)</h2>
        <DocumentFields value={document} onChange={setDocument} />
        <FormActions
          cancelHref={cancelHref}
          submitting={form.formState.isSubmitting}
          submitLabel="Add tenant"
        />
      </form>
    </Form>
  );
}
