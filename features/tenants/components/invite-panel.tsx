"use client";

import { Check, CircleCheck, Copy, KeyRound } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createInvite } from "../actions";

/** "ABCDE12345" → "ABCDE-12345": easier to read out and type. */
function displayCode(code: string) {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

/**
 * App access for a tenant: connected, or an invite code to share. The active
 * code stays visible here until it's used or expires (ADR 0011).
 */
export function InvitePanel({
  tenantId,
  tenantName,
  hasLogin,
  activeCode,
  pendingInviteExpiry,
}: {
  tenantId: string;
  tenantName: string;
  hasLogin: boolean;
  /** The unused code, if it can be shown (codes made before ADR 0011 can't). */
  activeCode: string | null;
  /** Formatted expiry of an unused code, if one exists. */
  pendingInviteExpiry: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (hasLogin) {
    return (
      <p className="flex items-start gap-2 text-sm">
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
        <span>
          <span className="font-medium">Connected.</span> {tenantName} can sign in and see their
          home.
        </span>
      </p>
    );
  }

  function create() {
    startTransition(async () => {
      const result = await createInvite(tenantId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCopied(false);
      setInvite(result.data);
    });
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(displayCode(code));
      setCopied(true);
    } catch {
      toast.error("Couldn't copy. Select the code and copy it instead.");
    }
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        {pendingInviteExpiry
          ? activeCode
            ? `An invite code is active until ${pendingInviteExpiry}. Share it with ${tenantName}; it works once.`
            : `An invite code is active until ${pendingInviteExpiry}. Create a new one to see it here.`
          : `${tenantName} isn't using the app yet. Create an invite code and share it with them.`}
      </p>
      {activeCode && pendingInviteExpiry && (
        <div className="flex flex-wrap items-center gap-2">
          <p
            className="select-all rounded-lg border bg-muted px-4 py-2 font-mono text-lg font-semibold tracking-widest"
            aria-label="Active invite code"
          >
            {displayCode(activeCode)}
          </p>
          <Button variant="ghost" size="sm" onClick={() => copy(activeCode)}>
            {copied && !invite ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied && !invite ? "Copied" : "Copy"}
          </Button>
        </div>
      )}
      <div>
        <Button variant="outline" onClick={create} disabled={pending}>
          <KeyRound aria-hidden />
          {pending ? "Creating…" : pendingInviteExpiry ? "Create new code" : "Create invite code"}
        </Button>
      </div>

      <Dialog
        open={invite !== null}
        onOpenChange={(open) => {
          if (!open) {
            setInvite(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite code for {tenantName}</DialogTitle>
            <DialogDescription>
              Share this code with them. They sign up as a tenant, then enter it to see their home.
              It works once and expires in 7 days.
            </DialogDescription>
          </DialogHeader>
          {invite && (
            <p
              className="select-all rounded-lg border bg-muted py-4 text-center font-mono text-2xl font-semibold tracking-widest"
              aria-label="Invite code"
            >
              {displayCode(invite.code)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            It stays on this tenant&apos;s page until it&apos;s used or expires.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => invite && copy(invite.code)}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Copied" : "Copy code"}
            </Button>
            <Button
              onClick={() => {
                setInvite(null);
                setCopied(false);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
