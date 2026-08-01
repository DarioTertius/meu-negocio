"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type State = { error?: string };

export async function createOrganization(_: State, formData: FormData): Promise<State> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const businessType = String(formData.get("business_type") ?? "").trim();
  const tracksStock = formData.get("tracks_stock") === "sim";
  if (!name) return { error: "Informe o nome da empresa." };

  const { error } = await supabase.rpc("create_organization", {
    p_name: name,
    p_business_type: businessType || null,
    p_tracks_stock: tracksStock,
  });
  if (error) return { error: "Não foi possível criar a empresa. " + error.message };

  redirect("/app/produtos/novo?onboarding=1");
}
