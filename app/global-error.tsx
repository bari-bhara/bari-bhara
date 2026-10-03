"use client";

import "./globals.css";
import { ErrorMessage } from "@/components/app/error-message";

/** Errors in the root layout itself. Replaces it, so it renders <html> and <body>. */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-svh bg-background font-sans text-foreground antialiased">
        <main id="main">
          <ErrorMessage error={error} retry={retry} />
        </main>
      </body>
    </html>
  );
}
