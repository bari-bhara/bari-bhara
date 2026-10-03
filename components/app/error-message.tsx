"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "./status-message";

/**
 * Body of the error.tsx boundaries. Server errors reach the client as a
 * generic message plus a digest that matches the server log entry.
 */
export function ErrorMessage({
  error,
  retry,
  children,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  /** Extra actions next to "Try again". */
  children?: React.ReactNode;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusMessage
      icon={TriangleAlert}
      title="Something went wrong"
      description="We couldn't load this page. Try again, and if it keeps happening, let us know the reference below."
      reference={error.digest}
    >
      <Button onClick={() => retry()}>Try again</Button>
      {children}
    </StatusMessage>
  );
}
