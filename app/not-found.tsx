import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/app/logo";
import { StatusMessage } from "@/components/app/status-message";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

/** Unmatched URLs, and notFound() outside the app shells. */
export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="flex h-16 items-center border-b bg-background px-4 sm:px-6">
        <Logo />
      </header>
      <main id="main" className="flex-1">
        <StatusMessage
          icon={SearchX}
          title="Page not found"
          description="The link may be broken, or the page may have moved."
        >
          {/* Signed-in users are sent on from / to their dashboard. */}
          <Button asChild>
            <Link href="/">Go to home</Link>
          </Button>
        </StatusMessage>
      </main>
    </div>
  );
}
