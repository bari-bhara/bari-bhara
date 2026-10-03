"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { applyFieldErrors } from "@/lib/forms";
import { createTenantRequest, registerPhotos } from "../actions";
import { tenantRequestSchema, type TenantRequestInput } from "../schema";
import { uploadPhotos } from "../upload";
import { IssueFields } from "./issue-fields";
import { PhotoPicker } from "./photo-picker";

/**
 * Report a problem. The request is created first; photos then upload from the
 * browser to Storage and are recorded, so a failed photo never loses the report.
 */
export function TenantRequestForm({ homes }: { homes: { tenancyId: string; label: string }[] }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [stage, setStage] = useState<"idle" | "saving" | "uploading">("idle");
  const form = useForm<TenantRequestInput>({
    resolver: zodResolver(tenantRequestSchema),
    defaultValues: {
      tenancyId: homes.length === 1 ? homes[0].tenancyId : "",
      category: undefined as unknown as TenantRequestInput["category"],
      title: "",
      description: "",
    },
  });

  async function onSubmit(values: TenantRequestInput) {
    setFormError(null);
    setStage("saving");
    const result = await createTenantRequest(values);
    if (!result.ok) {
      setStage("idle");
      setFormError(result.error);
      applyFieldErrors(form, result.fieldErrors);
      return;
    }

    const { requestId, orgId } = result.data;
    if (photos.length > 0) {
      setStage("uploading");
      const { paths, failed } = await uploadPhotos(orgId, requestId, photos);
      const registered = paths.length > 0 ? await registerPhotos(requestId, paths) : null;
      if (failed > 0 || (registered && !registered.ok)) {
        toast.error("Your request was sent, but some photos didn't upload. You can add them again.");
      }
    }
    toast.success("Request sent to your landlord.");
    router.push(`/tenant/maintenance/${requestId}`);
  }

  const busy = stage !== "idle";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-2xl gap-5" noValidate>
        <FormError message={formError} />
        {homes.length > 1 && (
          <FormField
            control={form.control}
            name="tenancyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Home</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Which home?" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {homes.map((home) => (
                      <SelectItem key={home.tenancyId} value={home.tenancyId}>
                        {home.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <IssueFields />
        <PhotoPicker files={photos} onChange={setPhotos} />
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button asChild variant="outline" className="h-11 sm:h-10">
            <Link href="/tenant/maintenance">Cancel</Link>
          </Button>
          <Button type="submit" className="h-11 sm:h-10" disabled={busy}>
            {stage === "saving" ? "Sending…" : stage === "uploading" ? "Uploading photos…" : "Send request"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
