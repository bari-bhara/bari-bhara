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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyFieldErrors } from "@/lib/forms";
import { createLandlordRequest } from "../actions";
import { landlordRequestSchema, type LandlordRequestInput } from "../schema";
import { IssueFields } from "./issue-fields";

export function LandlordRequestForm({
  units,
  defaultUnitId,
}: {
  units: { id: string; label: string }[];
  defaultUnitId: string;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LandlordRequestInput>({
    resolver: zodResolver(landlordRequestSchema),
    defaultValues: {
      unitId: defaultUnitId,
      category: undefined as unknown as LandlordRequestInput["category"],
      title: "",
      description: "",
    },
  });

  async function onSubmit(values: LandlordRequestInput) {
    setFormError(null);
    const result = await createLandlordRequest(values);
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
          name="unitId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a unit" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>If someone lives there, they&apos;ll see this request and its public updates.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <IssueFields />
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button asChild variant="outline" className="h-11 sm:h-10">
            <Link href="/maintenance">Cancel</Link>
          </Button>
          <Button type="submit" className="h-11 sm:h-10" disabled={submitting}>
            {submitting ? "Saving…" : "Create request"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
