"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { MaintenanceStatus } from "@/types/domain";
import { changeStatus } from "../actions";
import { STATUSES, STATUS_LABELS } from "../schema";

/** Landlord: change status, optionally with a note for the timeline. */
export function StatusForm({ requestId, status }: { requestId: string; status: MaintenanceStatus }) {
  const [next, setNext] = useState<MaintenanceStatus>(status);
  const [note, setNote] = useState("");
  const [noteIsInternal, setNoteIsInternal] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await changeStatus(requestId, { status: next, note, noteIsInternal });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setNote("");
      setNoteIsInternal(false);
      toast.success(`Marked ${STATUS_LABELS[next].toLowerCase()}.`);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <div className="grid gap-2">
        <Label htmlFor={`status-${requestId}`}>Status</Label>
        <Select value={next} onValueChange={(v) => setNext(v as MaintenanceStatus)}>
          <SelectTrigger id={`status-${requestId}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`status-note-${requestId}`}>Note (optional)</Label>
        <Textarea
          id={`status-note-${requestId}`}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Plumber booked for Tuesday"
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={noteIsInternal} onCheckedChange={(v) => setNoteIsInternal(v === true)} />
          Keep the note internal
        </label>
      </div>
      <div>
        <Button type="submit" disabled={pending || (next === status && !note.trim())}>
          {pending ? "Saving…" : "Update status"}
        </Button>
      </div>
    </form>
  );
}
