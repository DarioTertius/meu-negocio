"use server";

import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";

export type TeamState = { error?: string; ok?: string };

export async function inviteMember(_: TeamState, formData: FormData): Promise<TeamState> {
  const { supabase, orgId } = await requireOrg();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "seller");
  if (!email) return { error: "Informe o e-mail." };

  const { error } = await supabase.rpc("create_invite", {
    p_org: orgId,
    p_email: email,
    p_role: role,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/equipe");
  return {
    ok: `Convite criado. Peça para ${email} criar uma conta no sistema com esse mesmo e-mail — ao entrar, já cai na sua empresa.`,
  };
}

export async function revokeInvite(formData: FormData) {
  const { supabase, orgId } = await requireOrg();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("invites").delete().eq("id", id).eq("organization_id", orgId);
  revalidatePath("/app/equipe");
}

export async function removeMember(_: TeamState, formData: FormData): Promise<TeamState> {
  const { supabase, orgId } = await requireOrg();
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return {};

  const { error } = await supabase.rpc("remove_member", { p_org: orgId, p_user: userId });
  if (error) return { error: error.message };
  revalidatePath("/app/equipe");
  return {};
}

export async function changeRole(_: TeamState, formData: FormData): Promise<TeamState> {
  const { supabase, orgId } = await requireOrg();
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId || !role) return {};

  const { error } = await supabase.rpc("set_member_role", {
    p_org: orgId,
    p_user: userId,
    p_role: role,
  });
  if (error) return { error: error.message };
  revalidatePath("/app/equipe");
  return {};
}
