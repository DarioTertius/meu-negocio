"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Input, Label } from "@/components/ui";
import { saveBranding } from "./actions";
import { DEFAULT_BRAND } from "@/lib/branding";

export function BrandingForm({
  orgId,
  currentColor,
  currentLogo,
}: {
  orgId: string;
  currentColor: string | null;
  currentLogo: string | null;
}) {
  const [color, setColor] = useState(currentColor ?? DEFAULT_BRAND);
  const [file, setFile] = useState<File | null>(null);
  const [logo, setLogo] = useState<string | null>(currentLogo);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(removeLogo = false) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      let logoUrl = removeLogo ? null : logo;

      if (!removeLogo && file) {
        if (file.size > 2 * 1024 * 1024) {
          setError("A imagem deve ter no máximo 2 MB.");
          return;
        }
        const supabase = createClient();
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const path = `${orgId}/logo-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("logos")
          .upload(path, file, { upsert: true, cacheControl: "3600" });
        if (upErr) {
          setError("Falha ao enviar a imagem: " + upErr.message);
          return;
        }
        logoUrl = supabase.storage.from("logos").getPublicUrl(path).data.publicUrl;
      }

      const result = await saveBranding({ brand_color: color, logo_url: logoUrl });
      if (result.error) {
        setError(result.error);
        return;
      }
      setLogo(logoUrl);
      setFile(null);
      if (removeLogo) setLogo(null);
      setSaved(true);
    });
  }

  return (
    <Card className="max-w-xl">
      <h2 className="font-semibold">Aparência</h2>
      <p className="mt-1 text-sm text-slate-500">
        Personalize o sistema com a cor e a logo da sua empresa. A mudança vale para
        todos os usuários da equipe.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="brand_color">Cor da marca</Label>
          <div className="flex items-center gap-3">
            <input
              id="brand_color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-32"
              maxLength={7}
            />
            <button
              type="button"
              onClick={() => setColor(DEFAULT_BRAND)}
              className="text-xs text-slate-500 hover:underline"
            >
              Restaurar padrão
            </button>
          </div>
        </div>

        <div>
          <Label htmlFor="logo">Logo (PNG/JPG, até 2 MB — fundo transparente fica melhor)</Label>
          {logo && !file && (
            <div className="mb-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="Logo atual" className="h-12 w-auto rounded border border-slate-200 bg-white p-1" />
              <button
                type="button"
                onClick={() => submit(true)}
                className="text-xs text-red-600 hover:underline"
                disabled={pending}
              >
                Remover logo
              </button>
            </div>
          )}
          <Input
            id="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="pt-1.5"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {saved && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Aparência salva. Recarregue a página para ver tudo com a nova cor.
          </p>
        )}

        <Button onClick={() => submit(false)} disabled={pending}>
          {pending ? "Salvando…" : "Salvar aparência"}
        </Button>
      </div>
    </Card>
  );
}
