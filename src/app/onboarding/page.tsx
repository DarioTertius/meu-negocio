import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Se o e-mail tem convites pendentes, entra direto na empresa que convidou
  const { data: claimed } = await supabase.rpc("claim_invites");
  if ((claimed ?? 0) > 0) redirect("/app");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (membership) redirect("/app");

  return <OnboardingForm />;
}
