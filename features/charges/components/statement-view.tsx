import { formatDay, formatMoney, formatMonth } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "../schema";
import type { StatementMonth } from "../statement";
import { ChargeStatusBadge } from "./charge-status-badge";

/** Month-by-month breakdown: each charge, what was paid against it, and what's left. */
export function StatementView({ months, currency }: { months: StatementMonth[]; currency: string }) {
  if (months.length === 0) {
    return <p className="text-sm text-muted-foreground">No charges yet.</p>;
  }
  return (
    <div className="grid gap-4">
      {months.map((month) => (
        <section key={month.month} aria-label={`Statement for ${formatMonth(month.month)}`} className="grid gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">{formatMonth(month.month)}</h3>
            <p className="text-sm text-muted-foreground tabular-nums">
              Billed {formatMoney(month.billed, currency)} · Paid {formatMoney(month.paid, currency)}
              {month.outstanding > 0 && ` · Due ${formatMoney(month.outstanding, currency)}`}
            </p>
          </div>
          <ul className="divide-y rounded-xl border">
            {month.lines.map((line) => (
              <li key={line.id} className="grid gap-1 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {line.label}
                    <ChargeStatusBadge status={line.status} />
                  </span>
                  <span className="tabular-nums">{formatMoney(line.amount, currency)}</span>
                </div>
                {line.meter && (
                  <p className="text-xs text-muted-foreground">
                    Meter {line.meter.previous} → {line.meter.current}:{" "}
                    {Math.round((line.meter.current - line.meter.previous) * 100) / 100} units ×{" "}
                    {formatMoney(line.meter.rate, currency)}
                  </p>
                )}
                {line.payments.map((payment) => (
                  <p key={payment.id} className="flex justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      Paid {formatDay(payment.paid_on)} · {PAYMENT_METHOD_LABELS[payment.method]}
                      {payment.reference && ` · ${payment.reference}`}
                    </span>
                    <span className="tabular-nums">−{formatMoney(payment.amount, currency)}</span>
                  </p>
                ))}
                {line.outstanding > 0 && line.paid > 0 && (
                  <p className="flex justify-between gap-2 text-xs font-medium">
                    <span>Still due</span>
                    <span className="tabular-nums">{formatMoney(line.outstanding, currency)}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
