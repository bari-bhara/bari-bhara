"use client";

import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteNotice } from "../actions";

export function DeleteNoticeButton({ noticeId }: { noticeId: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 aria-hidden /> Delete
        </Button>
      }
      title="Delete this notice?"
      description="Tenants will no longer see it. This can't be undone."
      confirmLabel="Delete notice"
      pendingLabel="Deleting…"
      destructive
      onConfirm={() => deleteNotice(noticeId)}
    />
  );
}
