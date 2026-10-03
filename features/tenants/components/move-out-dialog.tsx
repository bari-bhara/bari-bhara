"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogOut } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyFieldErrors } from "@/lib/forms";
import { moveOut } from "../actions";
import { MOVE_OUT_REASONS, moveOutSchema, type MoveOutFormValues } from "../schema";

/** Ends a tenancy. History is kept; the unit becomes vacant. */
export function MoveOutDialog({
  tenancyId,
  tenantName,
  unitLabel,
  today,
}: {
  tenancyId: string;
  tenantName: string;
  unitLabel: string;
  /** "YYYY-MM-DD" in the organization's time zone. */
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<MoveOutFormValues>({
    resolver: zodResolver(moveOutSchema),
    defaultValues: { moveOutDate: today, reason: "Lease ended", notes: "" },
  });

  async function onSubmit() {
    setFormError(null);
    const result = await moveOut(tenancyId, form.getValues());
    if (!result.ok) {
      setFormError(result.error);
      applyFieldErrors(form, result.fieldErrors);
      return;
    }
    setOpen(false);
    form.reset();
    toast.success(`${tenantName} moved out of ${unitLabel}.`);
  }

  const submitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <LogOut aria-hidden /> Move out
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Move out {tenantName}</DialogTitle>
          <DialogDescription>
            Ends the tenancy for {unitLabel}. Its history is kept and the unit becomes vacant.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
            <FormError message={formError} />
            <FormField
              control={form.control}
              name="moveOutDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Move-out date</FormLabel>
                  <FormControl>
                    <Input type="date" max={today} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MOVE_OUT_REASONS.map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Deposit returned, meter readings…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Confirm move-out"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
