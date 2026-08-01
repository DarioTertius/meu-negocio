"use server";

import { requireOrg } from "@/lib/org";
import { revalidatePath } from "next/cache";

export type OrgState = { error?: string; ok?: boolean };

export async function updateOrganization(_: OrgState, formData: FormData): Promise<OrgState> {
  const { supabase, orgId, user, role } = await requireOrg();
  if (role !== "owner" && role !== "admin")
    return { error: "Apenas o dono ou administrador pode alterar os dados da empresa." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome da empresa." };

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      business_type: String(formData.get("business_type") ?? "").trim() || null,
      tracks_stock: formData.get("tracks_stock") === "on",
    })
    .eq("id", orgId);
  if (error) return { error: "Não foi possível salvar. " + error.message };

  await supabase.from("audit_logs").insert({
    organization_id: orgId, user_id: user.id, action: "update", entity: "organization", entity_id: orgId,
  });
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function saveBranding(input: {
  brand_color: string | null;
  logo_url: string | null;
}): Promise<OrgState> {
  const { supabase, orgId, user, role } = await requireOrg();
  if (role !== "owner" && role !== "admin")
    return { error: "Apenas o dono ou administrador pode alterar a aparência." };

  const color =
    input.brand_color && /^#[0-9a-fA-F]{6}$/.test(input.brand_color) ? input.brand_color : null;

  const { error } = await supabase
    .from("organizations")
    .update({ brand_color: color, logo_url: input.logo_url })
    .eq("id", orgId);
  if (error) return { error: "Não foi possível salvar. " + error.message };

  await supabase.from("audit_logs").insert({
    organization_id: orgId, user_id: user.id, action: "update_branding",
    entity: "organization", entity_id: orgId,
  });
  revalidatePath("/app", "layout");
  return { ok: true };
}
