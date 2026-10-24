"use client";

import { FileUp, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { documentProblem } from "../documents";
import { DOCUMENT_LIMITS, TENANT_DOCUMENT_KINDS, type TenantDocumentKind } from "../schema";

export type PendingDocument = { kind: TenantDocumentKind; file: File };

/** Pick an ID document type and file. Controlled; nothing uploads until the form is submitted. */
export function DocumentFields({
  value,
  onChange,
}: {
  value: PendingDocument | null;
  onChange: (value: PendingDocument | null) => void;
}) {
  const inputId = useId();
  const kindId = useId();
  const [kind, setKind] = useState<TenantDocumentKind>(value?.kind ?? "nid");
  const [problem, setProblem] = useState<string | null>(null);

  function pick(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    const issue = documentProblem(file);
    setProblem(issue);
    if (!issue) onChange({ kind, file });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2">
        <label htmlFor={kindId} className="text-sm font-medium leading-none">
          Document type
        </label>
        <Select
          value={kind}
          onValueChange={(next) => {
            setKind(next as TenantDocumentKind);
            if (value) onChange({ ...value, kind: next as TenantDocumentKind });
          }}
        >
          <SelectTrigger id={kindId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TENANT_DOCUMENT_KINDS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <span className="text-sm font-medium leading-none">File</span>
        {value ? (
          <div className="flex h-11 items-center gap-2 rounded-lg border px-3 text-sm">
            <span className="min-w-0 flex-1 truncate">{value.file.name}</span>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-accent"
              aria-label={`Remove ${value.file.name}`}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <div>
            <Button asChild variant="outline" className="h-11">
              <label htmlFor={inputId} className="cursor-pointer">
                <FileUp aria-hidden /> Choose file
              </label>
            </Button>
            <input
              id={inputId}
              type="file"
              accept={DOCUMENT_LIMITS.types.join(",")}
              className="sr-only"
              onChange={(e) => {
                pick(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground sm:col-span-2">
        A photo or scan of the NID, birth registration certificate or passport (JPEG, PNG, WebP or PDF,
        up to 5 MB). Only you can see it.
      </p>
      {problem && (
        <p role="alert" className="text-sm font-medium text-destructive sm:col-span-2">
          {problem}
        </p>
      )}
    </div>
  );
}
