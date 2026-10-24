import { formatDay, formatMoney, formatMonth } from "@/lib/format";

export type ReminderCharge = {
  typeLabel: string;
  billingMonth: string;
  outstanding: number;
  dueDate: string;
  overdue: boolean;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** A payment reminder listing what's owed. Plain text for in-app, plus HTML for email. */
export function paymentReminder({
  tenantName,
  landlordName,
  currency,
  charges,
  link,
}: {
  tenantName: string;
  landlordName: string;
  currency: string;
  charges: ReminderCharge[];
  link: string;
}) {
  const total = charges.reduce((sum, c) => sum + c.outstanding, 0);
  const anyOverdue = charges.some((c) => c.overdue);
  const totalText = formatMoney(total, currency);
  const firstName = tenantName.split(" ")[0] || tenantName;

  const subject = anyOverdue ? `Payment overdue: ${totalText}` : `Payment reminder: ${totalText} due`;
  const lines = charges.map(
    (c) =>
      `- ${c.typeLabel}, ${formatMonth(c.billingMonth)}: ${formatMoney(c.outstanding, currency)} (due ${formatDay(c.dueDate)}${c.overdue ? ", overdue" : ""})`,
  );
  const text = [
    `Hi ${firstName},`,
    "",
    `This is a reminder from ${landlordName} that ${totalText} is ${anyOverdue ? "overdue" : "due"}:`,
    ...lines,
    "",
    `See the details: ${link}`,
    "If you've already paid, please ignore this message.",
  ].join("\n");

  const html = `<p>Hi ${escapeHtml(firstName)},</p>
<p>This is a reminder from ${escapeHtml(landlordName)} that <strong>${escapeHtml(totalText)}</strong> is ${anyOverdue ? "overdue" : "due"}:</p>
<ul>${charges
    .map(
      (c) =>
        `<li>${escapeHtml(c.typeLabel)}, ${escapeHtml(formatMonth(c.billingMonth))}: <strong>${escapeHtml(formatMoney(c.outstanding, currency))}</strong> (due ${escapeHtml(formatDay(c.dueDate))}${c.overdue ? ", overdue" : ""})</li>`,
    )
    .join("")}</ul>
<p><a href="${escapeHtml(link)}">See the details in Bari Bhara</a></p>
<p style="color:#666">If you've already paid, please ignore this message.</p>`;

  return { subject, text, html };
}

/** Tells a tenant that their rent or a fixed monthly bill changes from a future month. */
export function chargeChange({
  tenantName,
  landlordName,
  currency,
  home,
  typeLabel,
  previousAmount,
  amount,
  effectiveMonth,
  link,
}: {
  tenantName: string;
  landlordName: string;
  currency: string;
  /** "Green View Tower · Unit A1". */
  home: string;
  typeLabel: string;
  /** null when the item is new. */
  previousAmount: number | null;
  /** 0 when the item ends. */
  amount: number;
  /** "YYYY-MM". */
  effectiveMonth: string;
  link: string;
}) {
  const firstName = tenantName.split(" ")[0] || tenantName;
  const month = formatMonth(effectiveMonth);
  const newText = formatMoney(amount, currency);
  const label = typeLabel.toLowerCase();
  const change =
    amount === 0
      ? `your monthly ${label} for ${home} ends from ${month}`
      : previousAmount === null || previousAmount === 0
        ? `a monthly ${label} of ${newText} starts for ${home} from ${month}`
        : `your monthly ${label} for ${home} changes from ${formatMoney(previousAmount, currency)} to ${newText} from ${month}`;
  const subject =
    amount === 0 ? `${typeLabel} ends from ${month}` : `${typeLabel} from ${month}: ${newText}`;
  const text = [
    `Hi ${firstName},`,
    "",
    `${landlordName} has let you know that ${change}.`,
    "",
    `See the details: ${link}`,
  ].join("\n");
  const html = `<p>Hi ${escapeHtml(firstName)},</p>
<p>${escapeHtml(landlordName)} has let you know that ${escapeHtml(change)}.</p>
<p><a href="${escapeHtml(link)}">See the details in Bari Bhara</a></p>`;
  return { subject, text, html };
}

/** Tells the landlord's team that a tenant says they paid. Email only. */
export function paymentClaimSubmitted({
  tenantName,
  home,
  charge,
  amount,
  currency,
  paidOn,
  method,
  note,
  link,
}: {
  tenantName: string;
  home: string;
  /** "Rent, October 2026". */
  charge: string;
  amount: number;
  currency: string;
  paidOn: string;
  method: string;
  note: string;
  link: string;
}) {
  const amountText = formatMoney(amount, currency);
  const subject = `${tenantName} says they paid ${amountText}`;
  const lines = [
    `${tenantName} (${home}) says they paid ${amountText} for ${charge} on ${formatDay(paidOn)} by ${method}.`,
    ...(note ? ["", `Their note: ${note}`] : []),
    "",
    `Review it and record the payment: ${link}`,
  ];
  const html = `<p>${escapeHtml(tenantName)} (${escapeHtml(home)}) says they paid <strong>${escapeHtml(amountText)}</strong> for ${escapeHtml(charge)} on ${escapeHtml(formatDay(paidOn))} by ${escapeHtml(method)}.</p>
${note ? `<p>Their note: ${escapeHtml(note)}</p>` : ""}
<p><a href="${escapeHtml(link)}">Review it in Bari Bhara</a></p>`;
  return { subject, text: lines.join("\n"), html };
}

/** Tells a tenant whether their landlord accepted their "already paid" claim. */
export function paymentClaimReviewed({
  tenantName,
  landlordName,
  approved,
  charge,
  amount,
  currency,
  note,
  link,
}: {
  tenantName: string;
  landlordName: string;
  approved: boolean;
  charge: string;
  amount: number;
  currency: string;
  note: string;
  link: string;
}) {
  const firstName = tenantName.split(" ")[0] || tenantName;
  const amountText = formatMoney(amount, currency);
  const subject = approved
    ? `Payment confirmed: ${amountText} for ${charge}`
    : `Payment not confirmed: ${amountText} for ${charge}`;
  const outcome = approved
    ? `${landlordName} confirmed your payment of ${amountText} for ${charge}.`
    : `${landlordName} couldn't confirm your payment of ${amountText} for ${charge}.`;
  const text = [
    `Hi ${firstName},`,
    "",
    outcome,
    ...(note ? [`Their note: ${note}`] : []),
    "",
    `See the details: ${link}`,
  ].join("\n");
  const html = `<p>Hi ${escapeHtml(firstName)},</p>
<p>${escapeHtml(outcome)}</p>
${note ? `<p>Their note: ${escapeHtml(note)}</p>` : ""}
<p><a href="${escapeHtml(link)}">See the details in Bari Bhara</a></p>`;
  return { subject, text, html };
}
