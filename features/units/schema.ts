import { z } from "zod";
import {
  id,
  money,
  optionalText,
  optionalWholeNumber,
  requiredText,
} from "@/lib/zod-fields";
import type { UnitStatus } from "@/types/domain";

export const UNIT_STATUS_LABELS: Record<UnitStatus, string> = {
  vacant: "Vacant",
  occupied: "Occupied",
  maintenance: "Under maintenance",
  inactive: "Inactive",
};

export const UNIT_STATUSES = Object.keys(UNIT_STATUS_LABELS) as UnitStatus[];

/**
 * Statuses a landlord can set by hand. "occupied" follows active tenancies
 * (Phase 3 occupancy trigger), so it is never chosen in a form.
 */
export const EDITABLE_UNIT_STATUSES = ["vacant", "maintenance", "inactive"] as const;

/** Why a status change isn't allowed by hand, or null if it is. */
export function statusChangeError(current: UnitStatus | null, next: UnitStatus) {
  if (current === next) return null;
  if (next === "occupied") {
    return "A unit becomes occupied when a tenant moves in.";
  }
  if (current === "occupied") {
    return "An occupied unit becomes vacant when its tenant moves out.";
  }
  return null;
}

export function isUnitStatus(value: unknown): value is UnitStatus {
  return typeof value === "string" && (UNIT_STATUSES as string[]).includes(value);
}

export const unitSchema = z.object({
  unitNumber: requiredText(20, "Enter a unit number, e.g. A1 or 302."),
  floor: optionalText(20),
  unitType: optionalText(40),
  bedrooms: optionalWholeNumber(0, 20, "Enter a number from 0 to 20."),
  defaultRent: money(),
  // Any status parses; the actions reject hand-set changes to or from "occupied".
  status: z.enum(UNIT_STATUSES as [UnitStatus, ...UnitStatus[]], "Choose a status."),
  notes: optionalText(1000),
});
export type UnitFormValues = z.input<typeof unitSchema>;
export type UnitInput = z.output<typeof unitSchema>;

export const createUnitSchema = unitSchema.extend({
  propertyId: z.string().min(1, "Choose a property.").pipe(id),
});
export type CreateUnitInput = z.output<typeof createUnitSchema>;
export type CreateUnitFormValues = z.input<typeof createUnitSchema>;

export const EMPTY_UNIT: UnitFormValues = {
  unitNumber: "",
  floor: "",
  unitType: "",
  bedrooms: "",
  defaultRent: "",
  status: "vacant",
  notes: "",
};
