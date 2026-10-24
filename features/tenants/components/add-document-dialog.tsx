"use client";

import { FilePlus } from "lucide-react";
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
import { registerTenantDocument } from "../actions";
import { uploadTenantDocument } from "../documents";
import { DocumentFields, type PendingDocument } from "./document-fields";

/** Upload an ID document for an existing tenant. */
export function AddDocumentDialog({ orgId, tenantId }: { orgId: string; tenantId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!pending) {
      setError("Choose a file to upload.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await saveTenantDocument(orgId, tenantId, pending);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    toast.success("Document added.");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        if (next) {
          setPending(null);
          setError(null);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FilePlus aria-hidden /> Add document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add ID document</DialogTitle>
          <DialogDescription>Keep a copy of the tenant&apos;s identification.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-5">
          <FormError message={error} />
          <DocumentFields value={pending} onChange={setPending} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Uploads the file from the browser, then records it. */
export async function saveTenantDocument(orgId: string, tenantId: string, doc: PendingDocument) {
  const path = await uploadTenantDocument(orgId, tenantId, doc.file);
  if (!path) return { ok: false as const, error: "The file couldn't be uploaded. Please try again." };
  return registerTenantDocument(tenantId, { kind: doc.kind, storagePath: path, fileName: doc.file.name });
}
