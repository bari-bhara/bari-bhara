import { FileText } from "lucide-react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { deleteTenantDocument } from "../actions";
import type { TenantDocument } from "../queries";
import { TENANT_DOCUMENT_KINDS } from "../schema";

/** The tenant's ID documents, each opening in a new tab through a signed link. */
export function TenantDocuments({
  documents,
  timeZone,
}: {
  documents: TenantDocument[];
  timeZone?: string;
}) {
  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">No ID documents yet.</p>;
  }
  return (
    <ul className="divide-y" aria-label="ID documents">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            {doc.url ? (
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                {TENANT_DOCUMENT_KINDS[doc.kind]}
              </a>
            ) : (
              <span className="font-medium">{TENANT_DOCUMENT_KINDS[doc.kind]}</span>
            )}
            <p className="truncate text-sm text-muted-foreground">
              {[doc.file_name, formatDate(doc.created_at, timeZone)].filter(Boolean).join(" · ")}
            </p>
          </div>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" aria-label={`Delete ${TENANT_DOCUMENT_KINDS[doc.kind]}`}>
                Delete
              </Button>
            }
            title="Delete this document?"
            description="The file is removed for good."
            confirmLabel="Delete"
            pendingLabel="Deleting…"
            destructive
            successMessage="Document deleted."
            onConfirm={deleteTenantDocument.bind(null, doc.id)}
          />
        </li>
      ))}
    </ul>
  );
}
