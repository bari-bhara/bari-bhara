"use client";

import { useRef } from "react";
import { useFormContext } from "react-hook-form";
import {
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
import type { AvailableUnit } from "../queries";
import type { TenancyTermsFormValues } from "../schema";

/**
 * Unit, rent, deposit and move-in date. Used inside a <Form> whose values
 * include TenancyTermsFormValues (add tenant, move in).
 */
export function TenancyTermsFields({
  units,
  currency,
}: {
  units: AvailableUnit[];
  currency: string;
}) {
  const form = useFormContext<TenancyTermsFormValues>();
  // Rent we filled in from a unit's default; replaced when another unit is picked.
  const autofilledRent = useRef<string | null>(null);

  function onUnitChange(unitId: string) {
    const unit = units.find((u) => u.id === unitId);
    const rent = form.getValues("monthlyRent");
    if (unit && (rent === "" || rent === autofilledRent.current)) {
      const defaultRent = String(unit.default_rent);
      form.setValue("monthlyRent", defaultRent, { shouldValidate: rent !== "" });
      autofilledRent.current = defaultRent;
    }
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="unitId"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Unit</FormLabel>
            <Select
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                onUnitChange(value);
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a vacant unit" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.property.name} · Unit {unit.unit_number}
                    {unit.status === "maintenance" && " (under maintenance)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>Only vacant units and units under maintenance are listed.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="monthlyRent"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Monthly rent ({currency})</FormLabel>
            <FormControl>
              <Input inputMode="decimal" placeholder="e.g. 15000" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="securityDeposit"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Security deposit ({currency})</FormLabel>
            <FormControl>
              <Input inputMode="decimal" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="moveInDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Move-in date</FormLabel>
            <FormControl>
              <Input type="date" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
