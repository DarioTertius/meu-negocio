import { AuthForm } from "../auth-form";
import { updatePassword } from "../actions";

export default function RedefinirSenhaPage() {
  return (
    <AuthForm
      title="Redefinir senha"
      subtitle="Escolha sua nova senha."
      fields={[{ name: "password", label: "Nova senha (mínimo 8 caracteres)", type: "password", autoComplete: "new-password" }]}
      submitLabel="Salvar nova senha"
      action={updatePassword}
    />
  );
}
