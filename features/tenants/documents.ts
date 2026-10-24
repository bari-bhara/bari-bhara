import { createClient } from "@/lib/supabase/client";
import { DOCUMENT_LIMITS } from "./schema";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Why this file can't be added, or null. Mirrors the bucket's limits. */
export function documentProblem(file: File): string | null {
  if (!(DOCUMENT_LIMITS.types as readonly string[]).includes(file.type)) {
    return `${file.name} isn't a JPEG, PNG, WebP image or a PDF.`;
  }
  if (file.size > DOCUMENT_LIMITS.maxBytes) return `${file.name} is larger than 5 MB.`;
  return null;
}

/**
 * Uploads an ID document from the browser straight to the private bucket at
 * `{orgId}/{tenantId}/{uuid}.{ext}` (storage policies check the path).
 * Returns the stored path, or null if the upload failed.
 */
export async function uploadTenantDocument(orgId: string, tenantId: string, file: File) {
  const supabase = createClient();
  const path = `${orgId}/${tenantId}/${crypto.randomUUID()}.${EXTENSIONS[file.type] ?? "bin"}`;
  const { error } = await supabase.storage
    .from("tenant-documents")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("Document upload failed", error);
    return null;
  }
  return path;
}
