"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyFieldErrors } from "@/lib/forms";
import { createUnit, updateUnit } from "../actions";
import {
  EDITABLE_UNIT_STATUSES,
  UNIT_STATUS_LABELS,
  createUnitSchema,
  type CreateUnitFormValues,
  type CreateUnitInput,
} from "../schema";

/**
 * Create a unit, or edit one when `unitId` is given. When creating from a
 * property page the property is fixed; otherwise the user picks one.
 */
export function UnitForm({
  unitId,
  defaultValues,
  properties,
  currency,
  cancelHref,
}: {
  unitId?: string;
  defaultValues: CreateUnitFormValues;
  /** Choices for the property picker; omit to keep `defaultValues.propertyId` fixed. */
  properties?: { id: string; name: string }[];
  currency: string;
  cancelHref: string;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CreateUnitFormValues, unknown, CreateUnitInput>({
    resolver: zodResolver(createUnitSchema),
    defaultValues,
  });

  // An occupied unit's status follows its tenancy and can't be changed here.
  const statusLocked = defaultValues.status === "occupied";

  // The action re-validates, so it gets the raw form values, not the parsed ones.
  async function onSubmit() {
    setFormError(null);
    const values = form.getValues();
    const result = unitId ? await updateUnit(unitId, values) : await createUnit(values);
    if (result && !result.ok) {
      setFormError(result.error);
      applyFieldErrors(form, result.fieldErrors);
    }
  }

  const submitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-2xl gap-5" noValidate>
        <FormError message={formError} />
        {properties && (
          <FormField
            control={form.control}
            name="propertyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a property" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="unitNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. A1 or 302" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="floor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Floor (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 3 or G" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unitType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. 2 bed flat, Shop" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bedrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bedrooms (optional)</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="defaultRent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly rent ({currency})</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="e.g. 15000" {...field} />
                </FormControl>
                <FormDescription>Suggested rent for new tenancies.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={statusLocked}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(statusLocked ? (["occupied"] as const) : EDITABLE_UNIT_STATUSES).map(
                      (status) => (
                        <SelectItem key={status} value={status}>
                          {UNIT_STATUS_LABELS[status]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {statusLocked
                    ? "Changes to vacant when the tenant moves out."
                    : "Becomes occupied automatically when a tenant moves in."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormDescription>Only you can see these.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button asChild variant="outline" className="h-11 sm:h-10">
            <Link href={cancelHref}>Cancel</Link>
          </Button>
          <Button type="submit" className="h-11 sm:h-10" disabled={submitting}>
            {submitting ? "Saving…" : unitId ? "Save changes" : "Add unit"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
