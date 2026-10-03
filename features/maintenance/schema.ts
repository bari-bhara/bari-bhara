import { z } from "zod";
import { id, optionalText } from "@/lib/zod-fields";
import type { MaintenanceCategory, MaintenanceStatus } from "@/types/domain";

export const CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  air_conditioning: "Air conditioning",
  water: "Water supply",
  door_lock: "Door or lock",
  internet: "Internet",
  appliance: "Appliance",
  other: "Other",
};
export const CATEGORIES = Object.keys(CATEGORY_LABELS) as MaintenanceCategory[];

export const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  pending: "Pending",
  in_progress: "In progress",
  resolved: "Resolved",
  cancelled: "Cancelled",
};
export const STATUSES = Object.keys(STATUS_LABELS) as MaintenanceStatus[];

export function isMaintenanceStatus(value: unknown): value is MaintenanceStatus {
  return typeof value === "string" && (STATUSES as string[]).includes(value);
}
export function isCategory(value: unknown): value is MaintenanceCategory {
  return typeof value === "string" && (CATEGORIES as string[]).includes(value);
}

/** Photos: checked in the browser before upload; the bucket enforces the same limits. */
export const PHOTO_LIMITS = {
  maxCount: 6,
  maxBytes: 5 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp"],
} as const;

const issue = {
  category: z.enum(CATEGORIES as [MaintenanceCategory, ...MaintenanceCategory[]], "Choose a category."),
  title: z
    .string()
    .trim()
    .min(3, "Describe the problem in a few words.")
    .max(120, "Use 120 characters or fewer."),
  description: optionalText(2000),
};

export const tenantRequestSchema = z.object({
  tenancyId: z.string().min(1, "Choose your home.").pipe(id),
  ...issue,
});
export type TenantRequestInput = z.infer<typeof tenantRequestSchema>;

export const landlordRequestSchema = z.object({
  unitId: z.string().min(1, "Choose a unit.").pipe(id),
  ...issue,
});
export type LandlordRequestInput = z.infer<typeof landlordRequestSchema>;

export const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a message.").max(2000, "Use 2000 characters or fewer."),
  isInternal: z.boolean(),
});
export type CommentInput = z.infer<typeof commentSchema>;

export const statusChangeSchema = z.object({
  status: z.enum(STATUSES as [MaintenanceStatus, ...MaintenanceStatus[]], "Choose a status."),
  note: optionalText(2000),
  noteIsInternal: z.boolean(),
});
export type StatusChangeInput = z.infer<typeof statusChangeSchema>;

export const assignSchema = z.object({ assignedTo: optionalText(120) });
export type AssignInput = z.infer<typeof assignSchema>;

/** Open = still needs attention. */
export const OPEN_STATUSES: MaintenanceStatus[] = ["pending", "in_progress"];
