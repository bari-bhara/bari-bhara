"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action-result";
import { applyFieldErrors } from "@/lib/forms";

export type DetailsField<T> = {
  name: Path<T>;
  label: string;
  type?: "text" | "tel";
  autoComplete?: string;
};

/** An "Edit" button that opens a small form of text fields in a dialog. */
export function EditDetailsDialog<T extends FieldValues>({
  title,
  description,
  triggerLabel,
  schema,
  defaultValues,
  fields,
  action,
}: {
  title: string;
  description: string;
  /** Accessible name of the Edit button, e.g. "Edit account details". */
  triggerLabel: string;
  schema: z.ZodType<T, T>;
  defaultValues: DefaultValues<T>;
  fields: DetailsField<T>[];
  action: (values: T) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<T>({ resolver: zodResolver(schema), defaultValues });

  async function onSubmit(values: T) {
    setFormError(null);
    const result = await action(values);
    if (!result.ok) {
      setFormError(result.error);
      applyFieldErrors(form, result.fieldErrors);
      return;
    }
    setOpen(false);
    toast.success("Saved.");
  }

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        if (next) {
          form.reset(defaultValues);
          setFormError(null);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={triggerLabel}>
          <Pencil aria-hidden /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
            <FormError message={formError} />
            {fields.map((field) => (
              <FormField
                key={field.name}
                control={form.control}
                name={field.name}
                render={({ field: input }) => (
                  <FormItem>
                    <FormLabel>{field.label}</FormLabel>
                    <FormControl>
                      <Input
                        type={field.type ?? "text"}
                        autoComplete={field.autoComplete ?? "off"}
                        {...input}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
