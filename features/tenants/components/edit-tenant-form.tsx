"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/app/form-error";
import { Form } from "@/components/ui/form";
import { applyFieldErrors } from "@/lib/forms";
import { updateTenant } from "../actions";
import { tenantSchema, type TenantFormValues, type TenantInput } from "../schema";
import { FormActions } from "./form-actions";
import { TenantDetailsFields } from "./tenant-details-fields";

export function EditTenantForm({
  tenantId,
  defaultValues,
}: {
  tenantId: string;
  defaultValues: TenantFormValues;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<TenantFormValues, unknown, TenantInput>({
    resolver: zodResolver(tenantSchema),
    defaultValues,
  });

  async function onSubmit() {
    setFormError(null);
    const result = await updateTenant(tenantId, form.getValues());
    if (result && !result.ok) {
      setFormError(result.error);
      applyFieldErrors(form, result.fieldErrors);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-2xl gap-5" noValidate>
        <FormError message={formError} />
        <TenantDetailsFields />
        <FormActions
          cancelHref={`/tenants/${tenantId}`}
          submitting={form.formState.isSubmitting}
          submitLabel="Save changes"
        />
      </form>
    </Form>
  );
}
