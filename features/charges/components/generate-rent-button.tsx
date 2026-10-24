"use client";

import { CalendarPlus } from "lucide-react";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { Button } from "@/components/ui/button";
import { generateRent } from "../actions";

export function GenerateRentButton({ month, monthLabel }: { month: string; monthLabel: string }) {
  return (
    <ConfirmDialog<{ created: number }>
      trigger={
        <Button>
          <CalendarPlus aria-hidden /> Generate rent
        </Button>
      }
      title={`Generate rent for ${monthLabel}?`}
      description="Creates rent and fixed monthly bills for every current tenant who doesn't have them for this month yet, due on each property's rent day. This happens automatically on the 1st; use it for earlier months or after voiding a charge. Safe to run again."
      confirmLabel="Generate rent"
      pendingLabel="Generating…"
      successMessage={({ created }) =>
        created === 0
          ? "Everyone already has rent for this month."
          : `Created ${created} ${created === 1 ? "charge" : "charges"}.`
      }
      onConfirm={() => generateRent(month)}
    />
  );
}
