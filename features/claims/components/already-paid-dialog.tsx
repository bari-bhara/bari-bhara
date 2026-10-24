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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/features/charges/schema";
import { applyFieldErrors } from "@/lib/forms";
import { submitPaymentClaim } from "../actions";
import { claimSchema, type ClaimFormValues, type ClaimInput } from "../schema";

/** "Already paid": the tenant tells their landlord about a payment for one charge. */
export function AlreadyPaidDialog({
  chargeId,
  chargeLabel,
  outstanding,
  outstandingLabel,
  currency,
  today,
}: {
  chargeId: string;
  /** "Rent · October 2026", for the dialog and the button's accessible name. */
  chargeLabel: string;
  outstanding: number;
  outstandingLabel: string;
  currency: string;
  /** "YYYY-MM-DD" in the landlord's time zone. */
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const defaults: ClaimFormValues = {
    amount: String(outstanding),
    paidOn: today,
    method: "bkash",
    reference: "",
    note: "",
  };
  const form = useForm<ClaimFormValues, unknown, ClaimInput>({
    resolver: zodResolver(claimSchema),
    defaultValues: defaults,
  });

  async function onSubmit() {
    setFormError(null);
    const result = await submitPaymentClaim(chargeId, form.getValues());
    if (!result.ok) {
      setFormError(result.error);
      applyFieldErrors(form, result.fieldErrors);
      return;
    }
    setOpen(false);
    toast.success("Sent. Your landlord will confirm the payment.");
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
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Already paid ${chargeLabel}`}>
          Already paid
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tell your landlord you paid</DialogTitle>
          <DialogDescription>
            {chargeLabel}: {outstandingLabel} due. Your landlord checks the payment, then marks it paid.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
            <FormError message={formError} />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount paid ({currency})</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paidOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid on</FormLabel>
                    <FormControl>
                      <Input type="date" max={today} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How you paid</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {PAYMENT_METHOD_LABELS[method]}
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
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Transaction ID" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="e.g. Paid to the caretaker" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Sending…" : "Send to landlord"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
