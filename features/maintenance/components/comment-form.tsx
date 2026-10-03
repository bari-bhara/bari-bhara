"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addComment } from "../actions";

/** Post a comment. Landlords can mark it as an internal note. */
export function CommentForm({ requestId, allowInternal }: { requestId: string; allowInternal: boolean }) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) {
      setError("Write a message.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addComment(requestId, { body, isInternal });
      if (!result.ok) {
        setError(result.fieldErrors?.body?.[0] ?? result.error);
        return;
      }
      setBody("");
      setIsInternal(false);
      toast.success(isInternal ? "Internal note added." : "Comment posted.");
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <Label htmlFor={`comment-${requestId}`}>{allowInternal ? "Add a comment or note" : "Add a comment"}</Label>
      <Textarea
        id={`comment-${requestId}`}
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `comment-${requestId}-error` : undefined}
      />
      {error && (
        <p id={`comment-${requestId}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {allowInternal ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isInternal} onCheckedChange={(v) => setIsInternal(v === true)} />
            Internal note (hidden from the tenant)
          </label>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Posting…" : isInternal ? "Add note" : "Post comment"}
        </Button>
      </div>
    </form>
  );
}
