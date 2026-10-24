"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { scheduleUnitCharge } from "../actions";
import {
  scheduleChargeSchema,
  type ScheduleChargeFormValues,
  type ScheduleChargeInput,
} from "../schema";

/**
 * Changes the unit's rent (pass `rentTypeId`) or a fixed monthly bill (pass
 * `types`) from a future month. The current tenant is told about it.
 */
export function ScheduleChargeDialog({
  unitId,
  trigger,
  title,
  description,
  rentTypeId,
  types = [],
  currentAmount,
  currency,
  firstMonth,
  hasTenant,
}: {
  unitId: string;
  trigger: React.ReactNode;
  title: string;
  description: string;
  rentTypeId?: string;
  types?: { id: string; label: string }[];
  /** Prefills the amount, e.g. the current rent. */
  currentAmount?: number;
  currency: string;
  /** "YYYY-MM": the earliest month a change can start (next month). */
  firstMonth: string;
  hasTenant: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const defaults: ScheduleChargeFormValues = {
    chargeTypeId: rentTypeId ?? "",
    amount: currentAmount ? String(currentAmount) : "",
    effectiveMonth: firstMonth,
  };
  const form = useForm<ScheduleChargeFormValues, unknown, ScheduleChargeInput>({
    resolver: zodResolver(scheduleChargeSchema),
    defaultValues: defaults,
  });

  async function onSubmit() {
    setFormError(null);
    if (form.getValues("effectiveMonth") < firstMonth) {
      form.setError("effectiveMonth", { message: "Choose next month or later." });
      return;
    }
    const result = await scheduleUnitCharge(unitId, form.getValues());
    if (!result.ok) {
      setFormError(result.error);
      applyFieldErrors(form, result.fieldErrors);
      return;
    }
    setOpen(false);
    toast.success(result.data.notified ? "Saved. The tenant has been told." : "Saved.");
  }

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitting) return;
        if (next) {
          form.reset(defaults);
          setFormError(null);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
            <FormError message={formError} />
            {!rentTypeId && (
              <FormField
                control={form.control}
                name="chargeTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a bill type" />
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
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly amount ({currency})</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="e.g. 20000" {...field} />
                    </FormControl>
                    <FormDescription>0 stops it.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="effectiveMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starting from</FormLabel>
                    <FormControl>
                      <Input type="month" min={firstMonth} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {hasTenant && (
              <p className="text-sm text-muted-foreground">
                The current tenant gets a message in the app and by email, if they have one.
              </p>
            )}
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
