"use client";

import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { deleteProperty, setPropertyArchived } from "../actions";

/** Archive/restore and delete controls for the property detail page. */
export function PropertyActions({
  propertyId,
  name,
  archived,
  unitCount,
}: {
  propertyId: string;
  name: string;
  archived: boolean;
  unitCount: number;
}) {
  return (
    <>
      {archived ? (
        <ConfirmDialog
          trigger={
            <Button variant="outline">
              <ArchiveRestore aria-hidden /> Restore
            </Button>
          }
          title={`Restore ${name}?`}
          description="It will show up in your property and unit lists again."
          confirmLabel="Restore"
          pendingLabel="Restoring…"
          successMessage="Property restored."
          onConfirm={() => setPropertyArchived(propertyId, false)}
        />
      ) : (
        <ConfirmDialog
          trigger={
            <Button variant="outline">
              <Archive aria-hidden /> Archive
            </Button>
          }
          title={`Archive ${name}?`}
          description="Archived properties and their units are hidden from lists, but nothing is deleted. You can restore it any time."
          confirmLabel="Archive"
          pendingLabel="Archiving…"
          successMessage="Property archived."
          onConfirm={() => setPropertyArchived(propertyId, true)}
        />
      )}
      {unitCount === 0 && (
        <ConfirmDialog
          trigger={
            <Button variant="outline" className="text-destructive hover:text-destructive">
              <Trash2 aria-hidden /> Delete
            </Button>
          }
          title={`Delete ${name}?`}
          description="This permanently deletes the property. This can't be undone."
          confirmLabel="Delete property"
          pendingLabel="Deleting…"
          destructive
          onConfirm={() => deleteProperty(propertyId)}
        />
      )}
    </>
  );
}
