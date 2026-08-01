import Link from "next/link";
import { AuthForm } from "../auth-form";
import { requestPasswordReset } from "../actions";

export default function RecuperarSenhaPage() {
  return (
    <AuthForm
      title="Recuperar senha"
      subtitle="Enviaremos um link para redefinir sua senha."
      fields={[{ name: "email", label: "E-mail", type: "email", autoComplete: "email" }]}
      submitLabel="Enviar link"
      action={requestPasswordReset}
      footer={
        <Link href="/login" className="text-brand-700 hover:underline">
          Voltar para o login
        </Link>
      }
    />
  );
}
