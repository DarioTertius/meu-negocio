"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type AuthState = { error?: string; message?: string };

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Informe e-mail e senha." };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou senha incorretos." };
  redirect("/app");
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = createClient();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!fullName || !email || !password) return { error: "Preencha todos os campos." };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) return { error: "Não foi possível criar a conta. " + error.message };

  // Se a confirmação de e-mail estiver ativa no Supabase, ainda não há sessão.
  if (!data.session) {
    return { message: "Conta criada. Confirme seu e-mail para entrar." };
  }
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = createClient();
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe seu e-mail." };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/redefinir-senha`,
  });
  return { message: "Se o e-mail existir, enviamos um link de redefinição." };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = createClient();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Não foi possível redefinir a senha. Abra o link do e-mail novamente." };
  redirect("/app");
}
