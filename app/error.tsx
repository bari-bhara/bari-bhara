"use client";

import Link from "next/link";
import { ErrorMessage } from "@/components/app/error-message";
import { Button } from "@/components/ui/button";

/** Errors outside the app shells (sign-in pages, the home page). */
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main id="main" className="min-h-svh bg-muted/30">
      <ErrorMessage error={error} retry={retry}>
        <Button asChild variant="outline">
          <Link href="/">Go to home</Link>
        </Button>
      </ErrorMessage>
    </main>
  );
}
