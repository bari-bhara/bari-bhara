"use client";

import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { cancelRequest } from "../actions";

export function CancelRequestButton({ requestId }: { requestId: string }) {
  return (
    <ConfirmDialog
      trigger={<Button variant="outline">Cancel request</Button>}
      title="Cancel this request?"
      description="Your landlord will see it as cancelled. You can report it again later if the problem comes back."
      confirmLabel="Cancel request"
      pendingLabel="Cancelling…"
      destructive
      successMessage="Request cancelled."
      onConfirm={() => cancelRequest(requestId)}
    />
  );
}
