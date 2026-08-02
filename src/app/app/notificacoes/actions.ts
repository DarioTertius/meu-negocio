"use server";

import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";

export async function markAllRead() {
  const { supabase, orgId } = await requireOrg();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("organization_id", orgId)
    .eq("read", false);
  revalidatePath("/app", "layout");
  revalidatePath("/app/notificacoes");
}
