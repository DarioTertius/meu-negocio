import Link from "next/link";
import { AuthForm } from "../auth-form";
import { signIn } from "../actions";

export default function LoginPage() {
  return (
    <AuthForm
      title="Entrar"
      subtitle="Acesse o painel do seu negócio."
      fields={[
        { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
        { name: "password", label: "Senha", type: "password", autoComplete: "current-password" },
      ]}
      submitLabel="Entrar"
      action={signIn}
      footer={
        <>
          <Link href="/recuperar-senha" className="text-brand-700 hover:underline">
            Esqueci minha senha
          </Link>
          <span className="mx-2 text-slate-300">·</span>
          <Link href="/cadastro" className="text-brand-700 hover:underline">
            Criar conta grátis
          </Link>
        </>
      }
    />
  );
}
