"use server";

import { redirect } from "next/navigation";
import { GENERIC_ERROR, fail, invalid, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { joinSchema, type JoinInput } from "./schema";

const CLAIM_MESSAGES: Record<string, string> = {
  invalid:
    "That code didn't work. Check it with your landlord: codes expire after 7 days and work once.",
  locked: "Too many wrong codes. Please wait 24 hours, or ask your landlord for help.",
  already_linked: "You're already connected to this landlord.",
  not_tenant: "Only tenant accounts can use invite codes.",
};

/** Links the tenant's login to their tenant record via an invite code. */
export async function claimInvite(input: JoinInput): Promise<ActionResult> {
  await requireRole("tenant");
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data: status, error } = await supabase.rpc("claim_tenant_invite", {
    p_code: parsed.data.code,
  });

  if (error) {
    console.error("Claim invite failed", error);
    return fail(GENERIC_ERROR);
  }
  if (status !== "linked") return fail(CLAIM_MESSAGES[status] ?? GENERIC_ERROR);
  redirect("/tenant/dashboard");
}
