"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIos(/iPhone|iPad|iPod/.test(ua));
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!promptEvent && !isIos) return null;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-brand-200 bg-brand-50">
      <div className="flex items-center gap-3">
        <Smartphone className="h-5 w-5 shrink-0 text-brand-700" />
        <div>
          <p className="text-sm font-medium">Instale o app no seu celular</p>
          <p className="text-xs text-slate-600">
            {isIos && !promptEvent
              ? "No Safari: toque em Compartilhar → \u201CAdicionar à Tela de Início\u201D."
              : "Ícone próprio, tela cheia e acesso em um toque — sem loja de aplicativos."}
          </p>
        </div>
      </div>
      {promptEvent && (
        <Button
          onClick={async () => {
            await promptEvent.prompt();
            setPromptEvent(null);
          }}
        >
          Instalar aplicativo
        </Button>
      )}
    </Card>
  );
}
