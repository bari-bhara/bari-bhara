"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/app/form-error";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { applyFieldErrors } from "@/lib/forms";
import { addTenant } from "../actions";
import type { AvailableUnit } from "../queries";
import { addTenantSchema, type AddTenantFormValues, type AddTenantInput } from "../schema";
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
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<AddTenantFormValues, unknown, AddTenantInput>({
    resolver: zodResolver(addTenantSchema),
    defaultValues,
  });

  // The action re-validates, so it gets the raw form values, not the parsed ones.
  async function onSubmit() {
    setFormError(null);
    const result = await addTenant(form.getValues());
    if (result && !result.ok) {
      setFormError(result.error);
      applyFieldErrors(form, result.fieldErrors);
    }
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
        <FormActions
          cancelHref={cancelHref}
          submitting={form.formState.isSubmitting}
          submitLabel="Add tenant"
        />
      </form>
    </Form>
  );
}
