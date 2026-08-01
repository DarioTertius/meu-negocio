import Link from "next/link";
import { AuthForm } from "../auth-form";
import { signUp } from "../actions";

export default function CadastroPage() {
  return (
    <AuthForm
      title="Criar conta"
      subtitle="Grátis para começar. Sem cartão de crédito."
      fields={[
        { name: "full_name", label: "Seu nome", autoComplete: "name" },
        { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
        { name: "password", label: "Senha (mínimo 8 caracteres)", type: "password", autoComplete: "new-password" },
      ]}
      submitLabel="Criar conta"
      action={signUp}
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="text-brand-700 hover:underline">
            Entrar
          </Link>
        </>
      }
    />
  );
}
