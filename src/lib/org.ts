import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/** Retorna usuário + organização ativa. Redireciona se faltar auth/onboarding. */
export async function requireOrg() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(id, name, business_type, tracks_stock)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  const org = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  return { supabase, user, orgId: membership.organization_id as string, role: membership.role as string, org };
}
