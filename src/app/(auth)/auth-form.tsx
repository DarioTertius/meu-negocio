"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button, Input, Label, Card } from "@/components/ui";
import Link from "next/link";

type AuthState = { error?: string; message?: string };
type Field = { name: string; label: string; type?: string; autoComplete?: string };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Aguarde…" : label}
    </Button>
  );
}

export function AuthForm({
  title,
  subtitle,
  fields,
  submitLabel,
  action,
  footer,
}: {
  title: string;
  subtitle?: string;
  fields: Field[];
  submitLabel: string;
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  footer?: React.ReactNode;
}) {
  const [state, formAction] = useFormState(action, {});
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center text-lg font-bold text-brand-800">
          Meu Negócio
        </Link>
        <Card>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          <form action={formAction} className="mt-5 space-y-4">
            {fields.map((f) => (
              <div key={f.name}>
                <Label htmlFor={f.name}>{f.label}</Label>
                <Input
                  id={f.name}
                  name={f.name}
                  type={f.type ?? "text"}
                  autoComplete={f.autoComplete}
                  required
                />
              </div>
            ))}
            {state.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}
            {state.message && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {state.message}
              </p>
            )}
            <Submit label={submitLabel} />
          </form>
        </Card>
        {footer && <div className="mt-4 text-center text-sm text-slate-600">{footer}</div>}
      </div>
    </main>
  );
}
