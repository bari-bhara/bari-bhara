"use client";

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { reviewPaymentClaim } from "../actions";

/** Reject a tenant's claim, with a reason they'll see. */
export function RejectClaimDialog({ claimId, tenantName }: { claimId: string; tenantName: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function reject() {
    setPending(true);
    setError(null);
    const result = await reviewPaymentClaim(claimId, { approve: false, note });
    setPending(false);
    if (!result.ok) {
      setError(result.fieldErrors?.note?.[0] ?? result.error);
      return;
    }
    setOpen(false);
    toast.success("Claim rejected. The tenant has been told.");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        if (next) {
          setNote("");
          setError(null);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Reject ${tenantName}'s claim`}>
          Reject
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject this claim?</DialogTitle>
          <DialogDescription>No payment is recorded. {tenantName} sees your reason.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <FormError message={error} />
          <Label htmlFor={`reject-${claimId}`}>Reason</Label>
          <Textarea
            id={`reject-${claimId}`}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. No bKash payment arrived on that date"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={reject} disabled={pending}>
            {pending ? "Rejecting…" : "Reject claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
