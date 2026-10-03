"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assign } from "../actions";

/** Landlord: who's handling it (free text, visible to the tenant). */
export function AssignForm({ requestId, assignedTo }: { requestId: string; assignedTo: string }) {
  const [value, setValue] = useState(assignedTo);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await assign(requestId, { assignedTo: value });
      if (!result.ok) toast.error(result.error);
      else toast.success(value.trim() ? "Assigned." : "Assignment cleared.");
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <Label htmlFor={`assign-${requestId}`}>Assigned to</Label>
      <div className="flex gap-2">
        <Input
          id={`assign-${requestId}`}
          value={value}
          maxLength={120}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. CoolTech Services"
          autoComplete="off"
        />
        <Button type="submit" variant="outline" disabled={pending || value === assignedTo}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">The tenant can see this.</p>
    </form>
  );
}
