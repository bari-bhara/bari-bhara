import { BellRing } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/app/empty-state";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { MarkAllRead } from "@/features/notifications/components/mark-all-read";
import { listMyNotifications } from "@/features/notifications/queries";
import { getMyTenancies } from "@/features/tenant-portal/queries";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reminders" };

export default async function TenantNotificationsPage() {
  const [notifications, tenancies] = await Promise.all([listMyNotifications(), getMyTenancies()]);
  const unread = notifications.filter((n) => n.read_at === null).length;

  return (
    <>
      <MarkAllRead unread={unread} />
      <PageHeader title="Reminders" description="Payment reminders from your landlord." />
      {notifications.length === 0 ? (
        <EmptyState icon={BellRing} title="No reminders" description="Payment reminders from your landlord will appear here." />
      ) : (
        <ul className="grid max-w-3xl grid-cols-1 gap-3" aria-label="Reminders">
          {notifications.map((n) => (
            <li key={n.id}>
              <Card className={cn(n.read_at === null && "border-primary/40")}>
                <CardContent className="grid gap-2 pt-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">
                      {n.subject}
                      {n.read_at === null && <span className="sr-only"> (new)</span>}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(n.created_at, tenancies[0]?.timezone)}
                    </span>
                  </div>
                  {/* The message is plain text built by the server; links point to the rent page instead. */}
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {n.message.replace(/\n*See the details: .*$/m, "")}
                  </p>
                  <Link href="/tenant/rent" className="text-sm font-medium underline underline-offset-4">
                    See my rent and bills
                  </Link>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
