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
import { applyFieldErrors } from "@/lib/forms";
import { createBill } from "../actions";
import type { BillableTenancy } from "../queries";
import { billSchema, type BillFormValues, type BillInput } from "../schema";

export function BillForm({
  tenancies,
  types,
  defaultValues,
  currency,
}: {
  tenancies: BillableTenancy[];
  types: { id: string; label: string }[];
  defaultValues: BillFormValues;
  currency: string;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<BillFormValues, unknown, BillInput>({
    resolver: zodResolver(billSchema),
    defaultValues,
  });

  async function onSubmit() {
    setFormError(null);
    const result = await createBill(form.getValues());
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
          name="tenancyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bill to</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a current tenant" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tenancies.map((tenancy) => (
                    <SelectItem key={tenancy.id} value={tenancy.id}>
                      {tenancy.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="chargeTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bill type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="billingMonth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>For month</FormLabel>
                <FormControl>
                  <Input type="month" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount ({currency})</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="e.g. 2350" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Meter reading 10452" autoComplete="off" {...field} />
              </FormControl>
              <FormDescription>Your tenant can see this.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button asChild variant="outline" className="h-11 sm:h-10">
            <Link href="/bills">Cancel</Link>
          </Button>
          <Button type="submit" className="h-11 sm:h-10" disabled={submitting}>
            {submitting ? "Saving…" : "Add bill"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
