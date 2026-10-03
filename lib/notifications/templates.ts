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
<p><a href="${escapeHtml(link)}">See the details in Bari_bhara</a></p>
<p style="color:#666">If you've already paid, please ignore this message.</p>`;

  return { subject, text, html };
}
