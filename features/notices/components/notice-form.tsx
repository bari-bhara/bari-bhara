"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyFieldErrors } from "@/lib/forms";
import type { NoticeAudience } from "@/types/domain";
import { createNotice } from "../actions";
import { AUDIENCE_LABELS, noticeSchema, type NoticeInput } from "../schema";

type Target = { id: string; name: string; units: { id: string; unit_number: string }[] };

export function NoticeForm({ targets, timeZone }: { targets: Target[]; timeZone: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<NoticeInput>({
    resolver: zodResolver(noticeSchema),
    defaultValues: {
      title: "",
      body: "",
      audience: "all",
      propertyId: targets.length === 1 ? targets[0].id : "",
      unitIds: [],
      publishAt: "",
      expiresAt: "",
    },
  });
  const audience = useWatch({ control: form.control, name: "audience" });

  async function onSubmit(values: NoticeInput) {
    setFormError(null);
    const result = await createNotice(values);
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Water supply interruption" autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea rows={6} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="audience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Who should see it?</FormLabel>
              <FormControl>
                <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-3">
                  {(Object.keys(AUDIENCE_LABELS) as NoticeAudience[]).map((value) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm has-[:checked]:border-primary"
                    >
                      <RadioGroupItem value={value} />
                      {AUDIENCE_LABELS[value]}
                    </label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormDescription>Tenants who move in later see live notices for their home too.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {audience === "property" && (
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
                    {targets.map((property) => (
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
        {audience === "units" && (
          <FormField
            control={form.control}
            name="unitIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Units</FormLabel>
                <div className="grid gap-4 rounded-lg border p-4">
                  {targets.map((property) => (
                    <fieldset key={property.id} className="grid gap-2">
                      <legend className="mb-1 text-sm font-medium">{property.name}</legend>
                      {property.units.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No units.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {property.units.map((unit) => {
                            const checked = field.value.includes(unit.id);
                            return (
                              <label
                                key={unit.id}
                                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:checked]:border-primary"
                              >
                                <Checkbox
                                  checked={checked}
                                  aria-label={`${property.name} unit ${unit.unit_number}`}
                                  onCheckedChange={(on) =>
                                    field.onChange(
                                      on ? [...field.value, unit.id] : field.value.filter((id) => id !== unit.id),
                                    )
                                  }
                                />
                                Unit {unit.unit_number}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </fieldset>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="publishAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Publish at (optional)</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormDescription>Leave empty to publish now. Times are in {timeZone}.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expiresAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hide after (optional)</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormDescription>Leave empty to keep it visible.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button asChild variant="outline" className="h-11 sm:h-10">
            <Link href="/notices">Cancel</Link>
          </Button>
          <Button type="submit" className="h-11 sm:h-10" disabled={submitting}>
            {submitting ? "Publishing…" : "Publish notice"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
