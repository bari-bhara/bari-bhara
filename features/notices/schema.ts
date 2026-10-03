import { z } from "zod";
import type { NoticeAudience, NoticeOverview } from "@/types/domain";

export const AUDIENCE_LABELS: Record<NoticeAudience, string> = {
  all: "All tenants",
  property: "One property",
  units: "Specific units",
};

/** "" or a <input type="datetime-local"> value. */
const localDateTime = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/, "Enter a valid date and time.");

export const noticeSchema = z
  .object({
    title: z.string().trim().min(1, "Give the notice a title.").max(150, "Use 150 characters or fewer."),
    body: z.string().trim().min(1, "Write the notice.").max(5000, "Use 5000 characters or fewer."),
    audience: z.enum(["all", "property", "units"]),
    propertyId: z.string(),
    unitIds: z.array(z.string()),
    publishAt: localDateTime,
    expiresAt: localDateTime,
  })
  .superRefine((value, ctx) => {
    if (value.audience === "property" && !value.propertyId) {
      ctx.addIssue({ code: "custom", path: ["propertyId"], message: "Choose a property." });
    }
    if (value.audience === "units" && value.unitIds.length === 0) {
      ctx.addIssue({ code: "custom", path: ["unitIds"], message: "Choose at least one unit." });
    }
    // Same format, so text comparison orders them; "" publish means now.
    if (value.expiresAt && value.publishAt && value.expiresAt <= value.publishAt) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "The end must be after the start." });
    }
  });
export type NoticeInput = z.infer<typeof noticeSchema>;

export type NoticeState = "scheduled" | "live" | "expired";

export function noticeState(notice: { publish_at: string; expires_at: string | null }, now = new Date()): NoticeState {
  if (new Date(notice.publish_at) > now) return "scheduled";
  if (notice.expires_at && new Date(notice.expires_at) <= now) return "expired";
  return "live";
}

/** "All tenants", the property's name, or "3 units". */
export function audienceSummary(notice: Pick<NoticeOverview, "audience" | "property_name" | "unit_count">) {
  if (notice.audience === "property") return notice.property_name ?? "One property";
  if (notice.audience === "units") return `${notice.unit_count} ${notice.unit_count === 1 ? "unit" : "units"}`;
  return "All tenants";
}
