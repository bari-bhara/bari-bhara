"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/app/form-error";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { applyFieldErrors } from "@/lib/forms";
import { claimInvite } from "../actions";
import { joinSchema, type JoinInput } from "../schema";

export function JoinForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<JoinInput>({
    resolver: zodResolver(joinSchema),
    defaultValues: { code: "" },
  });

  async function onSubmit(values: JoinInput) {
    setFormError(null);
    const result = await claimInvite(values);
    if (result && !result.ok) {
      setFormError(result.error);
      applyFieldErrors(form, result.fieldErrors);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
        <FormError message={formError} />
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Invite code</FormLabel>
              <FormControl>
                <Input
                  autoComplete="one-time-code"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="ABCDE-12345"
                  className="font-mono uppercase tracking-widest"
                  {...field}
                />
              </FormControl>
              <FormDescription>Your landlord can create one for you in Bari_bhara.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="h-11 w-full sm:w-auto" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Connecting…" : "Connect"}
        </Button>
      </form>
    </Form>
  );
}
