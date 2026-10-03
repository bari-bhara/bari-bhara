"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/app/form-error";
import { Form } from "@/components/ui/form";
import { applyFieldErrors } from "@/lib/forms";
import { moveIn } from "../actions";
import type { AvailableUnit } from "../queries";
import { moveInSchema, type MoveInFormValues, type MoveInInput } from "../schema";
import { FormActions } from "./form-actions";
import { TenancyTermsFields } from "./tenancy-terms-fields";

/** Starts a new tenancy for an existing tenant. */
export function MoveInForm({
  tenantId,
  units,
  defaultValues,
  currency,
}: {
  tenantId: string;
  units: AvailableUnit[];
  defaultValues: MoveInFormValues;
  currency: string;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<MoveInFormValues, unknown, MoveInInput>({
    resolver: zodResolver(moveInSchema),
    defaultValues,
  });

  async function onSubmit() {
    setFormError(null);
    const result = await moveIn(tenantId, form.getValues());
    if (result && !result.ok) {
      setFormError(result.error);
      applyFieldErrors(form, result.fieldErrors);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-2xl gap-5" noValidate>
        <FormError message={formError} />
        <TenancyTermsFields units={units} currency={currency} />
        <FormActions
          cancelHref={`/tenants/${tenantId}`}
          submitting={form.formState.isSubmitting}
          submitLabel="Move in"
        />
      </form>
    </Form>
  );
}
