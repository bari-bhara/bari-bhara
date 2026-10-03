import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Cancel + submit row shared by the tenant forms. */
export function FormActions({
  cancelHref,
  submitting,
  submitLabel,
}: {
  cancelHref: string;
  submitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      <Button asChild variant="outline" className="h-11 sm:h-10">
        <Link href={cancelHref}>Cancel</Link>
      </Button>
      <Button type="submit" className="h-11 sm:h-10" disabled={submitting}>
        {submitting ? "Saving…" : submitLabel}
      </Button>
    </div>
  );
}
