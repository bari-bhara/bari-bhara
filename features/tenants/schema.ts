import { z } from "zod";
import {
  id,
  isoDate,
  money,
  optionalEmail,
  optionalPhone,
  optionalText,
  requiredText,
} from "@/lib/zod-fields";

const tenantDetails = {
  fullName: requiredText(120, "Enter the tenant's full name."),
  phone: optionalPhone,
  email: optionalEmail,
  notes: optionalText(1000),
};

const tenancyTerms = {
  unitId: z.string().min(1, "Choose a unit.").pipe(id),
  monthlyRent: money(),
  securityDeposit: money(),
  moveInDate: isoDate("Enter the move-in date."),
};

/** Edit a tenant's details. */
export const tenantSchema = z.object(tenantDetails);
export type TenantFormValues = z.input<typeof tenantSchema>;
export type TenantInput = z.output<typeof tenantSchema>;

/** Add a tenant together with their first tenancy. */
export const addTenantSchema = z.object({ ...tenantDetails, ...tenancyTerms });
export type AddTenantFormValues = z.input<typeof addTenantSchema>;
export type AddTenantInput = z.output<typeof addTenantSchema>;

/** Start a new tenancy for an existing tenant. */
export const moveInSchema = z.object(tenancyTerms);
export type MoveInFormValues = z.input<typeof moveInSchema>;
export type MoveInInput = z.output<typeof moveInSchema>;

/** The tenancy fields shared by the add-tenant and move-in forms. */
export type TenancyTermsFormValues = MoveInFormValues;

export const MOVE_OUT_REASONS = [
  "Lease ended",
  "Moved to another unit",
  "Moved away",
  "Non-payment",
  "Other",
] as const;

export const moveOutSchema = z.object({
  moveOutDate: isoDate("Enter the move-out date."),
  reason: z.enum(MOVE_OUT_REASONS, "Choose a reason."),
  notes: optionalText(1000),
});
export type MoveOutFormValues = z.input<typeof moveOutSchema>;

export const EMPTY_TENANT: TenantFormValues = {
  fullName: "",
  phone: "",
  email: "",
  notes: "",
};

/** Filters for the tenant list, parsed leniently from the URL. */
export const TENANT_LIST_STATUSES = ["current", "past", "all"] as const;
export type TenantListStatus = (typeof TENANT_LIST_STATUSES)[number];

export const TENANT_LIST_SORTS = {
  name: "Name",
  newest: "Recently added",
  move_in: "Move-in date",
} as const;
export type TenantListSort = keyof typeof TENANT_LIST_SORTS;
