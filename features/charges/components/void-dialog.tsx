"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Ban } from "lucide-react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { applyFieldErrors } from "@/lib/forms";
import { voidCharge, voidPayment } from "../actions";
import { voidSchema, type VoidInput } from "../schema";

const COPY = {
  payment: {
    trigger: "Void",
    title: "Void this payment?",
    description:
      "The payment stays in the record, marked void, and the charge's balance goes back up. Use this to correct mistakes.",
    confirm: "Void payment",
    success: "Payment voided.",
  },
  charge: {
    trigger: "Void charge",
    title: "Void this charge?",
    description:
      "The charge stays in the record, marked void, and no longer counts towards the balance. This can't be undone.",
    confirm: "Void charge",
    success: "Charge voided.",
  },
} as const;

/** Asks for a reason, then voids a payment or a charge. */
export function VoidDialog({
  kind,
  id,
  triggerLabel,
}: {
  kind: keyof typeof COPY;
  id: string;
  /** Accessible name for the trigger, e.g. "Void payment of ৳5,000". */
  triggerLabel?: string;
}) {
  const copy = COPY[kind];
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<VoidInput>({
    resolver: zodResolver(voidSchema),
    defaultValues: { reason: "" },
  });

  async function onSubmit(values: VoidInput) {
    setFormError(null);
    const result = kind === "payment" ? await voidPayment(id, values) : await voidCharge(id, values);
    if (!result.ok) {
      setFormError(result.error);
      applyFieldErrors(form, result.fieldErrors);
      return;
    }
    setOpen(false);
    form.reset();
    toast.success(copy.success);
  }

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={kind === "payment" ? "sm" : "default"}
          className="text-destructive hover:text-destructive"
          aria-label={triggerLabel}
        >
          <Ban aria-hidden /> {copy.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
            <FormError message={formError} />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Recorded twice" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={submitting}>
                {submitting ? "Voiding…" : copy.confirm}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
