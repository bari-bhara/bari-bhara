"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMonth } from "@/lib/format";
import { applyFieldErrors } from "@/lib/forms";
import { createBill } from "../actions";
import type { BillableTenancy } from "../queries";
import { billSchema, meteredAmount, type BillFormValues, type BillInput } from "../schema";

const READING = /^\d{1,10}(\.\d{1,4})?$/;

export function BillForm({
  tenancies,
  types,
  defaultValues,
  lastReadings,
  currency,
}: {
  tenancies: BillableTenancy[];
  types: { id: string; label: string }[];
  defaultValues: BillFormValues;
  /** Latest meter reading per "unitId:typeId", to prefill the previous reading. */
  lastReadings: Record<string, number>;
  currency: string;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [metered, setMetered] = useState(false);
  const form = useForm<BillFormValues, unknown, BillInput>({
    resolver: zodResolver(billSchema),
    defaultValues,
  });

  const [tenancyId, chargeTypeId, meterPrevious, meterCurrent, unitRate] = useWatch({
    control: form.control,
    name: ["tenancyId", "chargeTypeId", "meterPrevious", "meterCurrent", "unitRate"],
  });
  const tenancy = tenancies.find((t) => t.id === tenancyId);
  const lastReading = tenancy && chargeTypeId ? lastReadings[`${tenancy.unitId}:${chargeTypeId}`] : undefined;

  // Metered bills: the amount follows the readings.
  const readingsComplete = [meterPrevious, meterCurrent, unitRate].every((v) => READING.test(v.trim()));
  const computed = metered && readingsComplete
    ? meteredAmount(Number(meterPrevious), Number(meterCurrent), Number(unitRate))
    : null;
  useEffect(() => {
    if (computed !== null && computed > 0) form.setValue("amount", String(computed));
  }, [computed, form]);

  // Start from where the last bill of this type for this unit ended.
  useEffect(() => {
    if (metered && lastReading !== undefined && form.getValues("meterPrevious") === "") {
      form.setValue("meterPrevious", String(lastReading));
    }
  }, [metered, lastReading, form]);

  function setMeteredMode(next: boolean) {
    setMetered(next);
    if (!next) {
      for (const name of ["meterPrevious", "meterCurrent", "unitRate"] as const) form.setValue(name, "");
    }
  }

  async function onSubmit() {
    setFormError(null);
    // The server checks this too; this just saves a round trip.
    if (tenancy && form.getValues("billingMonth") < tenancy.firstMonth) {
      form.setError("billingMonth", {
        message: `Choose ${formatMonth(tenancy.firstMonth)} or later, the tenant's move-in month.`,
      });
      return;
    }
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
              <Select
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  // Move the month forward if it's before the new tenant moved in.
                  const first = tenancies.find((t) => t.id === value)?.firstMonth;
                  if (first && form.getValues("billingMonth") < first) {
                    form.setValue("billingMonth", first);
                  }
                }}
              >
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
                  <Input type="month" min={tenancy?.firstMonth} {...field} />
                </FormControl>
                {tenancy && (
                  <FormDescription>From {formatMonth(tenancy.firstMonth)} (move-in).</FormDescription>
                )}
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
                  <Input inputMode="decimal" placeholder="e.g. 2350" readOnly={metered} {...field} />
                </FormControl>
                {metered && <FormDescription>Units used × rate.</FormDescription>}
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
        <div className="grid gap-4 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="bill-metered"
              checked={metered}
              onCheckedChange={(checked) => setMeteredMode(checked === true)}
            />
            <label htmlFor="bill-metered" className="text-sm font-medium leading-none">
              Metered bill (from meter readings)
            </label>
          </div>
          {metered && (
            <div className="grid gap-5 sm:grid-cols-3">
              {(
                [
                  ["meterPrevious", "Previous reading", lastReading !== undefined ? "From the last bill." : undefined],
                  ["meterCurrent", "Current reading", undefined],
                  ["unitRate", `Rate per unit (${currency})`, undefined],
                ] as const
              ).map(([name, label, hint]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input inputMode="decimal" autoComplete="off" {...field} />
                      </FormControl>
                      {hint && <FormDescription>{hint}</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          )}
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
