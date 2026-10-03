"use client";

import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteUnit } from "../actions";

export function DeleteUnitButton({ unitId, unitNumber }: { unitId: string; unitNumber: string }) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <Trash2 aria-hidden /> Delete
        </Button>
      }
      title={`Delete unit ${unitNumber}?`}
      description="This permanently deletes the unit. To keep it but stop renting it out, set its status to Inactive instead."
      confirmLabel="Delete unit"
      pendingLabel="Deleting…"
      destructive
      onConfirm={() => deleteUnit(unitId)}
    />
  );
}
