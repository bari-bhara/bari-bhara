"use client";

import { updateAccount, updateBusiness } from "../actions";
import { accountSchema, businessSchema, type AccountInput, type BusinessInput } from "../schema";
import { EditDetailsDialog } from "./edit-details-dialog";

export function EditAccountDialog({ defaultValues }: { defaultValues: AccountInput }) {
  return (
    <EditDetailsDialog
      title="Account details"
      description="Your name and phone number."
      triggerLabel="Edit account details"
      schema={accountSchema}
      defaultValues={defaultValues}
      action={updateAccount}
      fields={[
        { name: "fullName", label: "Name", autoComplete: "name" },
        { name: "phone", label: "Phone (optional)", type: "tel", autoComplete: "tel" },
      ]}
    />
  );
}

export function EditBusinessDialog({ defaultValues }: { defaultValues: BusinessInput }) {
  return (
    <EditDetailsDialog
      title="Business details"
      description="The name tenants see on their home and reminders."
      triggerLabel="Edit business details"
      schema={businessSchema}
      defaultValues={defaultValues}
      action={updateBusiness}
      fields={[{ name: "name", label: "Business name", autoComplete: "organization" }]}
    />
  );
}
