"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Combobox } from "@/components/app/combobox";
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
import { Textarea } from "@/components/ui/textarea";
import { ordinal } from "@/lib/format";
import { applyFieldErrors } from "@/lib/forms";
import { createProperty, updateProperty } from "../actions";
import {
  EMPTY_PROPERTY,
  propertySchema,
  type PropertyFormValues,
  type PropertyInput,
} from "../schema";

/** "1st" … "28th": a due day must exist in every month. */
const DUE_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: ordinal(i + 1),
}));

/** Create a property, or edit one when `propertyId` is given. */
export function PropertyForm({
  propertyId,
  defaultValues = EMPTY_PROPERTY,
  cancelHref,
}: {
  propertyId?: string;
  defaultValues?: PropertyFormValues;
  cancelHref: string;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<PropertyFormValues, unknown, PropertyInput>({
    resolver: zodResolver(propertySchema),
    defaultValues,
  });

  // The action re-validates, so it gets the raw form values, not the parsed ones.
  async function onSubmit() {
    setFormError(null);
    const values = form.getValues();
    const result = propertyId
      ? await updateProperty(propertyId, values)
      : await createProperty(values);
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
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Green View Tower" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input autoComplete="street-address" placeholder="e.g. House, Road, Area" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input autoComplete="address-level2" placeholder="e.g. Dhaka" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rentDueDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rent due day</FormLabel>
                <FormControl>
                  <Combobox
                    options={DUE_DAY_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                    searchPlaceholder="Search days…"
                  />
                </FormControl>
                <FormDescription>Day of the month rent is due.</FormDescription>
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
            {submitting ? "Saving…" : propertyId ? "Save changes" : "Add property"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
