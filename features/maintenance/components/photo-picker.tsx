"use client";

import { ImagePlus, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PHOTO_LIMITS } from "../schema";
import { photoProblem } from "../upload";

/** Choose photos before submitting a form; shows previews and limits. */
export function PhotoPicker({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  const inputId = useId();
  const [problem, setProblem] = useState<string | null>(null);
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  function add(list: FileList | null) {
    const picked = Array.from(list ?? []);
    const issue = photoProblem(picked, files.length);
    setProblem(issue);
    if (!issue) onChange([...files, ...picked]);
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">Photos (optional)</span>
      {files.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Selected photos">
          {files.map((file, i) => (
            <li key={`${file.name}-${i}`} className="relative aspect-square overflow-hidden rounded-md border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previews[i]} alt={file.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 shadow"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length < PHOTO_LIMITS.maxCount && (
        <div>
          <Button asChild variant="outline">
            <label htmlFor={inputId} className="cursor-pointer">
              <ImagePlus aria-hidden /> Add photos
            </label>
          </Button>
          <input
            id={inputId}
            type="file"
            accept={PHOTO_LIMITS.types.join(",")}
            multiple
            className="sr-only"
            onChange={(e) => {
              add(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Up to {PHOTO_LIMITS.maxCount} photos, 5 MB each (JPEG, PNG or WebP).
      </p>
      {problem && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {problem}
        </p>
      )}
    </div>
  );
}
