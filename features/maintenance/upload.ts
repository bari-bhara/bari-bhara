import { createClient } from "@/lib/supabase/client";
import { PHOTO_LIMITS } from "./schema";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Why these files can't be added, or null. Mirrors the bucket's limits. */
export function photoProblem(files: File[], alreadyAttached = 0): string | null {
  if (files.length + alreadyAttached > PHOTO_LIMITS.maxCount) {
    return `You can attach up to ${PHOTO_LIMITS.maxCount} photos.`;
  }
  for (const file of files) {
    if (!(PHOTO_LIMITS.types as readonly string[]).includes(file.type)) {
      return `${file.name} isn't a JPEG, PNG or WebP image.`;
    }
    if (file.size > PHOTO_LIMITS.maxBytes) {
      return `${file.name} is larger than 5 MB.`;
    }
  }
  return null;
}

/**
 * Uploads photos from the browser straight to the private bucket at
 * `{orgId}/{requestId}/{uuid}.{ext}` (storage policies check the path), so
 * large files never pass through a Server Action. Returns the stored paths.
 */
export async function uploadPhotos(orgId: string, requestId: string, files: File[]) {
  const supabase = createClient();
  const paths: string[] = [];
  let failed = 0;
  for (const file of files) {
    const path = `${orgId}/${requestId}/${crypto.randomUUID()}.${EXTENSIONS[file.type] ?? "jpg"}`;
    const { error } = await supabase.storage
      .from("maintenance-photos")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      console.error("Photo upload failed", error);
      failed += 1;
    } else {
      paths.push(path);
    }
  }
  return { paths, failed };
}
