"use client";

import { useState } from "react";
import { RowActions } from "@/components/app/row-actions";
import { RecordPaymentDialog } from "./record-payment-dialog";

/** The ⋯ menu on a rent or bill row: open it, or record a payment in place. */
export function ChargeRowActions({
  label,
  href,
  chargeId,
  outstanding,
  outstandingLabel,
  currency,
  today,
  className,
}: {
  label: string;
  href: string;
  chargeId: string;
  /** 0 for paid or void charges: no "Record payment". */
  outstanding: number;
  outstandingLabel: string;
  currency: string;
  today: string;
  className?: string;
}) {
  const [paying, setPaying] = useState(false);
  return (
    <>
      <RowActions
        label={label}
        className={className}
        actions={[
          { label: "View", href },
          ...(outstanding > 0 ? [{ label: "Record payment", onSelect: () => setPaying(true) }] : []),
        ]}
      />
      {paying && (
        <RecordPaymentDialog
          chargeId={chargeId}
          outstanding={outstanding}
          outstandingLabel={outstandingLabel}
          currency={currency}
          today={today}
          defaultOpen
          showTrigger={false}
          onClosed={() => setPaying(false)}
        />
      )}
    </>
  );
}
