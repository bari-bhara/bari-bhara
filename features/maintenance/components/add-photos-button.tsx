"use client";

import { ImagePlus } from "lucide-react";
import { useId, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { registerPhotos } from "../actions";
import { PHOTO_LIMITS } from "../schema";
import { photoProblem, uploadPhotos } from "../upload";

/** Uploads photos to an existing request, then records them. */
export function AddPhotosButton({
  orgId,
  requestId,
  attached,
}: {
  orgId: string;
  requestId: string;
  attached: number;
}) {
  const inputId = useId();
  const [pending, startTransition] = useTransition();
  if (attached >= PHOTO_LIMITS.maxCount) return null;

  function add(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    const problem = photoProblem(files, attached);
    if (problem) {
      toast.error(problem);
      return;
    }
    startTransition(async () => {
      const { paths, failed } = await uploadPhotos(orgId, requestId, files);
      if (paths.length > 0) {
        const result = await registerPhotos(requestId, paths);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
      }
      if (failed > 0) toast.error(`${failed} photo${failed === 1 ? "" : "s"} couldn't be uploaded.`);
      else toast.success(paths.length === 1 ? "Photo added." : "Photos added.");
    });
  }

  return (
    <div>
      <Button asChild variant="outline" size="sm" disabled={pending}>
        <label htmlFor={inputId} className="cursor-pointer" aria-disabled={pending}>
          <ImagePlus aria-hidden /> {pending ? "Uploading…" : "Add photos"}
        </label>
      </Button>
      <input
        id={inputId}
        type="file"
        accept={PHOTO_LIMITS.types.join(",")}
        multiple
        className="sr-only"
        disabled={pending}
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
